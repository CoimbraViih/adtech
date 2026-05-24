/**
 * Supabase server client (per-request, cookies-based).
 * Used in Server Components, Route Handlers, and Server Actions.
 *
 * TODO(M1-backend): replace body with:
 *   import { createServerClient } from "@supabase/ssr";
 *   import { cookies } from "next/headers";
 *   import type { Database } from "@/types/supabase";
 *
 *   export async function getSupabaseServerClient() {
 *     const cookieStore = await cookies();
 *     return createServerClient<Database>(
 *       process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *       {
 *         cookies: {
 *           getAll: () => cookieStore.getAll(),
 *           setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
 *             cookieStore.set(name, value, options)
 *           ),
 *         },
 *       }
 *     );
 *   }
 *
 * IMPORTANT: always call `supabase.auth.getUser()` — NEVER `getSession()`.
 * getSession() reads from local storage (tamper-able); getUser() validates
 * the JWT server-side via the Supabase API.
 */

import { cookies } from "next/headers";
import {
  getSessionFromCookies,
  FAKE_SESSION,
} from "@/lib/auth/session";
import type { SessionContext } from "@/types/database";

/**
 * Returns the current session from the fake cookie store.
 * Returns null when unauthenticated (no cookie present).
 */
export async function getServerSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("adflow_session")?.value ?? null;
  if (!raw) return null;

  // Use the same decoder as the session helper
  const { decodeSession } = await import("@/lib/auth/session");
  return decodeSession(raw);
}

/**
 * Returns the session or throws — use inside protected route handlers
 * where you want an automatic 401 on missing session.
 */
export async function requireServerSession(): Promise<SessionContext> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

/**
 * Fake "getUser" — mirrors `supabase.auth.getUser()` shape.
 * TODO(M1-backend): replace with real Supabase client call.
 */
export async function getUser() {
  const session = await getServerSession();
  if (!session) return { data: { user: null }, error: null };
  return {
    data: {
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: {
          display_name: session.user.display_name,
          avatar_url: session.user.avatar_url,
        },
      },
    },
    error: null,
  };
}

// Suppress unused-import warning — exported for convenience
export { getSessionFromCookies, FAKE_SESSION };

/**
 * Returns a minimal fake Supabase-like client for use in server-side helpers.
 * TODO(M1-backend): replace with a real Supabase client once the backend is wired up.
 *
 * The returned object mirrors the subset of the Supabase client API used by
 * `lib/automation/rules.ts` and other server helpers:
 *   client.from(table).select(...).eq(...) …  (returns { data, error })
 *   client.auth.getUser()
 */
export async function createServerSupabaseClient() {
  // Build a chainable query builder that resolves to { data: null, error: null }
  // by default.  Real data only flows once M1-backend replaces this stub.
  type QueryResult = { data: unknown; error: unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Chain = Promise<QueryResult> & {
    select: (..._args: unknown[]) => Chain;
    eq: (..._args: unknown[]) => Chain;
    in: (..._args: unknown[]) => Chain;
    insert: (..._args: unknown[]) => Chain;
    update: (..._args: unknown[]) => Chain;
    order: (..._args: unknown[]) => Chain;
    limit: (..._args: unknown[]) => Chain;
    single: () => Promise<QueryResult>;
  };

  function makeChain(): Chain {
    const result = Promise.resolve({ data: null as unknown, error: null as unknown });
    const chain = Object.assign(result, {
      select: (..._args: unknown[]) => chain,
      eq: (..._args: unknown[]) => chain,
      in: (..._args: unknown[]) => chain,
      insert: (..._args: unknown[]) => chain,
      update: (..._args: unknown[]) => chain,
      order: (..._args: unknown[]) => chain,
      limit: (..._args: unknown[]) => chain,
      single: () => Promise.resolve({ data: null as unknown, error: null as unknown }),
    }) as Chain;
    return chain;
  }

  return {
    from: (_table: string) => makeChain(),
    auth: {
      getUser: async () => {
        const session = await getServerSession();
        if (!session) return { data: { user: null }, error: null };
        return {
          data: {
            user: {
              id: session.user.id,
              email: session.user.email,
            },
          },
          error: null,
        };
      },
    },
  };
}
