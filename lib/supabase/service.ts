/**
 * Supabase service-role client for privileged server-only operations.
 * Bypasses RLS — NEVER expose to the browser.
 * Used by: pixel event ingestion, RTB bid logging, analytics aggregates,
 *          audience opt-out, integrations credentials.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSecretsNotPublic } from "@/lib/security/env-check";

// Verify no secret keys are accidentally exposed as NEXT_PUBLIC_ variables
assertSecretsNotPublic();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceClient(): SupabaseClient<any> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — service client cannot be created."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
