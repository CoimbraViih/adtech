import { NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { runPredictiveEngine } from '@/lib/ai/predict/engine'

export async function POST() {
  let session
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const actions = await runPredictiveEngine(
      session.workspace.id,
      session.organization.id,
    )
    return NextResponse.json({ actions })
  } catch (err) {
    console.error('[optimize/suggest] error:', err)
    return NextResponse.json({ error: 'Erro ao gerar sugestões' }, { status: 500 })
  }
}
