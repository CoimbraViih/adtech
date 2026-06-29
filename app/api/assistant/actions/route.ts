import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildPlatformUpdate, mapActionToUpdate } from '@/lib/ai/actions/executor'
import type { OptimizationActionType } from '@/types/database'

type ActionBody = {
  actionType: 'pause_campaign' | 'resume_campaign'
  payload: { campaignId: string }
  orgId: string
  workspaceId: string
  sessionId?: string
}

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: ActionBody
  try {
    body = await req.json() as ActionBody
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.actionType || !body.payload?.campaignId || !body.orgId || !body.workspaceId) {
    return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  // Verify membership — only owner/admin/member can execute actions
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', body.orgId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'member'].includes(member.role as string)) {
    return Response.json({ error: 'Sem permissão para executar ações' }, { status: 403 })
  }

  // Create audit log entry
  const { data: logEntry, error: logError } = await supabase
    .from('assistant_action_log')
    .insert({
      organization_id: body.orgId,
      workspace_id: body.workspaceId,
      user_id: user.id,
      session_id: body.sessionId ?? null,
      action_type: body.actionType,
      action_payload: body.payload,
      status: 'approved',
    })
    .select('id')
    .single()

  if (logError || !logEntry) {
    console.error('[assistant/actions] log insert error:', logError)
    return Response.json({ error: 'Erro ao registrar ação' }, { status: 500 })
  }

  try {
    // Fetch campaign to get platform + external_id
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('platform, external_id')
      .eq('id', body.payload.campaignId)
      .eq('workspace_id', body.workspaceId)
      .eq('organization_id', body.orgId)
      .single()

    if (campError || !campaign) {
      throw new Error('Campanha não encontrada')
    }

    const optimizationType: OptimizationActionType =
      body.actionType === 'pause_campaign' ? 'pause' : 'resume'

    const update = mapActionToUpdate(optimizationType, null)
    const updater = buildPlatformUpdate(campaign.platform as string)
    await updater(body.orgId, campaign.external_id as string, update)

    await supabase
      .from('assistant_action_log')
      .update({ status: 'executed', executed_at: new Date().toISOString() })
      .eq('id', logEntry.id)

    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao executar ação'
    console.error('[assistant/actions] execution error:', err)

    await supabase
      .from('assistant_action_log')
      .update({ status: 'failed', error_message: msg })
      .eq('id', logEntry.id)

    return Response.json({ error: 'Erro ao executar ação' }, { status: 500 })
  }
}
