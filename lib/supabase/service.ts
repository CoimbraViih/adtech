import { createClient } from "@supabase/supabase-js";
import type { SupabaseDatabase } from "@/types/database";

let _client: ReturnType<typeof createClient<SupabaseDatabase>> | null = null;

/**
 * Supabase service-role client for server-only privileged operations
 * (pixel event ingestion, analytics aggregates, sync jobs).
 * NEVER expose this client to the browser.
 */
export function createServiceClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  _client = createClient<SupabaseDatabase>(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
