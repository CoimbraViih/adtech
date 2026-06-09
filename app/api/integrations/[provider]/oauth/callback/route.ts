import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { exchangeCode, type OAuthProvider } from "@/lib/integrations/oauth";
import { saveTokenRefresh, upsertCredentials } from "@/lib/integrations/credentials";

const VALID_PROVIDERS = new Set<string>(["meta", "google", "linkedin", "tiktok"]);

/** Seconds-to-expiry fallbacks per provider when expiresIn is undefined */
const EXPIRY_FALLBACK_SECONDS: Record<OAuthProvider, number | null> = {
  meta: 60 * 24 * 3600,
  google: null,            // Google refresh tokens don't expire
  linkedin: 60 * 24 * 3600,
  tiktok: 86400,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  const { provider } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  /** Clears the state cookie and redirects to integrations page with an error param. */
  function errorRedirect(reason: string): NextResponse {
    const url = new URL(`${appUrl}/settings/integrations?error=${encodeURIComponent(reason)}`);
    const res = NextResponse.redirect(url);
    res.cookies.set(`oauth_state_${provider}`, "", { maxAge: 0, path: "/" });
    return res;
  }

  // 1. Authenticate
  let session;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Validate provider
  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // 3. Extract query params
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const queryState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // Provider-side error (e.g. user denied consent)
  if (oauthError) {
    return errorRedirect(oauthError);
  }

  if (!code || !queryState) {
    return errorRedirect("missing_code_or_state");
  }

  // 4. Validate CSRF state cookie
  const cookieState = request.cookies.get(`oauth_state_${provider}`)?.value;
  if (!cookieState || cookieState !== queryState) {
    return errorRedirect("invalid_state");
  }

  // 5. Exchange authorization code for tokens
  const redirectUri = `${appUrl}/api/integrations/${provider}/oauth/callback`;
  let tokens;
  try {
    tokens = await exchangeCode(provider as OAuthProvider, code, redirectUri);
  } catch (err) {
    console.error(`[oauth/callback] exchangeCode failed for ${provider}:`, (err as Error).message);
    return errorRedirect("token_exchange_failed");
  }

  // 6. Compute expiresAt
  const fallbackSeconds = EXPIRY_FALLBACK_SECONDS[provider as OAuthProvider];
  const expiresInSeconds = tokens.expiresIn ?? fallbackSeconds ?? undefined;
  const expiresAt = expiresInSeconds != null
    ? new Date(Date.now() + expiresInSeconds * 1000)
    : new Date(Date.now() + 365 * 24 * 3600 * 1000); // 1-year safety fallback

  const orgId = session.organization.id;

  // 7. Persist tokens — initial upsert then saveTokenRefresh for expires_at
  try {
    const initialFields: Record<string, string> = {
      access_token: tokens.accessToken,
      oauth_connected: "true",
    };
    if (tokens.refreshToken) {
      initialFields.refresh_token = tokens.refreshToken;
    }
    // TikTok: persist first advertiser_id when returned
    const advertiserIds = tokens.extra?.advertiser_ids;
    if (Array.isArray(advertiserIds) && advertiserIds.length > 0) {
      initialFields.advertiser_id = String(advertiserIds[0]);
    }

    await upsertCredentials(orgId, provider, initialFields);

    // saveTokenRefresh merges tokens without touching other credential fields
    // and writes expires_at + refresh_token columns (migration 020)
    await saveTokenRefresh(orgId, provider, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    });
  } catch (err) {
    console.error(`[oauth/callback] persist failed for ${provider}:`, (err as Error).message);
    return errorRedirect("persist_failed");
  }

  // 8. Delete state cookie and redirect to success
  const successUrl = new URL(`${appUrl}/settings/integrations?connected=${provider}`);
  const res = NextResponse.redirect(successUrl);
  res.cookies.set(`oauth_state_${provider}`, "", { maxAge: 0, path: "/" });
  return res;
}
