/**
 * Next.js Edge Middleware — route protection + session refresh.
 *
 * Route groups:
 *   PUBLIC        /login  /signup  /onboarding  /api/health
 *   PROTECTED     /(dashboard)/**   → redirect /login if no session
 *   SUPERADMIN    /(superadmin)/**  → redirect /dashboard if not superadmin
 *   AUTH_ONLY     /login /signup    → redirect /dashboard if already logged in
 *
 * TODO(M1-backend): swap updateSession() for the real Supabase @supabase/ssr helper.
 * The redirect logic below stays identical.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";

// Routes that are always public (no auth required).
// Note: /login and /signup are intentionally absent here — they are handled by
// AUTH_ONLY_PATHS below, which redirects logged-in users to /dashboard.
const PUBLIC_PATHS = [
  "/",                   // M6 — marketing landing page
  "/onboarding",
  "/callback",
  "/api/health",
  "/api/pixel",          // M4 — public ingestion endpoint
  "/api/leads",          // M6 — public waitlist endpoint
  "/api/audiences/optout", // LGPD — DMP opt-out endpoint (no auth required)
  "/api/auth/dev-login", // dev-only shortcut — blocked in prod by route handler
];

// Routes only accessible when NOT authenticated (redirect to dashboard if logged in)
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Refresh session (no-op in fake mode, real Supabase rotates tokens here)
  const { user, response } = await updateSession(request);

  // 2. Resolve session directly from cookie for superadmin role check
  const rawCookie = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = rawCookie ? decodeSession(rawCookie) : null;

  const isAuthenticated = !!user;

  // 3. Auth-only paths: logged-in users go to dashboard
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // 4. Public paths: always pass through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // 5. Superadmin routes: must be authenticated + role === superadmin
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/(superadmin)")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session?.role !== "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // 6. Dashboard + all other protected routes: must be authenticated
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    // Sanitize against open-redirect: only allow same-origin relative paths
    const safeNext =
      pathname.startsWith("/") && !pathname.startsWith("//")
        ? pathname
        : "/dashboard";
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - public files (adflow.js, images, fonts)
     */
    "/((?!_next/static|_next/image|favicon.ico|adflow\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)",
  ],
};
