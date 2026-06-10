/**
 * Dev-only route: GET /api/auth/dev-login
 * No longer used — real Supabase auth is now active.
 * Kept as a 404 stub to avoid import errors.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not available" }, { status: 404 });
}
