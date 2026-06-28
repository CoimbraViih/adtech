import { describe, it, expect } from 'vitest'
import { forecastRoas } from '@/lib/ai/predict/roas'

describe('forecastRoas', () => {
  it('retorna forecastRoas como média ponderada dos últimos 7 dias', () => {
    const series = [
      { date: '2026-07-01', roas: 1.0, conversions: 10, spend: 1000 },
      { date: '2026-07-02', roas: 2.0, conversions: 20, spend: 1000 },
      { date: '2026-07-03', roas: 3.0, conversions: 30, spend: 1000 },
      { date: '2026-07-04', roas: 4.0, conversions: 40, spend: 1000 },
      { date: '2026-07-05', roas: 5.0, conversions: 50, spend: 1000 },
      { date: '2026-07-06', roas: 6.0, conversions: 60, spend: 1000 },
      { date: '2026-07-07', roas: 7.0, conversions: 70, spend: 1000 },
    ]
    const result = forecastRoas(series)
    // dias mais recentes têm peso maior — resultado > 4.0 (média simples)
    expect(result.forecastRoas).toBeGreaterThan(4.0)
    expect(result.trend).toBe('up')
    expect(result.dataPoints).toBe(7)
  })

  it('detecta tendência de queda', () => {
    const series = [
      { date: '2026-07-01', roas: 8.0, conversions: 80, spend: 1000 },
      { date: '2026-07-02', roas: 6.0, conversions: 60, spend: 1000 },
      { date: '2026-07-03', roas: 4.0, conversions: 40, spend: 1000 },
      { date: '2026-07-04', roas: 2.0, conversions: 20, spend: 1000 },
    ]
    const result = forecastRoas(series)
    expect(result.trend).toBe('down')
  })

  it('retorna flat quando variação < 10%', () => {
    const series = [
      { date: '2026-07-01', roas: 2.0, conversions: 20, spend: 1000 },
      { date: '2026-07-02', roas: 2.05, conversions: 21, spend: 1000 },
      { date: '2026-07-03', roas: 1.98, conversions: 20, spend: 1000 },
    ]
    const result = forecastRoas(series)
    expect(result.trend).toBe('flat')
  })

  it('retorna forecastRoas 0 e confidenceScore 0 quando série vazia', () => {
    const result = forecastRoas([])
    expect(result.forecastRoas).toBe(0)
    expect(result.confidenceScore).toBe(0)
    expect(result.trend).toBe('flat')
  })

  it('ignora linhas com roas null', () => {
    const series = [
      { date: '2026-07-01', roas: null, conversions: 0, spend: 0 },
      { date: '2026-07-02', roas: 3.0, conversions: 30, spend: 1000 },
    ]
    const result = forecastRoas(series)
    expect(result.dataPoints).toBe(1)
    expect(result.forecastRoas).toBeCloseTo(3.0, 2)
  })
})
