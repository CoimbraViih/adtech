/**
 * Supabase service-role client for server-only, privileged operations
 * (e.g. writing pixel events from unauthenticated endpoints).
 *
 * NEVER expose this client to the browser.
 * TODO(M1-backend): replace mock with real createClient from @supabase/supabase-js
 */

type Chain = {
  select: (cols?: string) => Chain;
  insert: (row: unknown) => Chain;
  eq: (col: string, val: unknown) => Chain;
  gte: (col: string, val: unknown) => Chain;
  lte: (col: string, val: unknown) => Chain;
  single: () => Promise<{ data: unknown; error: unknown }>;
};

type SupabaseServiceClient = {
  from: (table: string) => Chain;
};

let _client: SupabaseServiceClient | null = null;

export function createServiceClient(): SupabaseServiceClient {
  if (_client) return _client;

  const makeChain = (): Chain => {
    const chain: Chain = {
      select: () => chain,
      insert: () => chain,
      eq: () => chain,
      gte: () => chain,
      lte: () => chain,
      single: async () => ({ data: null, error: { message: "service client not configured" } }),
    };
    return chain;
  };

  _client = { from: () => makeChain() };
  return _client;
}
