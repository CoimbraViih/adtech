import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const VALID_STEPS = [
  'connect_integration',
  'create_campaign',
  'install_pixel',
  'create_creative',
  'configure_automation',
] as const

export async function GET(): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data, error: dbError } = await supabase
    .from('onboarding_progress')
    .select('step, completed_at')
    .eq('user_id', user.id)

  if (dbError) {
    console.error('[assistant/onboarding] GET error:', dbError)
    return Response.json({ error: 'Erro ao buscar progresso' }, { status: 500 })
  }

  return Response.json({ steps: data ?? [] })
}

type OnboardingBody = {
  step: string
  orgId: string
}

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: OnboardingBody
  try {
    body = await req.json() as OnboardingBody
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.step || !body.orgId) {
    return Response.json({ error: 'step e orgId são obrigatórios' }, { status: 400 })
  }

  if (!(VALID_STEPS as readonly string[]).includes(body.step)) {
    return Response.json({ error: 'Step inválido' }, { status: 400 })
  }

  // Verify the user belongs to this org
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', body.orgId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error: dbError } = await supabase
    .from('onboarding_progress')
    .upsert(
      { organization_id: body.orgId, user_id: user.id, step: body.step },
      { onConflict: 'organization_id,user_id,step' }
    )

  if (dbError) {
    console.error('[assistant/onboarding] POST error:', dbError)
    return Response.json({ error: 'Erro ao salvar progresso' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
