import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encodeSession, FAKE_SESSION } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const onboarding = searchParams.get("onboarding");
  const next = searchParams.get("next") ?? "/dashboard";

  // CSRF state validation — reject mismatched state when a state cookie is present
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const incomingState = searchParams.get("state");

  if (!storedState || !incomingState || storedState !== incomingState) {
    console.warn("[callback] CSRF state missing or mismatch — aborting");
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
