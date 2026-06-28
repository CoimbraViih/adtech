import { NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { executeAction } from '@/lib/ai/actions/executor'

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

  try {
    const result = await executeAction(id, session.organization.id, session.workspace.id, session.user.id)

    if (!result.success) {
      // SECURITY: do not expose raw platform error messages to the client
      return NextResponse.json({ error: 'Não foi possível executar a ação' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[optimize/actions/approve] error:', err)
    return NextResponse.json({ error: 'Erro interno ao executar ação' }, { status: 500 })
  }
}
