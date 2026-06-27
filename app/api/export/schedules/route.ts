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

const createSchema = z.object({
  name: z.string().min(1, 'name is required'),
  destination_type: z.enum(['bigquery', 'snowflake', 's3', 'csv_download'] as const),
  config: z.record(z.string(), z.unknown()).default({}),
  schedule: z.enum(['hourly', 'daily'] as const).nullable().optional(),
})

export async function GET(_req: NextRequest): Promise<NextResponse> {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('export_destinations')
    .select('*')
    .eq('workspace_id', session.workspace.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[export/schedules GET]', error.message)
    return NextResponse.json({ error: 'Falha ao buscar destinos' }, { status: 500 })
  }

  const sanitized = (data ?? []).map((d) => ({
    ...(d as ExportDestination),
    config: stripSecrets((d as ExportDestination).config as Record<string, unknown>),
  }))
  return NextResponse.json({ destinations: sanitized })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin', 'member'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('export_destinations')
    .insert({
      organization_id: session.organization.id,
      workspace_id: session.workspace.id,
      name: parsed.data.name,
      destination_type: parsed.data.destination_type,
      config: parsed.data.config,
      schedule: parsed.data.schedule ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[export/schedules POST]', error?.message)
    return NextResponse.json({ error: 'Falha ao criar destino' }, { status: 500 })
  }

  return NextResponse.json({ destination: data as ExportDestination }, { status: 201 })
}
