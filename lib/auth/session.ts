/**
 * Fake session layer.
 * Replace every function body with real Supabase calls when M1 backend goes live.
 *
 * Cookie name: adflow_session
 * Value: base64-encoded JSON of SessionContext
 *
 * Why cookies over localStorage: readable server-side in Server Components and
 * middleware, which is where route protection happens.
 */

import type { SessionContext, AuthUser, Organization, Workspace } from "@/types/database";

export const SESSION_COOKIE = "adflow_session";

// ── Fake seed data ────────────────────────────────────────────────────────────

export const FAKE_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@adflow.app",
  display_name: "Demo User",
  avatar_url: null,
};

export const FAKE_ORG: Organization = {
  id: "00000000-0000-0000-0000-000000000010",
  name: "Agência Demo",
  plan: "agency",
  stripe_customer_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const FAKE_WORKSPACE: Workspace = {
  id: "00000000-0000-0000-0000-000000000020",
  organization_id: FAKE_ORG.id,
  name: "Clientes principais",
  description: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const FAKE_SESSION: SessionContext = {
  user: FAKE_USER,
  organization: FAKE_ORG,
  workspace: FAKE_WORKSPACE,
  role: "owner",
};

// ── Serialisation ─────────────────────────────────────────────────────────────

export function encodeSession(session: SessionContext): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export function decodeSession(raw: string): SessionContext | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as SessionContext;
  } catch {
    return null;
  }
}

// ── Server-side helpers (Server Components / Route Handlers) ──────────────────

/**
 * Read session from cookies.
 * TODO(M1-backend): replace with `supabase.auth.getUser()` via server client.
 */
export async function getSessionFromCookies(
  cookieHeader: string | null
): Promise<SessionContext | null> {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));

  if (!match) return null;

  const value = match.slice(SESSION_COOKIE.length + 1);
  return decodeSession(value);
}

/**
 * Build Set-Cookie header string for login.
 * TODO(M1-backend): Supabase handles this automatically via @supabase/ssr.
 */
export function buildSessionCookie(session: SessionContext): string {
  const value = encodeSession(session);
  // HttpOnly + SameSite=Lax + Secure (Secure only in prod to allow local http)
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}

/**
 * Build Set-Cookie header string for logout (expire immediately).
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
