/**
 * Supabase service-role client for privileged server-only operations.
 * Bypasses RLS — NEVER expose to the browser.
 * Used by: pixel event ingestion, RTB bid logging, analytics aggregates,
 *          audience opt-out, integrations credentials.
 */

import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient> | null = null;

export function createServiceClient(): ReturnType<typeof createClient> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — service client cannot be created."
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
