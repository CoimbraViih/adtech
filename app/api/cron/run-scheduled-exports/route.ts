import { NextRequest, NextResponse } from 'next/server'
import { runScheduledExports } from '@/lib/export/scheduler'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  // Fail-closed: reject if secret not configured OR header doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scheduleType = req.nextUrl.searchParams.get('type') as 'hourly' | 'daily' | null
  const result = await runScheduledExports(scheduleType ?? undefined)
  console.log('[cron/run-scheduled-exports]', JSON.stringify(result))
  return NextResponse.json(result)
}
