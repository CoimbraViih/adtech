import { describe, it, expect } from 'vitest'
import { applyMarkup } from '@/lib/stripe/reseller'

describe('applyMarkup', () => {
  it('applies 30% markup to base amount', () => {
    expect(applyMarkup(10000, 30)).toBe(13000)
  })

  it('returns base amount unchanged when markup is 0', () => {
    expect(applyMarkup(10000, 0)).toBe(10000)
  })

  it('doubles the amount for 100% markup', () => {
    expect(applyMarkup(5000, 100)).toBe(10000)
  })

  it('rounds to nearest cent', () => {
    // 10001 * 1.1 = 11001.1 → rounds to 11001
    expect(applyMarkup(10001, 10)).toBe(11001)
  })

  it('throws when markupPercent exceeds 500', () => {
    expect(() => applyMarkup(1000, 501)).toThrow('markupPercent must be between 0 and 500')
  })

  it('throws when markupPercent is negative', () => {
    expect(() => applyMarkup(1000, -1)).toThrow('markupPercent must be between 0 and 500')
  })
})
