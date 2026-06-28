// tests/unit/predict-engine.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({ data: [], error: null })),
          neq: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
    })),
  })),
}))
vi.mock('@/lib/ai/diagnostics/context', () => ({
  buildCampaignContexts: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/ai/actions/executor', () => ({
  proposeAction: vi.fn().mockResolvedValue({ id: 'a1' }),
}))

import { generateRationale } from '@/lib/ai/predict/engine'

describe('generateRationale', () => {
  it('gera rationale para overpace', () => {
    const r = generateRationale('overpace', { avgDailyBurn: 150, dailyBudget: 100, pacingRatio: 1.5 })
    expect(r).toContain('overpace')
    expect(r).toContain('150')
  })

  it('gera rationale para underpace', () => {
    const r = generateRationale('underpace', { avgDailyBurn: 60, dailyBudget: 100, pacingRatio: 0.6 })
    expect(r).toContain('underpace')
  })

  it('gera rationale para roas_decline', () => {
    const r = generateRationale('roas_decline', { forecastRoas: 1.2, trend: 'down' })
    expect(r).toContain('ROAS')
    expect(r).toContain('1.2')
  })
})
