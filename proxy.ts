/**
 * Next.js Proxy — session refresh only.
 * Auth enforcement removed: login/signup will be rebuilt from scratch.
 * All routes pass through; Supabase session cookies are refreshed when available.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  try {
    const result = await updateSession(request);
    response = result.response;
  } catch {
    // Supabase not configured — pass through
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|adflow\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)",
  ],
};
