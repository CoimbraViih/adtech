import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { getEventsByWorkspace } from '@/lib/events/query'
import { eventsToCSV } from '@/lib/export/csv'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 90
const EXPORT_LIMIT = 10_000

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

  const eventType = searchParams.get('event_type') ?? undefined
  const campaignId = searchParams.get('campaign_id') ?? undefined

  const eventsPage = await getEventsByWorkspace(
    session.organization.id,
    session.workspace.id,
    {
      start_date: startDate,
      end_date: endDate,
      event_type: eventType,
      campaign_id: campaignId,
      limit: EXPORT_LIMIT,
      offset: 0,
    }
  )

  const csv = eventsToCSV(eventsPage.rows)
  const filename = `events-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
