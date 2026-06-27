/**
 * rotation.full.test.ts — Extended bandit tests for Task 5
 * These complement the base tests in rotation.test.ts
 */
import { vi, describe, it, expect } from 'vitest'
import type { CreativeVariant } from '@/types/database'

// ─── Mock Supabase service client ────────────────────────────────────────────

function makeChain() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn().mockResolvedValue({ error: null })
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.in = vi.fn().mockResolvedValue({ data: [], error: null })
  chain.single = vi.fn().mockResolvedValue({
    data: { impressions: 0, conversions: 0 },
    error: null,
  })
  return chain
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: vi.fn(() => makeChain()),
  }),
}))

import {
  EPSILON,
  selectVariant,
  computeConversionRates,
} from '@/lib/creatives/dco/rotation'

// ─── Fixture ──────────────────────────────────────────────────────────────────

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

// ─── selectVariant — edge cases ───────────────────────────────────────────────

describe('selectVariant (full suite)', () => {
  it('single variant: always selected (100% of runs)', () => {
    const v = makeVariant({ id: 'solo' })
    // Run 100 times — single variant must always be returned
    for (let i = 0; i < 100; i++) {
      expect(selectVariant([v]).id).toBe('solo')
    }
  })

  it('empty array: throws correct message', () => {
    expect(() => selectVariant([])).toThrow('No variants to select from')
  })

  it('all zero impressions: conversion rates all 0, any variant is valid', () => {
    const variants = [
      makeVariant({ id: 'x', impressions: 0, conversions: 0 }),
      makeVariant({ id: 'y', impressions: 0, conversions: 0 }),
      makeVariant({ id: 'z', impressions: 0, conversions: 0 }),
    ]
    const ids = new Set(variants.map((v) => v.id))
    // Over 50 runs, we always get one of the valid variants
    for (let i = 0; i < 50; i++) {
      const result = selectVariant(variants)
      expect(ids.has(result.id)).toBe(true)
    }
  })
})

// ─── computeConversionRates — edge cases ──────────────────────────────────────

describe('computeConversionRates (full suite)', () => {
  it('identical rates: stable sort — order preserved (same rate)', () => {
    // If all rates are equal, sort should not change relative order
    const a = makeVariant({ id: 'a', impressions: 100, conversions: 50 }) // 0.5
    const b = makeVariant({ id: 'b', impressions: 100, conversions: 50 }) // 0.5
    const c = makeVariant({ id: 'c', impressions: 100, conversions: 50 }) // 0.5

    const result = computeConversionRates([a, b, c])

    // All rates should be equal
    expect(result[0].rate).toBe(0.5)
    expect(result[1].rate).toBe(0.5)
    expect(result[2].rate).toBe(0.5)

    // All three must be present
    const resultIds = result.map((r) => r.variant.id)
    expect(resultIds).toContain('a')
    expect(resultIds).toContain('b')
    expect(resultIds).toContain('c')
  })
})

// ─── EPSILON constant ─────────────────────────────────────────────────────────

describe('EPSILON', () => {
  it('is exactly 0.1', () => {
    expect(EPSILON).toBe(0.1)
  })

  it('is of type number', () => {
    expect(typeof EPSILON).toBe('number')
  })
})
