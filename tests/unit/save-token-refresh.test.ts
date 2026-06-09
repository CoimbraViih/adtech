import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks (must be hoisted before any import of the modules under test) ──

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/integrations/crypto", () => ({
  encrypt: vi.fn((v: string) => `enc(${v})`),
  decrypt: vi.fn((v: string) => v.replace(/^enc\(/, "").replace(/\)$/, "")),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { encrypt } from "@/lib/integrations/crypto";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a Supabase client mock that:
 *   - Supports a SELECT chain (maybeSingle) returning `selectData`
 *   - Supports an UPDATE chain returning `updateError`
 *
 * The mock differentiates SELECT vs UPDATE calls by tracking which method
 * was invoked first on the chain.
 */
function makeClientMock(
  selectData: { credentials: string } | null = null,
  updateError: unknown = null
) {
  const updateSpy = vi.fn();
  const eqSpy = vi.fn();

  // SELECT chain
  const selectChain: Record<string, unknown> = {};
  selectChain.select = vi.fn(() => selectChain);
  selectChain.eq = vi.fn((...args: unknown[]) => { eqSpy(...args); return selectChain; });
  selectChain.maybeSingle = vi.fn(async () => ({ data: selectData, error: null }));

  // UPDATE chain
  const updateChain: Record<string, unknown> = {};
  updateChain.update = vi.fn((payload: unknown) => { updateSpy(payload); return updateChain; });
  updateChain.eq = vi.fn((...args: unknown[]) => { eqSpy(...args); return updateChain; });
  updateChain.then = vi.fn(
    async (resolve: (v: { data: null; error: unknown }) => void) =>
      resolve({ data: null, error: updateError })
  );

  const fromMock = vi.fn((table: string) => {
    void table;
    // Return an object that has both select and update so the caller picks
    return {
      select: selectChain.select,
      update: updateChain.update,
      eq: vi.fn((...args: unknown[]) => { eqSpy(...args); return selectChain; }),
      maybeSingle: selectChain.maybeSingle,
    };
  });

  const client = { from: fromMock } as ReturnType<typeof createServiceClient>;
  vi.mocked(createServiceClient).mockReturnValue(client);

  return { updateSpy, eqSpy, fromMock };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("saveTokenRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a valid-looking 64-char hex key so crypto helpers don't throw
    // (even though encrypt is mocked, the real module is imported lazily and
    //  the env var is read at module-load time in some environments).
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  it("calls UPDATE with re-encrypted credentials blob containing the new access_token", async () => {
    // Existing credentials blob contains ad_account_id + old access_token.
    const existingJson = JSON.stringify({ ad_account_id: "act_123", access_token: "old-token" });
    // decrypt mock strips enc() wrapper, so stored value must look like enc(...)
    const { updateSpy } = makeClientMock({ credentials: `enc(${existingJson})` });

    const { saveTokenRefresh } = await import(
      "@/lib/integrations/credentials"
    );

    const expiresAt = new Date("2026-07-01T00:00:00.000Z");
    await saveTokenRefresh("org-1", "google", {
      accessToken: "new-access-token",
      expiresAt,
    });

    // encrypt must have been called (at minimum for the merged blob)
    expect(encrypt).toHaveBeenCalled();

    // UPDATE payload must contain 'credentials' (the re-encrypted blob) and
    // expires_at, NOT a bare 'access_token' column.
    const [[payload]] = vi.mocked(updateSpy).mock.calls as [[Record<string, unknown>]];
    expect(payload).toHaveProperty("credentials");
    expect(payload).toHaveProperty("expires_at", expiresAt.toISOString());
    expect(payload).not.toHaveProperty("access_token");
  });

  it("does NOT include refresh_token column in the UPDATE payload when omitted", async () => {
    makeClientMock(null);

    const { saveTokenRefresh } = await import(
      "@/lib/integrations/credentials"
    );

    await saveTokenRefresh("org-1", "meta", {
      accessToken: "new-access",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      // refreshToken intentionally absent
    });

    // updateSpy is not directly accessible here — check encrypt was called
    // for the merged blob but not for a separate refresh token.
    // encrypt call count: 1 (just the credentials blob)
    expect(vi.mocked(encrypt)).toHaveBeenCalledTimes(1);
  });

  it("includes encrypted refresh_token column in the UPDATE payload when provided", async () => {
    makeClientMock(null);

    const { saveTokenRefresh } = await import(
      "@/lib/integrations/credentials"
    );

    await saveTokenRefresh("org-1", "tiktok", {
      accessToken: "at-xyz",
      refreshToken: "rt-abc",
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    // encrypt should be called: 1 for the merged blob + 1 for the standalone
    // refresh_token column (mirror in migration 020)
    expect(vi.mocked(encrypt)).toHaveBeenCalledTimes(2);
  });

  it("persists expires_at as an ISO 8601 string", async () => {
    const { updateSpy } = makeClientMock(null);

    const { saveTokenRefresh } = await import(
      "@/lib/integrations/credentials"
    );

    const expiresAt = new Date("2026-12-31T23:59:59.000Z");
    await saveTokenRefresh("org-1", "linkedin", {
      accessToken: "token",
      expiresAt,
    });

    const [[payload]] = vi.mocked(updateSpy).mock.calls as [[Record<string, unknown>]];
    expect(payload.expires_at).toBe("2026-12-31T23:59:59.000Z");
  });

  it("throws when Supabase returns an error on UPDATE", async () => {
    makeClientMock(null, { message: "db constraint violation" });

    const { saveTokenRefresh } = await import(
      "@/lib/integrations/credentials"
    );

    await expect(
      saveTokenRefresh("org-1", "meta", {
        accessToken: "tok",
        expiresAt: new Date(),
      })
    ).rejects.toThrow("saveTokenRefresh failed for meta");
  });

  it("merges new access_token into existing credential fields without losing other fields", async () => {
    const existingJson = JSON.stringify({
      ad_account_id: "act_456",
      app_id: "my-app",
      access_token: "old-token",
    });
    const { updateSpy } = makeClientMock({ credentials: `enc(${existingJson})` });

    const { saveTokenRefresh } = await import(
      "@/lib/integrations/credentials"
    );

    await saveTokenRefresh("org-merge", "meta", {
      accessToken: "fresh-token",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
    });

    const [[payload]] = vi.mocked(updateSpy).mock.calls as [[Record<string, unknown>]];

    // The encrypted blob must encode a JSON that preserves ad_account_id + app_id
    // and updates access_token.  decrypt mock strips enc() so we can inspect.
    const encryptCalls = vi.mocked(encrypt).mock.calls;
    // First encrypt call is for the merged JSON blob
    const mergedJsonArg = encryptCalls[0][0] as string;
    const merged = JSON.parse(mergedJsonArg) as Record<string, string>;
    expect(merged.ad_account_id).toBe("act_456");
    expect(merged.app_id).toBe("my-app");
    expect(merged.access_token).toBe("fresh-token");
    expect(payload).toHaveProperty("credentials");
  });
});
