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

  try {
    await chInsert('events', events);
    // Success: mark all rows processed
    await supabase
      .from('events_outbox')
      .update({ processed_at: new Date().toISOString() })
      .in('id', ids);
    return { processed: rows.length, failed: 0, skipped: 0 };
  } catch (err) {
    console.error('[events/consumer] ClickHouse insert failed:', (err as Error).message);
    // Failure: increment attempts per row to respect each row's current count
    for (const row of rows) {
      await supabase
        .from('events_outbox')
        .update({ attempts: (row.attempts as number) + 1 })
        .eq('id', row.id as string);
    }
    return { processed: 0, failed: rows.length, skipped: 0 };
  }
}
