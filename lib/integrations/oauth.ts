/**
 * OAuth 2.0 helpers for ad platform integrations.
 *
 * buildAuthUrl  — generates the provider authorization URL (server-side only)
 * exchangeCode  — exchanges an authorization code for tokens (server-side only)
 *
 * All secrets are read from process.env — never from NEXT_PUBLIC_ vars.
 */

export type OAuthProvider = "meta" | "google" | "linkedin" | "tiktok";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  /** Seconds until access token expires; undefined if provider doesn't return this */
  expiresIn?: number;
  /** Any additional fields returned by provider (e.g. advertiser_ids) */
  extra?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// buildAuthUrl
// ---------------------------------------------------------------------------

/**
 * Returns the authorization URL to redirect the user to for OAuth consent.
 * Reads client IDs from server-side env vars.
 */
export function buildAuthUrl(
  provider: OAuthProvider,
  state: string,
  redirectUri: string
): string {
  switch (provider) {
    case "meta": {
      const clientId = process.env.META_APP_ID ?? "";
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: "ads_management,ads_read,business_management",
      });
      return `https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`;
    }

    case "google": {
      const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/adwords",
        state,
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    case "linkedin": {
      const clientId = process.env.LINKEDIN_CLIENT_ID ?? "";
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: "r_ads rw_ads",
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }

    case "tiktok": {
      const appId = process.env.TIKTOK_CLIENT_KEY ?? "";
      const params = new URLSearchParams({
        app_id: appId,
        redirect_uri: redirectUri,
        state,
        scope: "advertiser.read,campaign.read,campaign.write",
      });
      return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
    }

    default: {
      // TypeScript exhaustiveness check — runtime guard for unknown providers
      const _never: never = provider;
      throw new Error(`Unknown provider: ${String(_never)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// exchangeCode
// ---------------------------------------------------------------------------

/**
 * Exchanges an authorization code for access/refresh tokens.
 * Reads client secrets from server-side env vars.
 * Throws on network error or non-2xx response.
 */
export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<OAuthTokens> {
  switch (provider) {
    case "meta":
      return exchangeMeta(code, redirectUri);
    case "google":
      return exchangeGoogle(code, redirectUri);
    case "linkedin":
      return exchangeLinkedIn(code, redirectUri);
    case "tiktok":
      return exchangeTikTok(code, redirectUri);
    default: {
      const _never: never = provider;
      throw new Error(`Unknown provider: ${String(_never)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Per-provider token exchange implementations
// ---------------------------------------------------------------------------

async function exchangeMeta(code: string, redirectUri: string): Promise<OAuthTokens> {
  const clientId = process.env.META_APP_ID ?? "";
  const clientSecret = process.env.META_APP_SECRET ?? "";

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://graph.facebook.com/v25.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meta token exchange failed (HTTP ${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token?: string; token_type?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Meta token exchange: access_token missing in response");

  return {
    accessToken: data.access_token,
    // Meta long-lived tokens don't always return expires_in — fall back to 60 days
    expiresIn: data.expires_in ?? 60 * 24 * 3600,
  };
}

async function exchangeGoogle(code: string, redirectUri: string): Promise<OAuthTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (HTTP ${res.status}): ${errBody}`);
  }

  const data = await res.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!data.access_token) throw new Error("Google token exchange: access_token missing in response");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    // Google refresh tokens don't expire — we omit a ceiling here
  };
}

async function exchangeLinkedIn(code: string, redirectUri: string): Promise<OAuthTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? "";
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`LinkedIn token exchange failed (HTTP ${res.status}): ${errBody}`);
  }

  const data = await res.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("LinkedIn token exchange: access_token missing in response");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // LinkedIn tokens expire in ~60 days; use their value or fall back
    expiresIn: data.expires_in ?? 60 * 24 * 3600,
  };
}

async function exchangeTikTok(code: string, _redirectUri: string): Promise<OAuthTokens> {
  // TikTok token exchange does not require redirect_uri
  const appId = process.env.TIKTOK_CLIENT_KEY ?? "";
  const secret = process.env.TIKTOK_CLIENT_SECRET ?? "";

  const res = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, secret, auth_code: code }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`TikTok token exchange failed (HTTP ${res.status}): ${errBody}`);
  }

  const wrapper = await res.json() as {
    data?: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      advertiser_ids?: string[];
    };
  };
  const data = wrapper.data;
  if (!data?.access_token) throw new Error("TikTok token exchange: access_token missing in response");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // TikTok tokens are short-lived (~1 day); fall back to 86400s
    expiresIn: data.expires_in ?? 86400,
    extra: data.advertiser_ids ? { advertiser_ids: data.advertiser_ids } : undefined,
  };
}
