/**
 * Unit tests for the route-protection logic extracted from middleware.ts.
 *
 * We test the decision function directly rather than spinning up Next.js,
 * so these run fast in Vitest without any server.
 */

import { describe, it, expect } from "vitest";
import { encodeSession, FAKE_SESSION } from "@/lib/auth/session";
import type { SessionContext, OrgRole } from "@/types/database";

// ── Extracted decision logic (mirrors proxy.ts exactly) ──────────────────

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/api/health",
  "/api/pixel",
];
const AUTH_ONLY_PATHS = ["/login", "/signup"];

type Decision =
  | { action: "pass" }
  | { action: "redirect"; to: string };

function routeDecision(
  pathname: string,
  sessionCookie: string | null
): Decision {
  const session = sessionCookie
    ? (() => {
        try {
          return JSON.parse(
            Buffer.from(sessionCookie, "base64").toString("utf-8")
          ) as SessionContext;
        } catch {
          return null;
        }
      })()
    : null;

  const isAuthenticated = session !== null;

  // Auth-only paths: redirect authenticated users to dashboard
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) return { action: "redirect", to: "/dashboard" };
    return { action: "pass" };
  }

  // Public paths: always pass
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return { action: "pass" };
  }

  // Superadmin routes
  if (pathname.startsWith("/superadmin")) {
    if (!isAuthenticated) return { action: "redirect", to: "/login" };
    if (session?.role !== "superadmin")
      return { action: "redirect", to: "/dashboard" };
    return { action: "pass" };
  }

  // Protected: must be authenticated
  if (!isAuthenticated) {
    return { action: "redirect", to: `/login?next=${pathname}` };
  }

  return { action: "pass" };
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function sessionCookie(role: OrgRole = "owner"): string {
  return encodeSession({ ...FAKE_SESSION, role });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Public paths — always pass through", () => {
  const publicPaths = ["/login", "/signup", "/onboarding", "/api/health", "/api/pixel/abc"];

  for (const path of publicPaths) {
    it(`passes ${path} when unauthenticated`, () => {
      expect(routeDecision(path, null)).toEqual({ action: "pass" });
    });
  }
});

describe("Auth-only paths — redirect authenticated users", () => {
  it("redirects /login to /dashboard when session cookie is present", () => {
    expect(routeDecision("/login", sessionCookie())).toEqual({
      action: "redirect",
      to: "/dashboard",
    });
  });

  it("redirects /signup to /dashboard when session cookie is present", () => {
    expect(routeDecision("/signup", sessionCookie())).toEqual({
      action: "redirect",
      to: "/dashboard",
    });
  });

  it("passes /login when no cookie", () => {
    expect(routeDecision("/login", null)).toEqual({ action: "pass" });
  });
});

describe("Protected paths — require authentication", () => {
  it("redirects /dashboard to /login with ?next when unauthenticated", () => {
    expect(routeDecision("/dashboard", null)).toEqual({
      action: "redirect",
      to: "/login?next=/dashboard",
    });
  });

  it("redirects /campaigns to /login with ?next when unauthenticated", () => {
    expect(routeDecision("/campaigns", null)).toEqual({
      action: "redirect",
      to: "/login?next=/campaigns",
    });
  });

  it("passes /dashboard when authenticated", () => {
    expect(routeDecision("/dashboard", sessionCookie())).toEqual({
      action: "pass",
    });
  });
});

describe("Superadmin paths", () => {
  it("redirects /superadmin to /login when unauthenticated", () => {
    expect(routeDecision("/superadmin", null)).toEqual({
      action: "redirect",
      to: "/login",
    });
  });

  it("redirects /superadmin to /dashboard when role is owner", () => {
    expect(routeDecision("/superadmin", sessionCookie("owner"))).toEqual({
      action: "redirect",
      to: "/dashboard",
    });
  });

  it("redirects /superadmin to /dashboard when role is admin", () => {
    expect(routeDecision("/superadmin", sessionCookie("admin"))).toEqual({
      action: "redirect",
      to: "/dashboard",
    });
  });

  it("passes /superadmin when role is superadmin", () => {
    expect(routeDecision("/superadmin", sessionCookie("superadmin"))).toEqual({
      action: "pass",
    });
  });
});

describe("Corrupted session cookie", () => {
  it("treats corrupted cookie as unauthenticated and redirects", () => {
    expect(routeDecision("/dashboard", "!!!invalid!!!")).toEqual({
      action: "redirect",
      to: "/login?next=/dashboard",
    });
  });
});
