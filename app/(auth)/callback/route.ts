import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encodeSession, FAKE_SESSION } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const onboarding = searchParams.get("onboarding");
  // Sanitize redirect destination against open-redirect attacks
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  // CSRF state validation — only reject if a state cookie was set AND it doesn't match.
  // When no state cookie exists (fake-auth / magic-link flows), the check is skipped.
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const incomingState = searchParams.get("state");

  if (storedState && incomingState && storedState !== incomingState) {
    console.warn("[callback] CSRF state mismatch — aborting");
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  // Clear the state cookie after use (prevents replay)
  if (storedState) {
    cookieStore.delete("oauth_state");
  }

  cookieStore.set({
    name: "adflow_session",
    value: encodeSession(FAKE_SESSION),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 604800,
  });

  const destination = onboarding ? "/onboarding" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
