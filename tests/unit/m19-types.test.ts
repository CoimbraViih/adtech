import { describe, it, expectTypeOf } from 'vitest'
import type {
  OptimizationAction,
  OptimizationGuardrail,
  OptimizationActionType,
  OptimizationActionStatus,
} from '@/types/database'

describe('M19 types', () => {
  it('OptimizationActionType é union correta', () => {
    const t: OptimizationActionType = 'pause'
    expectTypeOf(t).toEqualTypeOf<'pause' | 'resume' | 'budget_increase' | 'budget_decrease'>()
  })

  it('OptimizationActionStatus é union correta', () => {
    const s: OptimizationActionStatus = 'suggested'
    expectTypeOf(s).toEqualTypeOf<
      'suggested' | 'approved' | 'rejected' | 'executed' | 'failed' | 'outcome_measured'
    >()
  })

  it('OptimizationAction tem campos obrigatórios', () => {
    expectTypeOf<OptimizationAction>().toHaveProperty('id')
    expectTypeOf<OptimizationAction>().toHaveProperty('workspace_id')
    expectTypeOf<OptimizationAction>().toHaveProperty('action_type')
    expectTypeOf<OptimizationAction>().toHaveProperty('status')
    expectTypeOf<OptimizationAction>().toHaveProperty('before_snapshot')
    expectTypeOf<OptimizationAction>().toHaveProperty('guardrail_checks')
  })

  it('OptimizationGuardrail tem kill_switch', () => {
    expectTypeOf<OptimizationGuardrail>().toHaveProperty('kill_switch')
    expectTypeOf<OptimizationGuardrail>().toHaveProperty('max_budget_change_pct')
    expectTypeOf<OptimizationGuardrail>().toHaveProperty('autonomous_mode')
  })
})
