import { NextResponse } from 'next/server';
import { drainOutbox }  from '@/lib/events/consumer';

export async function GET(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // Fail-closed: reject if secret not configured OR header doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await drainOutbox();
  console.log('[cron/drain-events-outbox]', JSON.stringify(result));
  return NextResponse.json(result);
}
