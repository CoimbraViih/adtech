/**
 * Real Supabase server client — M10 swap-in.
 *
 * To activate for M10 deploy:
 *   1. Rename this file to server.ts (replacing the current stub)
 *   2. Rename lib/supabase/middleware-real.ts to middleware.ts
 *   3. In middleware.ts, remove the SESSION_COOKIE / decodeSession imports
 *   4. In lib/auth/actions.ts, wire sendMagicLink / signUp / logout to real Supabase
 *   5. In app/(auth)/callback/route.ts, activate the PKCE exchange (see below)
 *   6. Set ENABLE_DEV_LOGIN=true only in .env.local (never in production)
 *   7. Run npm test && npm run test:e2e — update any E2E helpers that use devLogin
 *
 * Dependencies: npm install @supabase/ssr (already installed)
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { SessionContext } from "@/types/database";
import { FAKE_SESSION } from "@/lib/auth/session";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// cache() makes this request-scoped: multiple callers in one request pay one DB round-trip
export const getServerSession = cache(
  async (): Promise<SessionContext | null> => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return null;

    const [orgResult, wsResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("*")
        .eq("id", (membership as { organization_id: string }).organization_id)
        .single(),
      supabase
        .from("workspace_members")
        .select("workspaces(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    const org = orgResult.data;
    if (!org) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = (wsResult.data as any)?.workspaces ?? {
      id: "",
      organization_id: (org as { id: string }).id,
      name: "Default",
      description: null,
      created_at: "",
      updated_at: "",
    };

    return {
      user: {
        id: user.id,
        email: user.email ?? "",
        display_name:
          (user.user_metadata?.display_name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ?? null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organization: org as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workspace: ws as any,
      role: (membership as { role: SessionContext["role"] }).role,
    };
  }
);

export async function requireServerSession(): Promise<SessionContext> {
  const session = await getServerSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function getUser() {
  const supabase = await createServerSupabaseClient();
  return supabase.auth.getUser();
}

// Re-export for dev/test use
export { FAKE_SESSION };
