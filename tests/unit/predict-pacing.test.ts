import { describe, it, expect } from 'vitest'
import { forecastPacing } from '@/lib/ai/predict/pacing'

const today = '2026-07-15'

describe('forecastPacing', () => {
  it('retorna on_track quando burn rate ≈ budget', () => {
    const series = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      spend: 100,
    }))
    const result = forecastPacing(series, { dailyBudget: 100 }, today)
    expect(result.status).toBe('on_track')
    expect(result.suggestedDailyBudget).toBeNull()
  })

  it('retorna overpace quando burn rate > 120% do budget', () => {
    const series = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      spend: 150,
    }))
    const result = forecastPacing(series, { dailyBudget: 100 }, today)
    expect(result.status).toBe('overpace')
    expect(result.suggestedDailyBudget).not.toBeNull()
    expect(result.suggestedDailyBudget!).toBeLessThan(100)
  })

  it('retorna underpace quando burn rate < 80% do budget', () => {
    const series = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      spend: 60,
    }))
    const result = forecastPacing(series, { dailyBudget: 100 }, today)
    expect(result.status).toBe('underpace')
    expect(result.suggestedDailyBudget).not.toBeNull()
    expect(result.suggestedDailyBudget!).toBeGreaterThan(100)
  })

  it('retorna null para suggestedDailyBudget quando série vazia', () => {
    const result = forecastPacing([], { dailyBudget: 100 }, today)
    expect(result.status).toBe('on_track')
    expect(result.avgDailyBurn).toBe(0)
  })

  it('pacingRatio = avgDailyBurn / dailyBudget', () => {
    const series = [{ date: '2026-07-01', spend: 200 }]
    const result = forecastPacing(series, { dailyBudget: 100 }, today)
    expect(result.pacingRatio).toBeCloseTo(2.0, 2)
  })
})
