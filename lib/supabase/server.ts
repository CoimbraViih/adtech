import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SessionContext, OrgPlan, OrgRole } from "@/types/database";

/** Hardcoded dev session — active only when NODE_ENV !== 'production' and no real auth. */
const DEV_SESSION: SessionContext = {
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "dev@adflow.app",
    display_name: "Dev User",
    avatar_url: null,
  },
  organization: {
    id: "00000000-0000-0000-0000-000000000010",
    name: "AdFlow Dev Org",
    plan: "agency" as OrgPlan,
    stripe_customer_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  workspace: {
    id: "00000000-0000-0000-0000-000000000020",
    organization_id: "00000000-0000-0000-0000-000000000010",
    name: "Dev Workspace",
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  role: "owner" as OrgRole,
};

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );
}

/**
 * Returns SessionContext for the authenticated user, or null.
 * Resolves org + workspace from DB after validating the JWT via getUser().
 */
export async function getServerSession(): Promise<SessionContext | null> {
  // Guard: if Supabase env vars are missing, skip real auth in dev
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV !== "production") return DEV_SESSION;
    return null;
  }

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    if (process.env.NODE_ENV !== "production") return DEV_SESSION;
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Dev bypass: return fake session so pages render without real Supabase auth
    if (process.env.NODE_ENV !== "production") return DEV_SESSION;
    return null;
  }

  // Fetch the user's org membership (first org by creation date)
  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      "role, organizations(id, name, plan, stripe_customer_id, created_at, updated_at)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!membership || !membership.organizations) {
    if (process.env.NODE_ENV !== "production") return DEV_SESSION;
    return null;
  }

  const org = membership.organizations as unknown as {
    id: string;
    name: string;
    plan: string;
    stripe_customer_id: string | null;
    created_at: string;
    updated_at: string;
  };

  // Fetch the first workspace in that org this user belongs to
  const { data: wsMembership } = await supabase
    .from("workspace_members")
    .select(
      "workspaces(id, organization_id, name, description, created_at, updated_at)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!wsMembership || !wsMembership.workspaces) {
    if (process.env.NODE_ENV !== "production") return DEV_SESSION;
    return null;
  }

  const ws = wsMembership.workspaces as unknown as {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      display_name: (user.user_metadata?.display_name as string) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    },
    organization: {
      id: org.id,
      name: org.name,
      plan: org.plan as OrgPlan,
      stripe_customer_id: org.stripe_customer_id,
      created_at: org.created_at,
      updated_at: org.updated_at,
    },
    workspace: {
      id: ws.id,
      organization_id: ws.organization_id,
      name: ws.name,
      description: ws.description,
      created_at: ws.created_at,
      updated_at: ws.updated_at,
    },
    role: membership.role as OrgRole,
  };
}

/**
 * Returns the session or throws — use inside protected route handlers.
 */
export async function requireServerSession(): Promise<SessionContext> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function getUser() {
  const supabase = await createServerSupabaseClient();
  return supabase.auth.getUser();
}
