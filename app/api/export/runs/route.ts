import { NextRequest, NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { ExportRun } from '@/types/database'

export async function GET(req: NextRequest): Promise<NextResponse> {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const destinationId = searchParams.get('destination_id')

  if (!destinationId) {
    return NextResponse.json({ error: 'destination_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify the destination belongs to this org (IDOR guard)
  const { data: dest, error: destError } = await supabase
    .from('export_destinations')
    .select('id')
    .eq('id', destinationId)
    .eq('organization_id', session.organization.id)
    .maybeSingle()

  if (destError) {
    console.error('[export/runs GET dest check]', destError.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
  if (!dest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('export_runs')
    .select('*')
    .eq('destination_id', destinationId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[export/runs GET]', error.message)
    return NextResponse.json({ error: 'Falha ao buscar execuções' }, { status: 500 })
  }

  return NextResponse.json({ runs: (data ?? []) as ExportRun[] })
}
