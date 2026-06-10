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
  "/api/auth/dev-login",
];

const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
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

  if (pathname.startsWith("/superadmin") || pathname.startsWith("/(superadmin)")) {
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
