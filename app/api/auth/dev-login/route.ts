/**
 * Dev-only route: GET /api/auth/dev-login
 * Sets a fake session cookie and redirects to /dashboard.
 * Blocked in production.
 *
 * Usage: open http://localhost:3000/api/auth/dev-login in the browser
 * to log in without going through the magic-link flow.
 */

import { NextResponse } from "next/server";
import { devLogin } from "@/lib/auth/actions";

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DEV_LOGIN !== "true"
  ) {
    return NextResponse.json({ error: "Not available in this environment" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";

  // devLogin() calls redirect() which throws NEXT_REDIRECT — let it propagate
  await devLogin(next);

  return NextResponse.json({ error: "unreachable" }, { status: 500 });
}
