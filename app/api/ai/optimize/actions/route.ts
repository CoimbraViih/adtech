import { NextResponse } from 'next/server'
import { requireServerSession, createServerSupabaseClient } from '@/lib/supabase/server'
import type { OptimizationAction } from '@/types/database'

export async function GET() {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('optimization_actions')
    .select('*')
    .eq('workspace_id', session.workspace.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[optimize/actions] error:', error)
    return NextResponse.json({ error: 'Erro ao buscar ações' }, { status: 500 })
  }

  return NextResponse.json({ actions: (data ?? []) as OptimizationAction[] })
}
