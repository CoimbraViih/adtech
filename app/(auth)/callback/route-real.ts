/**
 * Real OAuth/magic-link callback — M10 swap-in.
 *
 * To activate: rename this file to route.ts (replacing the current stub).
 * Implements PKCE code exchange via @supabase/ssr — no fake session cookie is set.
 *
 * After activation, the `adflow_session` cookie is no longer used.
 * Supabase sets its own `sb-*-auth-token` cookies automatically.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const onboarding = searchParams.get("onboarding");

  // Sanitize redirect destination against open-redirect attacks
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[callback] PKCE exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Supabase sets sb-*-auth-token cookies automatically via setAll in createServerSupabaseClient
  const destination = onboarding ? "/onboarding" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
