import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { initDomainVerification, completeDomainVerification } from '@/lib/whitelabel/domains'

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId: string
    action: 'init' | 'complete'
    domain?: string
  }

  const { workspaceId, action, domain } = body

  if (!workspaceId || !action) {
    return NextResponse.json({ error: 'workspaceId e action são obrigatórios' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin'].includes((member as { role: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'init') {
    if (!domain) {
      return NextResponse.json({ error: 'domain é obrigatório para init' }, { status: 400 })
    }
    try {
      const token = await initDomainVerification(workspaceId, domain)
      return NextResponse.json({ token })
    } catch {
      return NextResponse.json({ error: 'Falha ao iniciar verificação' }, { status: 500 })
    }
  }

  if (action === 'complete') {
    const result = await completeDomainVerification(workspaceId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action inválido' }, { status: 400 })
}
