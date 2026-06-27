import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireServerSession } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { ExportDestination } from '@/types/database'

const SECRET_CONFIG_FIELDS = ['password', 'secret_access_key', 'credentials_json', 'private_key', 'client_secret']

function stripSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const result = { ...config }
  for (const field of SECRET_CONFIG_FIELDS) {
    if (field in result) {
      result[field] = '***'
    }
  }
  return result
}

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    schedule: z.enum(['hourly', 'daily'] as const).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin', 'member'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // IDOR guard: verify destination belongs to this org
  const supabase = createServiceClient()
  const { data: existing, error: fetchError } = await supabase
    .from('export_destinations')
    .select('id, organization_id')
    .eq('id', id)
    .eq('organization_id', session.organization.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[export/schedules/[id] PATCH fetch]', fetchError.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('export_destinations')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', session.organization.id)
    .select()
    .single()

  if (error || !data) {
    console.error('[export/schedules/[id] PATCH update]', error?.message)
    return NextResponse.json({ error: 'Falha ao atualizar destino' }, { status: 500 })
  }

  const dest = data as ExportDestination
  return NextResponse.json({
    destination: {
      ...dest,
      config: stripSecrets(dest.config as Record<string, unknown>),
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const supabase = createServiceClient()

  // IDOR guard: verify destination belongs to this org before deleting
  const { data: existing, error: fetchError } = await supabase
    .from('export_destinations')
    .select('id, organization_id')
    .eq('id', id)
    .eq('organization_id', session.organization.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[export/schedules/[id] DELETE fetch]', fetchError.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('export_destinations')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    console.error('[export/schedules/[id] DELETE]', error.message)
    return NextResponse.json({ error: 'Falha ao deletar destino' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
