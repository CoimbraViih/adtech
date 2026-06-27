import { NextRequest, NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { selectVariant, recordImpression } from '@/lib/creatives/dco/rotation'
import type { CreativeVariant } from '@/types/database'

// ── POST /api/dco/rotate ──────────────────────────────────────────────────────
// Body: { templateId: string }
// Selects a variant via epsilon-greedy bandit, records impression, returns variant

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  if (!b.templateId || typeof b.templateId !== 'string') {
    return NextResponse.json({ error: 'O campo "templateId" é obrigatório.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  // Fetch active variants for this template (RLS via org filter)
  const { data, error } = await supabase
    .from('creative_variants')
    .select('*')
    .eq('template_id', b.templateId)
    .eq('organization_id', orgId)
    .eq('is_active', true)

  if (error) {
    console.error('[dco/rotate POST]', error.message)
    return NextResponse.json({ error: 'Falha ao buscar variants.' }, { status: 500 })
  }

  const variants = (data ?? []) as CreativeVariant[]

  if (variants.length === 0) {
    return NextResponse.json({ error: 'Nenhum variant ativo para este template.' }, { status: 404 })
  }

  // Epsilon-greedy selection
  const selected = selectVariant(variants)

  // Record impression (fire-and-forget — we don't let recording errors block the response)
  try {
    await recordImpression(selected.id)
  } catch (impressionError) {
    console.error('[dco/rotate POST] recordImpression failed', (impressionError as Error).message)
  }

  return NextResponse.json({ variant: selected })
}
