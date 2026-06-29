import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { runAssistantStream } from '@/lib/ai/assistant/agent'
import type { AssistantMessage, ScreenContext } from '@/lib/ai/assistant/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: { messages: AssistantMessage[]; context: ScreenContext; orgId: string }
  try {
    body = await req.json() as { messages: AssistantMessage[]; context: ScreenContext; orgId: string }
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.orgId || !body.context?.workspaceId) {
    return Response.json({ error: 'orgId e context.workspaceId são obrigatórios' }, { status: 400 })
  }

  // Verify user belongs to this org
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', body.orgId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verify workspaceId belongs to this org (prevents cross-tenant data leak)
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', body.context.workspaceId)
    .eq('organization_id', body.orgId)
    .single()

  if (!workspace) {
    return Response.json({ error: 'Workspace inválido' }, { status: 403 })
  }

  try {
    const stream = await runAssistantStream({
      orgId: body.orgId,
      messages: body.messages,
      context: { ...body.context, organizationId: body.orgId },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[assistant] stream error:', err)
    return Response.json({ error: 'Erro interno ao processar requisição' }, { status: 500 })
  }
}
