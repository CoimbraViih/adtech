import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { OptimizationGuardrail, OptimizationActionType } from '@/types/database'

export type GuardrailCheckInput = {
  campaignExternalId: string
  actionType: OptimizationActionType
  budgetChangePct?: number
  todayActionCount: number
}

export type GuardrailResult = {
  allowed: boolean
  violations: string[]
}

const DEFAULT_GUARDRAILS: Omit<OptimizationGuardrail, 'id' | 'workspace_id' | 'created_at' | 'updated_at'> = {
  kill_switch: false,
  max_budget_change_pct: 20,
  max_daily_actions: 5,
  blacklisted_campaign_ids: [],
  autonomous_mode: false,
}

export async function getGuardrails(workspaceId: string): Promise<OptimizationGuardrail> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('optimization_guardrails')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (!data) {
    return {
      ...DEFAULT_GUARDRAILS,
      id: '',
      workspace_id: workspaceId,
      created_at: '',
      updated_at: '',
    }
  }
  return data as OptimizationGuardrail
}

export function checkGuardrails(
  guardrail: OptimizationGuardrail,
  input: GuardrailCheckInput,
): GuardrailResult {
  const violations: string[] = []

  if (guardrail.kill_switch) {
    violations.push('kill_switch ativo')
  }

  if (guardrail.blacklisted_campaign_ids.includes(input.campaignExternalId)) {
    violations.push('campanha na blacklist')
  }

  if (
    (input.actionType === 'budget_increase' || input.actionType === 'budget_decrease') &&
    input.budgetChangePct !== undefined &&
    input.budgetChangePct > guardrail.max_budget_change_pct
  ) {
    violations.push(
      `variação de budget excede limite (${input.budgetChangePct.toFixed(2)}% > ${guardrail.max_budget_change_pct.toFixed(2)}%)`,
    )
  }

  if (input.todayActionCount >= guardrail.max_daily_actions) {
    violations.push(`limite diário de ações atingido (${input.todayActionCount}/${guardrail.max_daily_actions})`)
  }

  return { allowed: violations.length === 0, violations }
}
