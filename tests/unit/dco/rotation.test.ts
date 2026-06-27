import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { CreativeVariant } from '@/types/database'

// ─── Mock Supabase service client ────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockSingle = vi.fn().mockResolvedValue({ data: { impressions: 5, conversions: 2 }, error: null })
const mockUpdate = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockResolvedValue({ data: [], error: null })
const mockInsertFn = vi.fn().mockResolvedValue({ error: null })

// Chain builder: each `from()` call returns a fresh chain
function makeChain() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn().mockResolvedValue({ error: null })
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.in = vi.fn().mockResolvedValue({ data: [], error: null })
  chain.single = vi.fn().mockResolvedValue({ data: { impressions: 5, conversions: 2 }, error: null })
  return chain
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: vi.fn(() => makeChain()),
  }),
}))

// Import after mock is set up
import {
  EPSILON,
  selectVariant,
  computeConversionRates,
  recordImpression,
  recordConversion,
  refreshBanditState,
} from '@/lib/creatives/dco/rotation'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeVariant(overrides: Partial<CreativeVariant> = {}): CreativeVariant {
  return {
    id: 'variant-1',
    organization_id: 'org-1',
    template_id: 'tmpl-1',
    product_id: null,
    resolved_body: { headline: 'Test' },
    impressions: 0,
    conversions: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── selectVariant ─────────────────────────────────────────────────────────────

describe('selectVariant', () => {
  it('throws on empty variants array', () => {
    expect(() => selectVariant([])).toThrow('No variants to select from')
  })

  it('returns the only variant when array has one element', () => {
    const v = makeVariant({ id: 'only' })
    const result = selectVariant([v])
    expect(result.id).toBe('only')
  })

  it('with all zero rates — returns a variant from the array', () => {
    const variants = [
      makeVariant({ id: 'a', impressions: 0, conversions: 0 }),
      makeVariant({ id: 'b', impressions: 0, conversions: 0 }),
      makeVariant({ id: 'c', impressions: 0, conversions: 0 }),
    ]
    const result = selectVariant(variants)
    const ids = variants.map((v) => v.id)
    expect(ids).toContain(result.id)
  })

  it('with clear winner — exploits winner >85% of 1000 runs', () => {
    const winner = makeVariant({ id: 'winner', impressions: 1000, conversions: 900 }) // rate = 0.9
    const loser = makeVariant({ id: 'loser', impressions: 1000, conversions: 10 })  // rate = 0.01
    const variants = [winner, loser]

    let winnerCount = 0
    for (let i = 0; i < 1000; i++) {
      if (selectVariant(variants).id === 'winner') winnerCount++
    }

    // With 10% explore, winner should be picked ~90% + some explore share
    // Minimum expected: ~85% (allowing for statistical variance)
    expect(winnerCount).toBeGreaterThan(850)
  })

  it('exploration rate ≈ EPSILON (10%) over 1000 runs with a dominant winner', () => {
    // With a clear winner, the "loser" can only be selected during exploration
    // So loser selections ≈ EPSILON × (1/numVariants) × N
    // Over 1000 runs with 2 variants: loser selected ≈ 0.1 × 0.5 × 1000 = 50
    const winner = makeVariant({ id: 'winner', impressions: 1000, conversions: 1000 }) // rate = 1.0
    const loser  = makeVariant({ id: 'loser',  impressions: 1000, conversions: 0 })   // rate = 0.0
    const variants = [winner, loser]

    let loserCount = 0
    const N = 10_000
    for (let i = 0; i < N; i++) {
      if (selectVariant(variants).id === 'loser') loserCount++
    }

    // Loser is only picked during explore (EPSILON=0.1) with 50/50 random chance
    // Expected: ~500 (0.1 * 0.5 * 10000). Allow wide tolerance due to randomness.
    const explorationRate = loserCount / N
    // Should be around EPSILON/2 (= 0.05), confirm it's reasonably close (1.5% to 8.5%)
    expect(explorationRate).toBeGreaterThan(0.015)
    expect(explorationRate).toBeLessThan(0.085)
  })
})

// ─── computeConversionRates ────────────────────────────────────────────────────

describe('computeConversionRates', () => {
  it('returns empty array for empty input', () => {
    expect(computeConversionRates([])).toEqual([])
  })

  it('handles 0 impressions gracefully — rate = 0', () => {
    const v = makeVariant({ impressions: 0, conversions: 0 })
    const result = computeConversionRates([v])
    expect(result).toHaveLength(1)
    expect(result[0].rate).toBe(0)
  })

  it('computes rate as conversions / impressions', () => {
    const v = makeVariant({ impressions: 100, conversions: 10 })
    const result = computeConversionRates([v])
    expect(result[0].rate).toBeCloseTo(0.1)
  })

  it('sorts descending by conversion rate', () => {
    const low    = makeVariant({ id: 'low',    impressions: 100, conversions: 1  }) // 0.01
    const mid    = makeVariant({ id: 'mid',    impressions: 100, conversions: 50 }) // 0.50
    const high   = makeVariant({ id: 'high',   impressions: 100, conversions: 90 }) // 0.90
    const result = computeConversionRates([low, mid, high])

    expect(result[0].variant.id).toBe('high')
    expect(result[1].variant.id).toBe('mid')
    expect(result[2].variant.id).toBe('low')
    expect(result[0].rate).toBeGreaterThan(result[1].rate)
    expect(result[1].rate).toBeGreaterThan(result[2].rate)
  })

  it('returns the original variant objects (not copies)', () => {
    const v = makeVariant({ id: 'original' })
    const result = computeConversionRates([v])
    expect(result[0].variant).toBe(v)
  })
})

// ─── recordImpression / recordConversion ──────────────────────────────────────

describe('recordImpression', () => {
  it('resolves without throwing for a valid variantId', async () => {
    await expect(recordImpression('variant-abc')).resolves.toBeUndefined()
  })
})

describe('recordConversion', () => {
  it('resolves without throwing for a valid variantId', async () => {
    await expect(recordConversion('variant-abc')).resolves.toBeUndefined()
  })

  it('resolves without throwing when value is provided', async () => {
    await expect(recordConversion('variant-abc', 99.9)).resolves.toBeUndefined()
  })
})

// ─── refreshBanditState ────────────────────────────────────────────────────────

describe('refreshBanditState', () => {
  it('resolves without throwing for a valid templateId', async () => {
    await expect(refreshBanditState('tmpl-1')).resolves.toBeUndefined()
  })
})
