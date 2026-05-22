/**
 * Supabase service-role client for server-only, privileged operations
 * (e.g. writing pixel events from unauthenticated endpoints).
 *
 * NEVER expose this client to the browser.
 * TODO(M1-backend): replace mock with real createClient from @supabase/supabase-js
 */

type SupabaseServiceClient = {
  from: (table: string) => {
    select: (cols?: string) => unknown;
    insert: (row: unknown) => unknown;
    eq: (col: string, val: unknown) => unknown;
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
};

let _client: SupabaseServiceClient | null = null;

export function createServiceClient(): SupabaseServiceClient {
  if (_client) return _client;

  const makeChain = (): ReturnType<SupabaseServiceClient["from"]> => {
    const chain: ReturnType<SupabaseServiceClient["from"]> = {
      select: () => chain,
      insert: () => chain,
      eq: () => chain,
      single: async () => ({ data: null, error: { message: "service client not configured" } }),
    };
    return chain;
  };

  _client = { from: () => makeChain() };
  return _client;
}
