import { NextResponse } from 'next/server'
import { runScheduledExports } from '@/lib/export/scheduler'

export async function GET(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  // Fail-closed: reject if secret not configured OR header doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runScheduledExports()
  console.log('[cron/run-scheduled-exports]', JSON.stringify(result))
  return NextResponse.json(result)
}
