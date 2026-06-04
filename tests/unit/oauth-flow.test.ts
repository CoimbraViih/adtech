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
    [
      "META_APP_ID", "META_APP_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
      "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET",
    ].forEach((k) => delete process.env[k]);
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

  it("linkedin: returns accessToken and defaults to 60-day expiry when expires_in absent", async () => {
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
