"use server";

/**
 * Server Actions for auth flows.
 *
 * These run server-side and manage the session cookie directly.
 * Forms call these via useTransition / router.refresh — no API route needed.
 *
 * TODO(M1-backend) markers show exactly what to replace for real Supabase.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  FAKE_SESSION,
  buildSessionCookie,
  clearSessionCookie,
  encodeSession,
} from "@/lib/auth/session";
import type { SessionContext, OrgRole } from "@/types/database";

// ── Login (magic link) ────────────────────────────────────────────────────────

/**
 * Called by LoginForm after the user submits their e-mail.
 * In fake mode: always "succeeds" — returns the sentinel that triggers the
 * success state on the client.  No cookie is set yet; the real cookie is set
 * after the user clicks the link.
 *
 * TODO(M1-backend):
 *   const supabase = await createServerClientFromCookies();
 *   const { error } = await supabase.auth.signInWithOtp({
 *     email,
 *     options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
 *   });
 *   if (error) return { error: error.message };
 *   return { ok: true };
 */
export async function sendMagicLink(
  email: string
): Promise<{ ok: true } | { error: string }> {
  // Simulate network latency
  await delay(500);

  if (!email.includes("@")) {
    return { error: "E-mail inválido." };
  }

  console.info("[fake-auth] magic link sent to:", email);
  return { ok: true };
}

// ── Login (fake instant — for dev convenience) ────────────────────────────────

/**
 * Dev-only action: set a fake session cookie immediately, skipping the e-mail
 * flow. Accessible via GET /api/auth/dev-login (see route below).
 * Removed in production builds automatically via NODE_ENV check in the route.
 */
export async function devLogin(nextPath = "/dashboard") {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DEV_LOGIN !== "true"
  ) {
    throw new Error("devLogin is not available in this environment");
  }
  const cookieStore = await cookies();
  cookieStore.set({
    name: "adflow_session",
    value: encodeSession(FAKE_SESSION),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 604800,
  });
  redirect(nextPath);
}

// ── Signup ────────────────────────────────────────────────────────────────────

/**
 * TODO(M1-backend):
 *   const supabase = await createServerClientFromCookies();
 *   const { error } = await supabase.auth.signInWithOtp({
 *     email,
 *     options: {
 *       data: { display_name: name },
 *       emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?onboarding=1`,
 *     },
 *   });
 */
export async function signUp(
  name: string,
  email: string
): Promise<{ ok: true } | { error: string }> {
  await delay(600);
  console.info("[fake-auth] signup:", { name, email });
  return { ok: true };
}

// ── Onboarding (create org + workspace) ──────────────────────────────────────

type OnboardingInput = {
  orgName: string;
  orgType: "agency" | "advertiser" | "freelancer";
  workspaceName: string;
  workspaceDescription?: string;
};

/**
 * Creates the org + workspace and sets the session cookie.
 * Redirects to /dashboard on success.
 *
 * TODO(M1-backend):
 *   1. supabase.from("organizations").insert({ name, plan: "free" }) → org
 *   2. supabase.from("organization_members").insert({ org_id, user_id, role: "owner" })
 *   3. supabase.from("workspaces").insert({ org_id, name, description }) → ws
 *   4. supabase.from("workspace_members").insert({ ws_id, user_id, role: "owner" })
 *   5. Session is refreshed automatically via Supabase cookie.
 */
export async function completeOnboarding(
  input: OnboardingInput
): Promise<{ ok: true } | { error: string }> {
  await delay(800);

  const session: SessionContext = {
    ...FAKE_SESSION,
    organization: {
      ...FAKE_SESSION.organization,
      name: input.orgName,
    },
    workspace: {
      ...FAKE_SESSION.workspace,
      name: input.workspaceName,
      description: input.workspaceDescription ?? null,
    },
    role: "owner" as OrgRole,
  };

  const cookieStore = await cookies();
  cookieStore.set({
    name: "adflow_session",
    value: encodeSession(session),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 604800,
  });

  console.info("[fake-auth] onboarding complete:", { org: input.orgName, ws: input.workspaceName });
  redirect("/dashboard");
}

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * TODO(M1-backend):
 *   const supabase = await createServerClientFromCookies();
 *   await supabase.auth.signOut();
 *   // @supabase/ssr clears the cookie automatically
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "adflow_session",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  redirect("/login");
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Keep import happy — used in buildSessionCookie JSDoc
void clearSessionCookie;
void buildSessionCookie;
