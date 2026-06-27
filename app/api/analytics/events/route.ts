import { NextRequest, NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { getEventsByWorkspace } from '@/lib/events/query'
import { ISO_DATE, MAX_RANGE_DAYS } from '@/lib/events/validation'

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Parâmetros start_date e end_date são obrigatórios.' },
      { status: 400 }
    )
  }
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
    return NextResponse.json(
      { error: 'start_date e end_date devem ter formato YYYY-MM-DD.' },
      { status: 400 }
    )
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = (end.getTime() - start.getTime()) / 86_400_000
  if (diffDays < 0 || diffDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `O intervalo de datas não pode exceder ${MAX_RANGE_DAYS} dias.` },
      { status: 400 }
    )
  }

  const rawLimit = Number(searchParams.get('limit') ?? '50')
  const rawOffset = Number(searchParams.get('offset') ?? '0')
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0

  const eventType = searchParams.get('event_type') ?? undefined
  const campaignId = searchParams.get('campaign_id') ?? undefined

  const eventsPage = await getEventsByWorkspace(
    session.organization.id,
    session.workspace.id,
    { start_date: startDate, end_date: endDate, event_type: eventType, campaign_id: campaignId, limit, offset }
  )

  return NextResponse.json(eventsPage)
}
