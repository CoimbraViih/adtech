import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { buildAuthUrl, type OAuthProvider } from "@/lib/integrations/oauth";

const VALID_PROVIDERS = new Set<string>(["meta", "google", "linkedin", "tiktok"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  // 1. Authenticate — redirect to login if no session
  try {
    await requireServerSession();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Validate provider
  const { provider } = await params;
  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // 3. Generate state UUID and build callback redirect URI
  const state = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/${provider}/oauth/callback`;

  // 4. Build provider authorization URL
  const authUrl = buildAuthUrl(provider as OAuthProvider, state, redirectUri);

  // 5. Redirect to provider with state stored in an HttpOnly cookie (Max-Age: 600s)
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
