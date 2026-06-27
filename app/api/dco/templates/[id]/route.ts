import { NextRequest, NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { extractPlaceholders } from '@/lib/creatives/dco/templates'
import type { CreativeTemplate, CreativeTemplateFormat } from '@/types/database'

const VALID_FORMATS: CreativeTemplateFormat[] = ['copy', 'banner', 'video']

type RouteParams = { params: Promise<{ id: string }> }

// ── GET /api/dco/templates/[id] ───────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id
  const { id } = await params

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) {
    console.error('[dco/templates/[id] GET]', error.message)
    return NextResponse.json({ error: 'Falha ao buscar template.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ template: data as CreativeTemplate })
}

// ── PATCH /api/dco/templates/[id] ────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  // Validate name if provided
  if (b.name !== undefined && (typeof b.name !== 'string' || b.name.trim() === '')) {
    return NextResponse.json({ error: 'O campo "name" não pode ser vazio.' }, { status: 422 })
  }

  // Validate format if provided
  if (b.format !== undefined && !VALID_FORMATS.includes(b.format as CreativeTemplateFormat)) {
    return NextResponse.json(
      { error: `O campo "format" deve ser um de: ${VALID_FORMATS.join(', ')}.` },
      { status: 422 },
    )
  }

  // Validate template_body if provided
  if (
    b.template_body !== undefined &&
    (typeof b.template_body !== 'object' || Array.isArray(b.template_body) || b.template_body === null)
  ) {
    return NextResponse.json({ error: 'O campo "template_body" deve ser um objeto.' }, { status: 422 })
  }

  // Build update payload
  const updates: Record<string, unknown> = {}
  if (b.name !== undefined) updates.name = (b.name as string).trim()
  if (b.format !== undefined) updates.format = b.format
  if (b.is_active !== undefined) updates.is_active = b.is_active
  if (b.template_body !== undefined) {
    const templateBody = b.template_body as Record<string, unknown>
    // Validate all values in template_body are strings
    const bodyEntries = Object.entries(templateBody)
    if (bodyEntries.some(([, v]) => typeof v !== 'string')) {
      return NextResponse.json(
        { error: 'template_body values must all be strings' },
        { status: 422 },
      )
    }
    updates.template_body = templateBody as Record<string, string>
    updates.placeholders = extractPlaceholders(templateBody as Record<string, string>)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 422 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('creative_templates')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[dco/templates/[id] PATCH]', error.message)
    return NextResponse.json({ error: 'Falha ao atualizar template.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ template: data as CreativeTemplate })
}

// ── DELETE /api/dco/templates/[id] ───────────────────────────────────────────
// Soft delete: set is_active = false

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id
  const { id } = await params

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('creative_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[dco/templates/[id] DELETE]', error.message)
    return NextResponse.json({ error: 'Falha ao remover template.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
