import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/",
  "/onboarding",
  "/callback",
  "/api/health",
  "/api/pixel",
  "/api/leads",
  "/api/audiences/optout",
  // dev-login removed from public paths — the route guards itself with ENABLE_DEV_LOGIN
];

const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { user, response } = await updateSession(request);

  const isAuthenticated = !!user;

  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Superadmin routes: require authentication here. Role check is
  // also enforced inside the superadmin layout for defense-in-depth.
  if (pathname.startsWith("/superadmin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
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
    "/((?!_next/static|_next/image|favicon.ico|adflow\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)",
  ],
};
