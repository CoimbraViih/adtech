import { NextRequest, NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { extractPlaceholders } from '@/lib/creatives/dco/templates'
import type { CreativeTemplate, CreativeTemplateFormat } from '@/types/database'

const VALID_FORMATS: CreativeTemplateFormat[] = ['copy', 'banner', 'video']

// ── GET /api/dco/templates ────────────────────────────────────────────────────
// Query params: ?workspaceId (optional), ?activeOnly=false (default true)

export async function GET(req: NextRequest): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  const supabase = createServiceClient()
  let query = supabase
    .from('creative_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[dco/templates GET]', error.message)
    return NextResponse.json({ error: 'Falha ao buscar templates.' }, { status: 500 })
  }

  return NextResponse.json({ templates: (data ?? []) as CreativeTemplate[] })
}

// ── POST /api/dco/templates ───────────────────────────────────────────────────
// Body: { name, format, template_body }

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id
  const workspaceId = session.workspace.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  // Validate name
  if (!b.name || typeof b.name !== 'string' || b.name.trim() === '') {
    return NextResponse.json({ error: 'O campo "name" é obrigatório.' }, { status: 422 })
  }

  // Validate format
  if (!b.format || !VALID_FORMATS.includes(b.format as CreativeTemplateFormat)) {
    return NextResponse.json(
      { error: `O campo "format" deve ser um de: ${VALID_FORMATS.join(', ')}.` },
      { status: 422 },
    )
  }

  // Validate template_body
  if (
    !b.template_body ||
    typeof b.template_body !== 'object' ||
    Array.isArray(b.template_body)
  ) {
    return NextResponse.json({ error: 'O campo "template_body" deve ser um objeto.' }, { status: 422 })
  }

  const templateBody = b.template_body as Record<string, string>
  const placeholders = extractPlaceholders(templateBody)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('creative_templates')
    .insert({
      organization_id: orgId,
      workspace_id: workspaceId,
      name: b.name.trim(),
      format: b.format as CreativeTemplateFormat,
      template_body: templateBody,
      placeholders,
      is_active: true,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[dco/templates POST]', error?.message)
    return NextResponse.json({ error: 'Falha ao criar template.' }, { status: 500 })
  }

  return NextResponse.json({ template: data as CreativeTemplate }, { status: 201 })
}
