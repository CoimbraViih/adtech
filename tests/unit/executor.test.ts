import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('@/lib/meta/client', () => ({
  updateMetaCampaign: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/google/client', () => ({
  updateGoogleCampaign: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/tiktok/client', () => ({
  updateTikTokCampaign: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/linkedin/client', () => ({
  updateLinkedInCampaign: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/ai/actions/guardrails', () => ({
  getGuardrails: vi.fn(),
  checkGuardrails: vi.fn(),
}))

import { buildPlatformUpdate, mapActionToUpdate } from '@/lib/ai/actions/executor'
import type { OptimizationActionType } from '@/types/database'

describe('mapActionToUpdate', () => {
  it('mapeia pause para status=paused', () => {
    const update = mapActionToUpdate('pause', null)
    expect(update).toEqual({ status: 'paused' })
  })

  it('mapeia resume para status=active', () => {
    const update = mapActionToUpdate('resume', null)
    expect(update).toEqual({ status: 'active' })
  })

  it('mapeia budget_increase com valor', () => {
    const update = mapActionToUpdate('budget_increase', 1200)
    expect(update).toEqual({ dailyBudget: 1200 })
  })

  it('mapeia budget_decrease com valor', () => {
    const update = mapActionToUpdate('budget_decrease', 800)
    expect(update).toEqual({ dailyBudget: 800 })
  })
})

describe('buildPlatformUpdate', () => {
  it('lança erro para platform desconhecida', () => {
    expect(() => buildPlatformUpdate('unknown_platform')).toThrow()
  })

  it('retorna função para meta', () => {
    const fn = buildPlatformUpdate('meta')
    expect(typeof fn).toBe('function')
  })

  it('retorna função para google', () => {
    const fn = buildPlatformUpdate('google')
    expect(typeof fn).toBe('function')
  })

  it('retorna função para tiktok', () => {
    const fn = buildPlatformUpdate('tiktok')
    expect(typeof fn).toBe('function')
  })

  it('retorna função para linkedin', () => {
    const fn = buildPlatformUpdate('linkedin')
    expect(typeof fn).toBe('function')
  })
})
