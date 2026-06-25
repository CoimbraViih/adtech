// lib/events/ingest.ts
import { createServiceClient } from '@/lib/supabase/service';
import type { AdFlowEvent } from './schema';

export async function enqueueEvent(event: AdFlowEvent): Promise<{ queued: boolean }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('events_outbox')
    .insert({
      organization_id: event.organization_id,
      workspace_id:    event.workspace_id,
      pixel_id:        event.pixel_id,
      payload:         event as unknown as Record<string, unknown>,
      consent_state:   event.consent_state,
    });
  if (error) {
    console.error('[events/ingest] outbox insert failed:', error.code, error.message);
    return { queued: false };
  }
  return { queued: true };
}
