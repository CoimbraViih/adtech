/**
 * Dev-only route: GET /api/auth/dev-login
 * Uses the Supabase Admin API to generate a magic link directly (no SMTP needed).
 * Redirects the browser through the link to establish a real session.
 * Blocked unless NODE_ENV=development and ENABLE_DEV_LOGIN=true.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DEV_LOGIN !== "true"
  ) {
    return NextResponse.json({ error: "Not available in this environment" }, { status: 404 });
  }

  const email = process.env.DEV_LOGIN_EMAIL;
  if (!email) {
    return NextResponse.json({ error: "DEV_LOGIN_EMAIL env var not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const supabase = createServiceClient();

    // Generate a magic link via admin API — no email sending required
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        // Supabase uses implicit flow for admin-generated links (tokens in hash).
        // /auth-redirect is a client-side page that reads the hash and sets the session.
        redirectTo: `${appUrl}/auth-redirect?next=${encodeURIComponent(next)}`,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[dev-login] admin.generateLink error:", error);
      return NextResponse.json({ error: "Failed to generate login link." }, { status: 500 });
    }

    // Redirect directly to the magic link — browser lands on /callback with a valid session
    return NextResponse.redirect(data.properties.action_link);
  } catch (err) {
    console.error("[dev-login] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
