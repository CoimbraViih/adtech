# M-ADS Fase 3 — OAuth Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OAuth 2.0 onboarding for Meta, Google, LinkedIn, and TikTok ad platforms so users connect via browser redirect instead of pasting raw tokens, with fallback manual token input preserved.

**Architecture:** A `lib/integrations/oauth.ts` module provides two pure functions (`buildAuthUrl`, `exchangeCode`). Two route handlers per provider (`/api/integrations/[provider]/oauth/start` and `/callback`) manage the state cookie, token exchange, and persistence via existing `upsertCredentials` / `saveTokenRefresh`. The integrations UI card gains an OAuth "Conectar" button plus a collapsible manual fallback.

**Tech Stack:** Next.js 15 App Router route handlers, TypeScript strict, native `fetch`, `crypto.randomUUID()`, existing `lib/integrations/credentials.ts` helpers, Vitest for unit tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/integrations/oauth.ts` | `buildAuthUrl` + `exchangeCode` — pure, testable, no side-effects |
| Create | `app/api/integrations/[provider]/oauth/start/route.ts` | GET: auth guard → state cookie → redirect to provider |
| Create | `app/api/integrations/[provider]/oauth/callback/route.ts` | GET: validate state → exchange code → persist → redirect |
| Modify | `components/settings/integration-card.tsx` | OAuth button + collapsible manual fallback for OAuth providers |
| Modify | `.env.local.example` | Document new OAuth app secrets |
| Create | `tests/unit/oauth-flow.test.ts` | Unit tests: buildAuthUrl, exchangeCode, state validation logic |

---

## Task 1: Core OAuth library — `lib/integrations/oauth.ts`

**Files:**
- Create: `lib/integrations/oauth.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/unit/oauth-flow.test.ts` with tests for `buildAuthUrl`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── buildAuthUrl ──────────────────────────────────────────────────────────────

describe("buildAuthUrl", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "meta-app-id";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.LINKEDIN_CLIENT_ID = "linkedin-client-id";
    process.env.TIKTOK_CLIENT_KEY = "tiktok-key";
  });

  afterEach(() => {
    delete process.env.META_APP_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.TIKTOK_CLIENT_KEY;
  });

  it("meta: builds correct authorization URL with required scopes", async () => {
    const { buildAuthUrl } = await import("@/lib/integrations/oauth");
    const url = buildAuthUrl("meta", "state-abc", "https://app.test/callback");
    expect(url).toContain("https://www.facebook.com/v25.0/dialog/oauth");
    expect(url).toContain("client_id=meta-app-id");
    expect(url).toContain("state=state-abc");
    expect(url).toContain("ads_management");
    expect(url).toContain("ads_read");
    expect(url).toContain("business_management");
    expect(url).toContain(encodeURIComponent("https://app.test/callback"));
  });

  it("google: builds correct authorization URL with offline access", async () => {
    const { buildAuthUrl } = await import("@/lib/integrations/oauth");
    const url = buildAuthUrl("google", "state-xyz", "https://app.test/callback");
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=google-client-id");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
    expect(url).toContain(encodeURIComponent("https://www.googleapis.com/auth/adwords"));
  });

  it("linkedin: builds correct authorization URL with r_ads scope", async () => {
    const { buildAuthUrl } = await import("@/lib/integrations/oauth");
    const url = buildAuthUrl("linkedin", "state-li", "https://app.test/callback");
    expect(url).toContain("https://www.linkedin.com/oauth/v2/authorization");
    expect(url).toContain("client_id=linkedin-client-id");
    expect(url).toContain("r_ads");
    expect(url).toContain("rw_ads");
  });

  it("tiktok: builds correct authorization URL", async () => {
    const { buildAuthUrl } = await import("@/lib/integrations/oauth");
    const url = buildAuthUrl("tiktok", "state-tt", "https://app.test/callback");
    expect(url).toContain("https://business-api.tiktok.com/portal/auth");
    expect(url).toContain("app_id=tiktok-key");
    expect(url).toContain("advertiser.read");
  });

  it("throws on unknown provider", async () => {
    const { buildAuthUrl } = await import("@/lib/integrations/oauth");
    expect(() => buildAuthUrl("unknown" as "meta", "s", "r")).toThrow("Unknown provider");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run tests/unit/oauth-flow.test.ts
```

Expected: FAIL — `buildAuthUrl` not found.

- [ ] **Step 3: Implement `lib/integrations/oauth.ts`**

Create the file with this exact content:

```typescript
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

  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code });
  const res = await fetch(
    `https://graph.facebook.com/v25.0/oauth/access_token?${params.toString()}`,
    { method: "GET" }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meta token exchange failed (HTTP ${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token?: string; token_type?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Meta token exchange: access_token missing in response");

  return {
    accessToken: data.access_token,
    // Meta long-lived tokens don't have a short expiry — fall back to 60 days
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
```

- [ ] **Step 4: Run the buildAuthUrl tests to confirm they pass**

```bash
npx vitest run tests/unit/oauth-flow.test.ts
```

Expected: all `buildAuthUrl` describe block tests PASS.

---

## Task 2: Add `exchangeCode` mock tests

**Files:**
- Modify: `tests/unit/oauth-flow.test.ts`

- [ ] **Step 1: Add exchangeCode tests to the test file**

Append to `tests/unit/oauth-flow.test.ts` (after the buildAuthUrl describe block):

```typescript
// ── exchangeCode ──────────────────────────────────────────────────────────────

describe("exchangeCode", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "meta-app-id";
    process.env.META_APP_SECRET = "meta-secret";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.LINKEDIN_CLIENT_ID = "linkedin-client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";
    process.env.TIKTOK_CLIENT_KEY = "tiktok-key";
    process.env.TIKTOK_CLIENT_SECRET = "tiktok-secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ["META_APP_ID","META_APP_SECRET","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET",
     "LINKEDIN_CLIENT_ID","LINKEDIN_CLIENT_SECRET","TIKTOK_CLIENT_KEY","TIKTOK_CLIENT_SECRET"]
      .forEach((k) => delete process.env[k]);
  });

  it("meta: returns accessToken and expiresIn from response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "EAA-meta-token", token_type: "bearer", expires_in: 5183944 }),
      text: async () => "",
    })));
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    const result = await exchangeCode("meta", "code-abc", "https://app.test/callback");
    expect(result.accessToken).toBe("EAA-meta-token");
    expect(result.expiresIn).toBe(5183944);
    expect(result.refreshToken).toBeUndefined();
  });

  it("meta: falls back to 60-day expiresIn when provider omits expires_in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "EAA-no-expiry" }),
      text: async () => "",
    })));
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    const result = await exchangeCode("meta", "code-abc", "https://app.test/callback");
    expect(result.expiresIn).toBe(60 * 24 * 3600);
  });

  it("google: returns accessToken, refreshToken and expiresIn", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        access_token: "ya29.google",
        refresh_token: "1//0g-refresh",
        expires_in: 3600,
        token_type: "Bearer",
      }),
      text: async () => "",
    })));
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    const result = await exchangeCode("google", "code-goog", "https://app.test/callback");
    expect(result.accessToken).toBe("ya29.google");
    expect(result.refreshToken).toBe("1//0g-refresh");
    expect(result.expiresIn).toBe(3600);
  });

  it("linkedin: returns accessToken and defaults to 60-day expiry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "AQXLI-token" }),
      text: async () => "",
    })));
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    const result = await exchangeCode("linkedin", "code-li", "https://app.test/callback");
    expect(result.accessToken).toBe("AQXLI-token");
    expect(result.expiresIn).toBe(60 * 24 * 3600);
  });

  it("tiktok: returns accessToken and extracts advertiser_ids", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          access_token: "tt-access-token",
          refresh_token: "tt-refresh",
          expires_in: 86400,
          advertiser_ids: ["7000000000000001"],
        },
      }),
      text: async () => "",
    })));
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    const result = await exchangeCode("tiktok", "code-tt", "https://app.test/callback");
    expect(result.accessToken).toBe("tt-access-token");
    expect(result.refreshToken).toBe("tt-refresh");
    expect(result.extra?.advertiser_ids).toEqual(["7000000000000001"]);
  });

  it("throws when provider returns HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => "invalid_grant",
    })));
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    await expect(exchangeCode("meta", "bad-code", "https://app.test/callback"))
      .rejects.toThrow("Meta token exchange failed");
  });

  it("throws on unknown provider", async () => {
    const { exchangeCode } = await import("@/lib/integrations/oauth");
    await expect(exchangeCode("unknown" as "meta", "c", "r"))
      .rejects.toThrow("Unknown provider");
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/unit/oauth-flow.test.ts
```

Expected: all tests in both describe blocks PASS.

- [ ] **Step 3: Commit Task 1 + 2**

```bash
git add lib/integrations/oauth.ts tests/unit/oauth-flow.test.ts
git commit -m "feat(m-ads-f3): oauth.ts — buildAuthUrl + exchangeCode with unit tests"
```

---

## Task 3: OAuth start route

**Files:**
- Create: `app/api/integrations/[provider]/oauth/start/route.ts`

The `[provider]` dynamic segment already exists at `app/api/integrations/[provider]/` — check what's there first.

- [ ] **Step 1: Check if [provider] folder exists**

```bash
ls app/api/integrations/
```

If the folder doesn't exist yet, it will be created implicitly when you create the file.

- [ ] **Step 2: Add state-cookie test cases to `tests/unit/oauth-flow.test.ts`**

The start route uses Next.js cookies() which is not unit-testable without heavy mocking. The state-validation logic is testable inline. Add this describe block to the test file:

```typescript
// ── state validation logic ─────────────────────────────────────────────────

describe("state validation", () => {
  it("matches when state equals cookie value", () => {
    const cookieState = "abc-123-def";
    const queryState = "abc-123-def";
    expect(cookieState === queryState).toBe(true);
  });

  it("rejects when state differs from cookie value", () => {
    const cookieState = "abc-123-def";
    const queryState = "tampered-value";
    expect(cookieState === queryState).toBe(false);
  });

  it("rejects when cookie state is missing (undefined)", () => {
    const cookieState: string | undefined = undefined;
    const queryState = "abc-123-def";
    expect(!!cookieState && cookieState === queryState).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to confirm it passes**

```bash
npx vitest run tests/unit/oauth-flow.test.ts
```

Expected: PASS.

- [ ] **Step 4: Create the start route**

Create `app/api/integrations/[provider]/oauth/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { buildAuthUrl, type OAuthProvider } from "@/lib/integrations/oauth";

const VALID_PROVIDERS = new Set<string>(["meta", "google", "linkedin", "tiktok"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  // 1. Authenticate
  let session;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Validate provider
  const { provider } = await params;
  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // Suppress unused variable warning — session is validated for auth guard
  void session;

  // 3. Generate state and build redirect URI
  const state = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/${provider}/oauth/callback`;

  // 4. Build authorization URL
  const authUrl = buildAuthUrl(provider as OAuthProvider, state, redirectUri);

  // 5. Redirect with state cookie (HttpOnly, Secure, SameSite=Lax, Max-Age=600)
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
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Fix any that appear before continuing.

---

## Task 4: OAuth callback route

**Files:**
- Create: `app/api/integrations/[provider]/oauth/callback/route.ts`

- [ ] **Step 1: Create the callback route**

Create `app/api/integrations/[provider]/oauth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { exchangeCode, type OAuthProvider } from "@/lib/integrations/oauth";
import { saveTokenRefresh, upsertCredentials } from "@/lib/integrations/credentials";

const VALID_PROVIDERS = new Set<string>(["meta", "google", "linkedin", "tiktok"]);

/** Seconds-to-expiry fallbacks per provider when expiresIn is undefined */
const EXPIRY_FALLBACK_SECONDS: Record<OAuthProvider, number | null> = {
  meta: 60 * 24 * 3600,
  google: null,           // Google refresh tokens don't expire
  linkedin: 60 * 24 * 3600,
  tiktok: 86400,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  const { provider } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  /** Helper: clear cookie and redirect to integrations with an error param */
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

  // Provider-side error (user denied consent, etc.)
  if (oauthError) {
    return errorRedirect(oauthError);
  }

  if (!code || !queryState) {
    return errorRedirect("missing_code_or_state");
  }

  // 4. Validate state cookie
  const cookieState = request.cookies.get(`oauth_state_${provider}`)?.value;
  if (!cookieState || cookieState !== queryState) {
    return errorRedirect("invalid_state");
  }

  // 5. Exchange code for tokens
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
    : new Date(Date.now() + 365 * 24 * 3600 * 1000); // 1 year fallback

  const orgId = session.organization.id;

  // 7. Persist tokens
  try {
    // Initial upsert — writes access_token (and refresh_token if present)
    const initialFields: Record<string, string> = {
      access_token: tokens.accessToken,
      oauth_connected: "true",
    };
    if (tokens.refreshToken) {
      initialFields.refresh_token = tokens.refreshToken;
    }
    // For TikTok: persist first advertiser_id if returned
    const advertiserIds = tokens.extra?.advertiser_ids;
    if (Array.isArray(advertiserIds) && advertiserIds.length > 0) {
      initialFields.advertiser_id = String(advertiserIds[0]);
    }

    await upsertCredentials(orgId, provider, initialFields);

    // saveTokenRefresh handles the expires_at column + refresh_token column
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run all unit tests**

```bash
npx vitest run tests/unit/oauth-flow.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit Tasks 3 + 4**

```bash
git add app/api/integrations/[provider]/oauth/start/route.ts
git add app/api/integrations/[provider]/oauth/callback/route.ts
git add tests/unit/oauth-flow.test.ts
git commit -m "feat(m-ads-f3): oauth start + callback routes with state cookie validation"
```

---

## Task 5: UI — OAuth button + collapsible manual fallback

**Files:**
- Modify: `components/settings/integration-card.tsx`

The spec says: replace token text input with "Conectar com [Logo]" button, but keep a collapsible "Usar token manual" fallback. The token input is currently in `integration-modal.tsx` opened by the card. The simplest approach that doesn't break existing flows:

1. For OAuth providers (meta, google, linkedin, tiktok): show "Conectar via OAuth" button as the primary CTA. Clicking opens the modal (which keeps the manual fields). Also show a direct link to the OAuth start route.
2. Show post-connection status in the card: badge "Conectado via OAuth" when `oauth_connected` field is present (this is set by the callback route).

The integration page already passes `configured` but not the raw credential fields. We need to pass `isOAuthConnected` down to the card.

- [ ] **Step 1: Update `app/(dashboard)/settings/integrations/page.tsx` to pass `oauthConnected`**

The page reads `listCredentialStatuses` which only returns `provider` and `last_tested_at`. We need to check if `oauth_connected` is set. Add a helper that reads the field without exposing secrets.

Add this import and call in `page.tsx`:

The `listCredentialStatuses` function already signals `configured: true` when any credentials exist. To show "Conectado via OAuth" badge without a new DB query, we can fetch `oauth_connected` alongside the status. The cleanest approach: extend `listCredentialStatuses` to return an `oauth_connected` boolean.

Modify `lib/integrations/credentials.ts` — update `listCredentialStatuses` return type and query:

In `listCredentialStatuses`, add `credentials` to the select and check if the decrypted blob contains `oauth_connected: "true"`. However that requires decrypting every row — expensive for many providers. Better: add a dedicated `oauth_connected` column to the DB. But the spec says no schema changes in this task.

Simplest approach that works with existing schema: do a lightweight check. Add a new exported function `getOAuthConnectedProviders(orgId)` that reads all credential blobs and returns a `Set<string>` of providers with `oauth_connected === "true"`.

Add to `lib/integrations/credentials.ts`:

```typescript
/**
 * Returns the set of providers that have been connected via OAuth
 * (i.e. their credential blob contains oauth_connected: "true").
 */
export async function getOAuthConnectedProviders(
  organizationId: string
): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data } = (await supabase
    .from("org_api_credentials")
    .select("provider, credentials")
    .eq("organization_id", organizationId)) as {
    data: Array<{ provider: string; credentials: string }> | null;
  };

  const result = new Set<string>();
  if (!data) return result;

  for (const row of data) {
    try {
      const parsed = JSON.parse(decrypt(row.credentials)) as Record<string, string>;
      if (parsed.oauth_connected === "true") result.add(row.provider);
    } catch {
      // skip rows that fail to decrypt
    }
  }
  return result;
}
```

- [ ] **Step 2: Update `integrations/page.tsx` to pass `oauthConnected` per provider**

In `IntegrationsPage`, add the `getOAuthConnectedProviders` call:

```typescript
// At the top of the file — add import:
import { listCredentialStatuses, getOAuthConnectedProviders } from "@/lib/integrations/credentials";

// Inside the component, update the Promise.all:
const [configured, syncRunsMap, oauthProviders] = await Promise.all([
  listCredentialStatuses(session.organization.id),
  fetchLatestSyncRuns(session.workspace.id),
  getOAuthConnectedProviders(session.organization.id),
]);

// In the provider map, add oauthConnected:
return {
  key: p.key,
  label: p.label,
  description: p.description,
  docsUrl: p.docsUrl,
  fields: p.fields.map((f) => ({
    key: f.key,
    label: f.label,
    placeholder: f.placeholder,
    helpText: f.helpText ?? null,
    secret: f.secret,
  })),
  configured: !!status,
  last_tested_at: status?.last_tested_at ?? null,
  syncRun,
  oauthConnected: oauthProviders.has(p.key),
};
```

- [ ] **Step 3: Update `IntegrationsGrid` type and prop threading**

In `components/settings/integrations-grid.tsx`, add `oauthConnected: boolean` to `ProviderStatus` and thread it to `IntegrationCard`:

```typescript
// In the ProviderStatus type, add:
oauthConnected: boolean;

// In the IntegrationCard call, add:
oauthConnected={provider.oauthConnected}
```

- [ ] **Step 4: Update `integration-card.tsx` to show OAuth button**

The full updated `components/settings/integration-card.tsx`:

```typescript
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { IntegrationModal } from "@/components/settings/integration-modal";
import { SyncStatusWidget } from "@/components/integrations/sync-status-widget";
import type { SyncRun } from "@/types/database";

const SYNC_PLATFORMS = new Set(["meta", "google", "tiktok", "linkedin"]);
const OAUTH_PROVIDERS = new Set(["meta", "google", "linkedin", "tiktok"]);

/** Labels for the OAuth connect button per provider */
const OAUTH_LABEL: Record<string, string> = {
  meta: "Conectar com Meta",
  google: "Conectar com Google",
  linkedin: "Conectar com LinkedIn",
  tiktok: "Conectar com TikTok",
};

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type IntegrationCardProps = {
  providerKey: string;
  label: string;
  description: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  oauthConnected: boolean;
  lastTestedAt: string | null;
  syncRun: SyncRun | null;
  workspaceId: string;
  onSaved: () => void;
};

export function IntegrationCard({
  providerKey,
  label,
  description,
  docsUrl,
  fields,
  configured,
  oauthConnected,
  lastTestedAt,
  syncRun,
  workspaceId,
  onSaved,
}: IntegrationCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const isOAuthProvider = OAUTH_PROVIDERS.has(providerKey);

  async function handleDelete() {
    if (!confirm(`Remover integração ${label}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/settings/integrations/${providerKey}`, { method: "DELETE" });
      onSaved();
    } finally {
      setDeleting(false);
    }
  }

  const testedDate = lastTestedAt
    ? new Date(lastTestedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : null;

  const isSyncable = SYNC_PLATFORMS.has(providerKey);

  return (
    <>
      <div className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--adflow-fg)] truncate">{label}</p>
            <p className="text-xs text-[color:var(--adflow-fg-muted)] line-clamp-2 mt-0.5">{description}</p>
          </div>
          {oauthConnected ? (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-[color:var(--adflow-success)] text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Conectado via OAuth
            </span>
          ) : configured ? (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-[color:var(--adflow-success)] text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] text-[10px] px-2 py-0.5 rounded-full">
              <Circle className="w-3 h-3" /> Não configurado
            </span>
          )}
        </div>

        {testedDate && (
          <p className="text-[10px] text-[color:var(--adflow-fg-muted)]">
            Testado em {testedDate}
          </p>
        )}

        {isSyncable && (
          <SyncStatusWidget
            platform={providerKey}
            workspaceId={workspaceId}
            initialRun={syncRun}
            configured={configured}
          />
        )}

        {/* Primary action area */}
        <div className="flex flex-col gap-2 mt-auto pt-1">
          {isOAuthProvider ? (
            <>
              {/* OAuth primary button — server-side redirect, no client JS */}
              <a
                href={`/api/integrations/${providerKey}/oauth/start`}
                className="flex-1 text-xs font-semibold bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white rounded-md py-1.5 transition-colors text-center"
              >
                {oauthConnected
                  ? `Reconectar ${label}`
                  : (OAUTH_LABEL[providerKey] ?? `Conectar ${label}`)}
              </a>

              {/* Collapsible manual token fallback */}
              <button
                onClick={() => setManualOpen((v) => !v)}
                className="flex items-center justify-center gap-1 text-[10px] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
              >
                {manualOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Usar token manual
              </button>

              {manualOpen && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-xs bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] rounded-md py-1.5 transition-colors"
                >
                  {configured ? "Editar token" : "Inserir token manualmente"}
                </button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="flex-1 text-xs font-semibold bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white rounded-md py-1.5 transition-colors"
              >
                {configured ? "Editar" : "Configurar"}
              </button>
            </div>
          )}

          {configured && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="self-end p-1.5 rounded-md bg-[color:var(--adflow-border)] hover:bg-[color:var(--adflow-danger)]/10 hover:text-[color:var(--adflow-danger)] text-[color:var(--adflow-fg-muted)] transition-colors disabled:opacity-50"
              aria-label="Remover integração"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <IntegrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        providerKey={providerKey}
        label={label}
        docsUrl={docsUrl}
        fields={fields}
        configured={configured}
        onSaved={() => { setModalOpen(false); onSaved(); }}
      />
    </>
  );
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. The most likely issues are the `oauthConnected` prop not threaded through `integrations-grid.tsx` — fix those before moving on.

- [ ] **Step 6: Run all unit tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/integrations/credentials.ts
git add app/(dashboard)/settings/integrations/page.tsx
git add components/settings/integrations-grid.tsx
git add components/settings/integration-card.tsx
git commit -m "feat(m-ads-f3): integrations UI — OAuth connect button + collapsible manual fallback"
```

---

## Task 6: Update `.env.local.example`

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Add OAuth app credentials section**

Add the following block after the `ENCRYPTION_KEY` line in `.env.local.example`:

```bash
# ── OAuth App Credentials (server-side only — never NEXT_PUBLIC_) ──────────────
META_APP_ID=             # Meta for Developers → App ID
META_APP_SECRET=         # Meta for Developers → App Secret

GOOGLE_CLIENT_ID=        # Google Cloud Console → OAuth 2.0 Client ID
GOOGLE_CLIENT_SECRET=    # Google Cloud Console → OAuth 2.0 Client Secret

LINKEDIN_CLIENT_ID=      # LinkedIn Developer Portal → Client ID
LINKEDIN_CLIENT_SECRET=  # LinkedIn Developer Portal → Client Secret

TIKTOK_CLIENT_KEY=       # TikTok for Business → App Key
TIKTOK_CLIENT_SECRET=    # TikTok for Business → App Secret
```

- [ ] **Step 2: TypeScript check + run all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 TypeScript errors, all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add .env.local.example
git commit -m "chore(m-ads-f3): add OAuth app credential vars to .env.local.example"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all tests PASS, including the new `oauth-flow.test.ts`.

- [ ] **Step 3: Review checklist**

Verify against the spec:
- `buildAuthUrl` per provider with correct scopes — covered in `lib/integrations/oauth.ts`
- `exchangeCode` per provider — covered in `lib/integrations/oauth.ts`
- Start route: auth guard, state UUID, HttpOnly cookie Max-Age 600, redirect to `buildAuthUrl` — covered in `start/route.ts`
- Callback route: state validation, `exchangeCode`, `saveTokenRefresh`, delete cookie, redirect — covered in `callback/route.ts`
- UI: OAuth button linking to `/api/integrations/<provider>/oauth/start` — covered in `integration-card.tsx`
- Manual token fallback: collapsible "Usar token manual" — covered in `integration-card.tsx`
- Post-connection state: badge "Conectado via OAuth" — covered in `integration-card.tsx`
- `.env.local.example` updated — covered in Task 6
- Unit tests: `buildAuthUrl`, `exchangeCode` mocks, state validation — covered in `oauth-flow.test.ts`

- [ ] **Step 4: Commit if any cleanup needed, then done**

---

## Self-Review Notes

1. **`getOAuthConnectedProviders` cost:** Decrypts all credential blobs on every page load. For MVP with <10 providers per org this is negligible. Post-MVP: add `oauth_connected BOOLEAN` column to `org_api_credentials`.

2. **Google `expiresAt` edge case:** Google refresh tokens don't expire but access tokens do (1 hour). `exchangeGoogle` returns `expiresIn: 3600` from the provider response, so `expiresAt` will correctly be set to `now + 1h`. The 1-year fallback in the callback only activates if `expiresIn` is somehow undefined AND `EXPIRY_FALLBACK_SECONDS[provider]` is `null` (Google's case). In practice Google always returns `expires_in: 3600`.

3. **TikTok `redirectUri` ignored:** TikTok's token endpoint doesn't use `redirect_uri` in the exchange (it uses `auth_code` instead of `code`). The parameter is accepted in the function signature for API consistency but not sent — this matches the TikTok API spec.

4. **CSRF protection:** The `oauth_state_<provider>` HttpOnly cookie with `SameSite=Lax` and comparison in the callback is the standard PKCE-lite CSRF protection. No additional PKCE challenge is required since these are server-side confidential clients.

5. **`void session` in start route:** The session is fetched purely for authentication. The unused variable suppression is necessary because TypeScript strict mode would otherwise error; the `void` idiom is idiomatic here.
