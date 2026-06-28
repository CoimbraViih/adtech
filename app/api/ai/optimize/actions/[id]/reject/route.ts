import { NextResponse } from 'next/server'
import { requireServerSession, createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('optimization_actions')
    .update({ status: 'rejected', approved_by: session.user.id })
    .eq('id', id)
    .eq('workspace_id', session.workspace.id)

  if (error) {
    console.error('[optimize/actions/reject] error:', error)
    return NextResponse.json({ error: 'Erro ao rejeitar ação' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
