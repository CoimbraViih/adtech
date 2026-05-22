/**
 * OAuth / magic-link callback handler.
 *
 * Supabase redirects here after:
 *   - Google OAuth consent
 *   - Magic-link click from e-mail
 *
 * TODO(M1-backend): replace body with real Supabase code-exchange:
 *
 *   export async function GET(request: Request) {
 *     const { searchParams, origin } = new URL(request.url);
 *     const code = searchParams.get("code");
 *     const next = searchParams.get("next") ?? "/dashboard";
 *
 *     if (!code) {
 *       return NextResponse.redirect(`${origin}/login?error=missing_code`);
 *     }
 *
 *     // CSRF: verify state param matches value stored in cookie before exchange
 *     const storedState = request.cookies.get("oauth_state")?.value;
 *     const incomingState = searchParams.get("state");
 *     if (!storedState || storedState !== incomingState) {
 *       return NextResponse.redirect(`${origin}/login?error=invalid_state`);
 *     }
 *
 *     const cookieStore = await cookies();
 *     const supabase = createServerClient<Database>(
 *       process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *       { cookies: { getAll: () => cookieStore.getAll(), setAll: (toSet) => ... } }
 *     );
 *
 *     const { error } = await supabase.auth.exchangeCodeForSession(code);
 *     if (error) {
 *       return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
 *     }
 *
 *     const onboarding = searchParams.get("onboarding");
 *     return NextResponse.redirect(`${origin}${onboarding ? "/onboarding" : next}`);
 *   }
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encodeSession, FAKE_SESSION } from "@/lib/auth/session";

/**
 * Fake callback: treats any request as a successful auth exchange.
 * Sets the fake session cookie and redirects to /dashboard or /onboarding.
 *
 * CSRF stub: logs state param — real verification wired for M1-backend.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const onboarding = searchParams.get("onboarding");
  const next = searchParams.get("next") ?? "/dashboard";

  // CSRF state stub — log only; real check replaces this in M1-backend
  const incomingState = searchParams.get("state");
  console.info("[fake-callback] state:", incomingState);

  const cookieStore = await cookies();
  cookieStore.set({
    name: "adflow_session",
    value: encodeSession(FAKE_SESSION),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 604800,
  });

  const destination = onboarding ? "/onboarding" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
