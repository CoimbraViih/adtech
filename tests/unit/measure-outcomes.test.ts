import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { computeOutcomeD7 } from '@/lib/ai/measure-outcomes'

describe('computeOutcomeD7', () => {
  it('calcula delta de ROAS entre before e after', () => {
    const outcome = computeOutcomeD7(
      { roas: 2.0, spend: 1000, conversions: 20 },
      { roas: 3.0, spend: 1100, conversions: 33 },
    )
    expect(outcome.roas_delta).toBeCloseTo(1.0, 2)
    expect(outcome.roas_pct_change).toBeCloseTo(50, 1)
    expect(outcome.outcome).toBe('improved')
  })

  it('marca como degraded quando ROAS caiu mais de 10%', () => {
    const outcome = computeOutcomeD7(
      { roas: 3.0, spend: 1000, conversions: 30 },
      { roas: 2.5, spend: 900, conversions: 22 },
    )
    expect(outcome.outcome).toBe('degraded')
  })

  it('marca como neutral quando variação < 10%', () => {
    const outcome = computeOutcomeD7(
      { roas: 2.0, spend: 1000, conversions: 20 },
      { roas: 2.05, spend: 1000, conversions: 20 },
    )
    expect(outcome.outcome).toBe('neutral')
  })
})
