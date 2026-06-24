/**
 * One-time backfill script: reads pixel_events from Postgres → enqueues to events_outbox
 * Run with: npx tsx scripts/backfill-events-to-outbox.ts
 *
 * Env vars required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Skip events already in outbox by checking existing pixel_id + created_at matches.
 */
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 1000;
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '';
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function main(): Promise<void> {
  console.log('[backfill] Starting pixel_events → events_outbox backfill');

  let offset     = 0;
  let totalQueued = 0;
  let totalSkipped = 0;
  let page = 1;

  while (true) {
    // Fetch batch of pixel_events with workspace info
    const { data: events, error } = await supabase
      .from('pixel_events')
      .select('id, pixel_id, event_type, event_name, url, referrer, ip, user_agent, session_id, value, currency, properties, created_at, pixels(workspace_id, workspaces(organization_id))')
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('[backfill] fetch error:', error.message);
      break;
    }
    if (!events || events.length === 0) {
      console.log('[backfill] No more events to process');
      break;
    }

    console.log(`[backfill] Page ${page}: fetched ${events.length} events (offset ${offset})`);

    // Build outbox rows
    const outboxRows = events
      .map(e => {
        const pixel = e.pixels as unknown as { workspace_id: string; workspaces: { organization_id: string } | null } | null;
        const workspaceId    = pixel?.workspace_id    ?? '';
        const organizationId = pixel?.workspaces?.organization_id ?? '';

        if (!workspaceId || !organizationId) {
          totalSkipped++;
          return null;
        }

        return {
          organization_id: organizationId,
          workspace_id:    workspaceId,
          pixel_id:        e.pixel_id,
          payload: {
            event_id:        e.id,
            organization_id: organizationId,
            workspace_id:    workspaceId,
            pixel_id:        e.pixel_id,
            event_type:      e.event_type,
            event_name:      e.event_name ?? null,
            session_id:      e.session_id ?? null,
            url:             e.url ?? null,
            referrer:        e.referrer ?? null,
            ip:              e.ip ?? null,
            user_agent:      e.user_agent ?? null,
            value:           e.value ?? null,
            currency:        e.currency ?? null,
            properties:      (e.properties as Record<string, unknown>) ?? {},
            consent_state:   'unknown',
            event_time:      e.created_at,
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (outboxRows.length > 0) {
      const { error: insertError } = await supabase
        .from('events_outbox')
        .insert(outboxRows);

      if (insertError) {
        console.error('[backfill] insert error:', insertError.message);
        // Continue to next batch — don't abort on partial failure
      } else {
        totalQueued += outboxRows.length;
      }
    }

    offset += BATCH_SIZE;
    page++;

    if (events.length < BATCH_SIZE) break; // Last page
  }

  console.log(`[backfill] Done. Queued: ${totalQueued}, Skipped (no org): ${totalSkipped}`);
}

main().catch(err => {
  console.error('[backfill] Fatal error:', (err as Error).message);
  process.exit(1);
});
