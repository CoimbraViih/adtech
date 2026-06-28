import { describe, it, expect } from 'vitest'
import { checkGuardrails } from '@/lib/ai/actions/guardrails'
import type { OptimizationGuardrail } from '@/types/database'

const base: OptimizationGuardrail = {
  id: 'g1',
  workspace_id: 'ws1',
  kill_switch: false,
  max_budget_change_pct: 20,
  max_daily_actions: 5,
  blacklisted_campaign_ids: [],
  autonomous_mode: false,
  created_at: '',
  updated_at: '',
}

describe('checkGuardrails', () => {
  it('permite ação dentro dos limites', () => {
    const result = checkGuardrails(base, {
      campaignExternalId: 'c1',
      actionType: 'budget_increase',
      budgetChangePct: 10,
      todayActionCount: 2,
    })
    expect(result.allowed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('bloqueia quando kill_switch está ativo', () => {
    const result = checkGuardrails(
      { ...base, kill_switch: true },
      { campaignExternalId: 'c1', actionType: 'pause', todayActionCount: 0 },
    )
    expect(result.allowed).toBe(false)
    expect(result.violations).toContain('kill_switch ativo')
  })

  it('bloqueia campanha na blacklist', () => {
    const result = checkGuardrails(
      { ...base, blacklisted_campaign_ids: ['c99'] },
      { campaignExternalId: 'c99', actionType: 'pause', todayActionCount: 0 },
    )
    expect(result.allowed).toBe(false)
    expect(result.violations).toContain('campanha na blacklist')
  })

  it('bloqueia quando mudança de budget excede max_budget_change_pct', () => {
    const result = checkGuardrails(base, {
      campaignExternalId: 'c1',
      actionType: 'budget_increase',
      budgetChangePct: 25,
      todayActionCount: 0,
    })
    expect(result.allowed).toBe(false)
    expect(result.violations).toContain('variação de budget excede limite (25.00% > 20.00%)')
  })

  it('bloqueia quando max_daily_actions é atingido', () => {
    const result = checkGuardrails(base, {
      campaignExternalId: 'c1',
      actionType: 'pause',
      todayActionCount: 5,
    })
    expect(result.allowed).toBe(false)
    expect(result.violations).toContain('limite diário de ações atingido (5/5)')
  })

  it('acumula múltiplas violações', () => {
    const result = checkGuardrails(
      { ...base, kill_switch: true, blacklisted_campaign_ids: ['c1'] },
      { campaignExternalId: 'c1', actionType: 'pause', todayActionCount: 10 },
    )
    expect(result.allowed).toBe(false)
    expect(result.violations.length).toBeGreaterThanOrEqual(2)
  })
})
