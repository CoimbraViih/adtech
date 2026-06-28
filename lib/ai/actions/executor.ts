import { createServerSupabaseClient } from '@/lib/supabase/server'
import { updateMetaCampaign } from '@/lib/meta/client'
import { updateGoogleCampaign } from '@/lib/google/client'
import { updateTikTokCampaign } from '@/lib/tiktok/client'
import { updateLinkedInCampaign } from '@/lib/linkedin/client'
import { getGuardrails, checkGuardrails } from '@/lib/ai/actions/guardrails'
import type {
  OptimizationAction,
  OptimizationActionType,
  OptimizationActionStatus,
  CampaignStatus,
} from '@/types/database'

type PlatformUpdate = { status?: CampaignStatus; dailyBudget?: number }
type PlatformUpdater = (orgId: string, externalId: string, update: PlatformUpdate) => Promise<void>

export function buildPlatformUpdate(platform: string): PlatformUpdater {
  switch (platform.toLowerCase()) {
    case 'meta':
      return updateMetaCampaign
    case 'google':
      return updateGoogleCampaign
    case 'tiktok':
      return updateTikTokCampaign
    case 'linkedin':
      return updateLinkedInCampaign
    default:
      throw new Error(`Plataforma não suportada pelo executor: ${platform}`)
  }
}

export function mapActionToUpdate(
  actionType: OptimizationActionType,
  budgetAfter: number | null,
): PlatformUpdate {
  switch (actionType) {
    case 'pause':
      return { status: 'paused' }
    case 'resume':
      return { status: 'active' }
    case 'budget_increase':
    case 'budget_decrease':
      return { dailyBudget: budgetAfter ?? undefined }
  }
}

export type ProposeActionInput = {
  workspaceId: string
  organizationId: string
  campaignId: string | null
  campaignExternalId: string
  platform: string
  actionType: OptimizationActionType
  rationale: string
  mode: 'suggest' | 'autonomous'
  beforeSnapshot: Record<string, unknown>
  budgetBefore: number | null
  budgetAfter: number | null
}

export async function proposeAction(input: ProposeActionInput): Promise<OptimizationAction> {
  const supabase = await createServerSupabaseClient()

  const guardrail = await getGuardrails(input.workspaceId)
  const budgetChangePct =
    input.budgetBefore && input.budgetAfter
      ? Math.abs((input.budgetAfter - input.budgetBefore) / input.budgetBefore) * 100
      : undefined

  // Count today's actions for daily limit check
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('optimization_actions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', input.workspaceId)
    .gte('created_at', `${today}T00:00:00Z`)

  const guardCheck = checkGuardrails(guardrail, {
    campaignExternalId: input.campaignExternalId,
    actionType: input.actionType,
    budgetChangePct,
    todayActionCount: count ?? 0,
  })

  const row = {
    workspace_id: input.workspaceId,
    campaign_id: input.campaignId,
    campaign_external_id: input.campaignExternalId,
    platform: input.platform,
    action_type: input.actionType,
    status: 'suggested' as OptimizationActionStatus,
    mode: input.mode,
    rationale: input.rationale,
    before_snapshot: input.beforeSnapshot,
    guardrail_checks: {
      allowed: guardCheck.allowed,
      violations: guardCheck.violations,
    },
    budget_before: input.budgetBefore,
    budget_after: input.budgetAfter,
  }

  const { data, error } = await supabase
    .from('optimization_actions')
    .insert(row)
    .select()
    .single()

  if (error) throw new Error(`proposeAction: ${error.message}`)
  return data as OptimizationAction
}

export async function executeAction(
  actionId: string,
  organizationId: string,
  approvedBy?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: action, error: fetchErr } = await supabase
    .from('optimization_actions')
    .select('*')
    .eq('id', actionId)
    .single()

  if (fetchErr || !action) {
    return { success: false, error: 'Ação não encontrada' }
  }

  const typedAction = action as OptimizationAction

  // Re-check guardrails at execution time
  const guardrail = await getGuardrails(typedAction.workspace_id)
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('optimization_actions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', typedAction.workspace_id)
    .eq('status', 'executed')
    .gte('executed_at', `${today}T00:00:00Z`)

  const guardCheck = checkGuardrails(guardrail, {
    campaignExternalId: typedAction.campaign_external_id,
    actionType: typedAction.action_type,
    todayActionCount: count ?? 0,
  })

  if (!guardCheck.allowed) {
    await supabase
      .from('optimization_actions')
      .update({
        status: 'failed',
        error_message: `Guardrail violations: ${guardCheck.violations.join('; ')}`,
      })
      .eq('id', actionId)
    return { success: false, error: guardCheck.violations.join('; ') }
  }

  try {
    const updater = buildPlatformUpdate(typedAction.platform)
    const update = mapActionToUpdate(typedAction.action_type, typedAction.budget_after)
    await updater(organizationId, typedAction.campaign_external_id, update)

    await supabase
      .from('optimization_actions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        approved_by: approvedBy ?? null,
        after_snapshot: { executed: true, update },
      })
      .eq('id', actionId)

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('optimization_actions')
      .update({ status: 'failed', error_message: msg })
      .eq('id', actionId)
    console.error('[executeAction] platform error:', msg)
    return { success: false, error: msg }
  }
}
