/**
 * Unit tests for LinkedIn and Meta token-refresh helpers.
 *
 * Strategy: both modules depend on `getCredentialField` and `saveTokenRefresh`
 * from `@/lib/integrations/credentials`.  We mock the entire credentials module
 * so we can control what each field returns, and assert that `saveTokenRefresh`
 * is (or is not) called.
 *
 * The global `fetch` is replaced by a `vi.fn()` for each test that exercises
 * the HTTP exchange path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: vi.fn(),
  saveTokenRefresh: vi.fn(),
}));

import { getCredentialField, saveTokenRefresh } from "@/lib/integrations/credentials";

// Typed helpers
const mockGetField = vi.mocked(getCredentialField);
const mockSaveToken = vi.mocked(saveTokenRefresh);

// ── Shared constants ──────────────────────────────────────────────────────────

const ORG_ID = "org-test-123";

/** Returns an ISO string that is `offsetDays` from now. */
function daysFromNow(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────

describe("refreshLinkedInTokenIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when expires_at is null (manual token)", async () => {
    // expires_at field returns null → skip immediately.
    mockGetField.mockResolvedValue(null);

    const { refreshLinkedInTokenIfNeeded } = await import(
      "@/lib/linkedin/token-refresh"
    );
    await refreshLinkedInTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("does nothing when expires_at is more than 7 days away", async () => {
    // First call: expires_at field — 30 days from now (fresh).
    mockGetField.mockResolvedValueOnce(daysFromNow(30));

    const { refreshLinkedInTokenIfNeeded } = await import(
      "@/lib/linkedin/token-refresh"
    );
    await refreshLinkedInTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("performs refresh when expires_at is within 7 days", async () => {
    // Call order for getCredentialField:
    //  1. expires_at → within threshold (3 days)
    //  2. refresh_token
    //  3. client_id
    //  4. client_secret
    mockGetField
      .mockResolvedValueOnce(daysFromNow(3))        // expires_at
      .mockResolvedValueOnce("rt-linkedin-123")       // refresh_token
      .mockResolvedValueOnce("my-client-id")          // client_id
      .mockResolvedValueOnce("my-client-secret");     // client_secret

    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-li-access-token",
        refresh_token: "new-li-refresh-token",
        expires_in: 5184000, // 60 days
      }),
    } as Response);

    const { refreshLinkedInTokenIfNeeded } = await import(
      "@/lib/linkedin/token-refresh"
    );
    await refreshLinkedInTokenIfNeeded(ORG_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.linkedin.com/oauth/v2/accessToken",
      expect.objectContaining({ method: "POST" })
    );

    expect(mockSaveToken).toHaveBeenCalledOnce();
    const [orgArg, providerArg, dataArg] = mockSaveToken.mock.calls[0];
    expect(orgArg).toBe(ORG_ID);
    expect(providerArg).toBe("linkedin");
    expect(dataArg.accessToken).toBe("new-li-access-token");
    expect(dataArg.refreshToken).toBe("new-li-refresh-token");
    expect(dataArg.expiresAt).toBeInstanceOf(Date);
  });

  it("skips refresh when refresh_token is absent (manual token)", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(1))  // expires_at — within threshold
      .mockResolvedValueOnce(null)             // refresh_token → absent
      .mockResolvedValueOnce("client-id")
      .mockResolvedValueOnce("client-secret");

    const { refreshLinkedInTokenIfNeeded } = await import(
      "@/lib/linkedin/token-refresh"
    );
    await refreshLinkedInTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("skips refresh when client_id is absent", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(1))   // expires_at
      .mockResolvedValueOnce("rt-token")        // refresh_token
      .mockResolvedValueOnce(null)              // client_id → absent
      .mockResolvedValueOnce("client-secret");

    const { refreshLinkedInTokenIfNeeded } = await import(
      "@/lib/linkedin/token-refresh"
    );
    await refreshLinkedInTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("throws a descriptive error when the LinkedIn endpoint returns non-ok", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(2))
      .mockResolvedValueOnce("rt-token")
      .mockResolvedValueOnce("client-id")
      .mockResolvedValueOnce("client-secret");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as Response);

    const { refreshLinkedInTokenIfNeeded } = await import(
      "@/lib/linkedin/token-refresh"
    );

    await expect(refreshLinkedInTokenIfNeeded(ORG_ID)).rejects.toThrow(
      "LinkedIn token refresh failed:"
    );
  });
});

// ── Meta ──────────────────────────────────────────────────────────────────────

describe("refreshMetaTokenIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when expires_at is null (System User token)", async () => {
    mockGetField.mockResolvedValue(null);

    const { refreshMetaTokenIfNeeded } = await import(
      "@/lib/meta/token-refresh"
    );
    await refreshMetaTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("does nothing when expires_at is more than 7 days away", async () => {
    mockGetField.mockResolvedValueOnce(daysFromNow(30));

    const { refreshMetaTokenIfNeeded } = await import(
      "@/lib/meta/token-refresh"
    );
    await refreshMetaTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("skips refresh when app_id is absent", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(3))   // expires_at
      .mockResolvedValueOnce("current-token")   // access_token
      .mockResolvedValueOnce(null)              // app_id → absent
      .mockResolvedValueOnce("app-secret");

    const { refreshMetaTokenIfNeeded } = await import(
      "@/lib/meta/token-refresh"
    );
    await refreshMetaTokenIfNeeded(ORG_ID);

    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("performs refresh and saves with calculated expiresAt when expires_in is present", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(2))        // expires_at
      .mockResolvedValueOnce("short-lived-token")    // access_token
      .mockResolvedValueOnce("my-app-id")            // app_id
      .mockResolvedValueOnce("my-app-secret");       // app_secret

    const expiresIn = 5184000; // 60 days in seconds
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "long-lived-meta-token",
        token_type: "bearer",
        expires_in: expiresIn,
      }),
    } as Response);

    const before = Date.now();

    const { refreshMetaTokenIfNeeded } = await import(
      "@/lib/meta/token-refresh"
    );
    await refreshMetaTokenIfNeeded(ORG_ID);

    const after = Date.now();

    expect(mockSaveToken).toHaveBeenCalledOnce();
    const [orgArg, providerArg, dataArg] = mockSaveToken.mock.calls[0];
    expect(orgArg).toBe(ORG_ID);
    expect(providerArg).toBe("meta");
    expect(dataArg.accessToken).toBe("long-lived-meta-token");
    // expiresAt should be approximately now + expires_in seconds
    const expectedLow = new Date(before + expiresIn * 1000);
    const expectedHigh = new Date(after + expiresIn * 1000);
    expect(dataArg.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedLow.getTime());
    expect(dataArg.expiresAt.getTime()).toBeLessThanOrEqual(expectedHigh.getTime());
    // Meta fb_exchange_token flow does NOT send a refresh token.
    expect(dataArg.refreshToken).toBeUndefined();
  });

  it("uses 60-day fallback when expires_in is absent in response", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(5))
      .mockResolvedValueOnce("short-token")
      .mockResolvedValueOnce("app-id")
      .mockResolvedValueOnce("app-secret");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "fallback-token",
        token_type: "bearer",
        // expires_in intentionally absent
      }),
    } as Response);

    const before = Date.now();

    const { refreshMetaTokenIfNeeded } = await import(
      "@/lib/meta/token-refresh"
    );
    await refreshMetaTokenIfNeeded(ORG_ID);

    const after = Date.now();

    expect(mockSaveToken).toHaveBeenCalledOnce();
    const [, , dataArg] = mockSaveToken.mock.calls[0];
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    expect(dataArg.expiresAt.getTime()).toBeGreaterThanOrEqual(before + sixtyDaysMs);
    expect(dataArg.expiresAt.getTime()).toBeLessThanOrEqual(after + sixtyDaysMs);
  });

  it("throws a descriptive error when Meta endpoint returns non-ok", async () => {
    mockGetField
      .mockResolvedValueOnce(daysFromNow(1))
      .mockResolvedValueOnce("old-token")
      .mockResolvedValueOnce("app-id")
      .mockResolvedValueOnce("app-secret");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"Invalid OAuth token"}}',
    } as Response);

    const { refreshMetaTokenIfNeeded } = await import(
      "@/lib/meta/token-refresh"
    );

    await expect(refreshMetaTokenIfNeeded(ORG_ID)).rejects.toThrow(
      "Meta token refresh failed:"
    );
  });
});

// ── Integration: errors are swallowed with console.warn in clients ────────────

describe("refresh errors are swallowed in client credential getters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("LinkedIn client does not propagate a refresh error", async () => {
    // Make getCredentialField always return null so refreshLinkedInTokenIfNeeded
    // bails early (expires_at null) — we just need the import to succeed and
    // no throw to bubble through getLinkedInCredentials when refresh fails.
    // We simulate the failure path by mocking the token-refresh module itself.

    vi.doMock("@/lib/linkedin/token-refresh", () => ({
      refreshLinkedInTokenIfNeeded: vi.fn().mockRejectedValue(
        new Error("LinkedIn token refresh failed: 401 Unauthorized")
      ),
    }));

    // getCredentialField returns null → throws "não configurado" inside the
    // client, but NOT the refresh error.  That confirms the try/catch works.
    mockGetField.mockResolvedValue(null);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { getLinkedInCredentials: _unused, listLinkedInCampaigns } = await import(
      "@/lib/linkedin/client"
    );

    await expect(listLinkedInCampaigns(ORG_ID)).rejects.toThrow(
      "LinkedIn Access Token não configurado"
    );

    // The refresh error must have been logged via console.warn, not re-thrown.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[linkedin] token refresh skipped:"),
      expect.stringContaining("LinkedIn token refresh failed:")
    );
  });

  it("Meta client does not propagate a refresh error", async () => {
    vi.doMock("@/lib/meta/token-refresh", () => ({
      refreshMetaTokenIfNeeded: vi.fn().mockRejectedValue(
        new Error("Meta token refresh failed: 400 Bad Request")
      ),
    }));

    mockGetField.mockResolvedValue(null);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { listMetaCampaigns } = await import("@/lib/meta/client");

    await expect(listMetaCampaigns(ORG_ID)).rejects.toThrow(
      "Meta Ads Access Token não configurado"
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[meta] token refresh skipped:"),
      expect.stringContaining("Meta token refresh failed:")
    );
  });
});
