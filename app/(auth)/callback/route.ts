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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.auth as any).exchangeCodeForSession(code);

  if (error) {
    console.error("[callback] PKCE exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Supabase sets sb-*-auth-token cookies automatically via setAll in createServerSupabaseClient
  const destination = onboarding ? "/onboarding" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
