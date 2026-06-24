import { createServiceClient } from '@/lib/supabase/service';
import { chInsert, isClickHouseConfigured } from './clickhouse';
import type { AdFlowEvent } from './schema';

const BATCH_SIZE   = 500;
const MAX_ATTEMPTS = 3;

export type DrainResult = {
  processed: number;
  failed:    number;
  skipped:   number;
};

export async function drainOutbox(): Promise<DrainResult> {
  if (!isClickHouseConfigured()) {
    return { processed: 0, failed: 0, skipped: 1 };
  }

  const supabase = createServiceClient();

  // Fetch a batch of unprocessed rows within the retry limit
  const { data: rows, error: fetchError } = await supabase
    .from('events_outbox')
    .select('id, payload, attempts')
    .is('processed_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('[events/consumer] fetch failed:', fetchError.message);
    return { processed: 0, failed: 0, skipped: 1 };
  }
  if (!rows || rows.length === 0) {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  const ids     = rows.map(r => r.id as string);
  const events  = rows.map(r => r.payload as AdFlowEvent);

  // Increment attempt counter BEFORE trying ClickHouse (fail-safe)
  await supabase
    .from('events_outbox')
    .update({ attempts: rows[0].attempts as number + 1 })
    .in('id', ids);

  try {
    await chInsert('events', events);
    // Mark rows as processed
    await supabase
      .from('events_outbox')
      .update({ processed_at: new Date().toISOString() })
      .in('id', ids);
    return { processed: rows.length, failed: 0, skipped: 0 };
  } catch (err) {
    console.error('[events/consumer] ClickHouse insert failed:', (err as Error).message);
    return { processed: 0, failed: rows.length, skipped: 0 };
  }
}
