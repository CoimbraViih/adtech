import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { SessionContext } from "@/types/database";

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
