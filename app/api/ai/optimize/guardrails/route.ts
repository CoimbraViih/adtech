import { NextResponse } from 'next/server'
import { requireServerSession, createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const GuardrailSchema = z.object({
  kill_switch: z.boolean(),
  max_budget_change_pct: z.number().min(1).max(100),
  max_daily_actions: z.number().int().min(1).max(50),
  blacklisted_campaign_ids: z.array(z.string()),
  autonomous_mode: z.boolean(),
})

export async function GET() {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('optimization_guardrails')
    .select('*')
    .eq('workspace_id', session.workspace.id)
    .single()

  return NextResponse.json({
    guardrail: data ?? {
      kill_switch: false,
      max_budget_change_pct: 20,
      max_daily_actions: 5,
      blacklisted_campaign_ids: [],
      autonomous_mode: false,
    },
  })
}

export async function PUT(req: Request) {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = GuardrailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('optimization_guardrails')
    .upsert({ workspace_id: session.workspace.id, ...parsed.data })

  if (error) {
    console.error('[optimize/guardrails] upsert error:', error)
    return NextResponse.json({ error: 'Erro ao salvar guardrails' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
