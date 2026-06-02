/**
 * Unit tests for Onda 3E — batch insights functions and sync_runs recording.
 *
 * All external network calls (fetchWithRetry, getCredentialField) and the
 * Supabase service client are mocked so tests are fully offline.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted: declare mocks before any module is loaded ─────────────────────
// vi.mock factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted via vi.hoisted().

const { mockInsert, mockFrom } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockFrom };
});

// ── shared fetch mock ─────────────────────────────────────────────────────────

vi.mock("@/lib/integrations/fetch-retry", () => ({
  fetchWithRetry: vi.fn(),
}));

// ── credential mock: always returns a non-empty string ────────────────────────

vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: vi.fn().mockResolvedValue("test-value"),
}));

// ── Meta token refresh (no-op in tests) ──────────────────────────────────────

vi.mock("@/lib/meta/token-refresh", () => ({
  refreshMetaTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

// ── LinkedIn token refresh (no-op in tests) ───────────────────────────────────

vi.mock("@/lib/linkedin/token-refresh", () => ({
  refreshLinkedInTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

// ── Supabase service client mock ──────────────────────────────────────────────

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn().mockReturnValue({ from: mockFrom }),
}));

// ── imports after mocks ───────────────────────────────────────────────────────

import { fetchWithRetry } from "@/lib/integrations/fetch-retry";
import { getMetaAccountInsights } from "@/lib/meta/client";
import { getTikTokBatchInsights } from "@/lib/tiktok/client";
import { getLinkedInAccountInsights } from "@/lib/linkedin/client";
import { getGoogleAccountMetrics } from "@/lib/google/client";
import { syncCampaignsFromPlatform } from "@/lib/campaigns/sync";

const mockFetch = vi.mocked(fetchWithRetry);

// ── helpers ───────────────────────────────────────────────────────────────────

function makeJsonResponse(body: unknown, status = 200): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Meta: getMetaAccountInsights ──────────────────────────────────────────────

describe("getMetaAccountInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("makes exactly 1 API call and returns insights keyed by campaign_id", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            campaign_id: "camp_001",
            spend: "150.00",
            impressions: "10000",
            clicks: "300",
            actions: [{ action_type: "purchase", value: "15" }],
            purchase_roas: [{ action_type: "omni_purchase", value: "3.5" }],
            date_start: "2026-05-01",
            date_stop: "2026-05-31",
          },
          {
            campaign_id: "camp_002",
            spend: "80.00",
            impressions: "5000",
            clicks: "100",
            date_start: "2026-05-01",
            date_stop: "2026-05-31",
          },
        ],
        paging: {},
      })
    );

    const result = await getMetaAccountInsights("org-123", { datePreset: "last_30d" });

    // Exactly 1 network call regardless of the number of campaigns.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Result is keyed by campaign_id.
    expect(result["camp_001"]).toBeDefined();
    expect(result["camp_001"].spend).toBe("150.00");
    expect(result["camp_001"].impressions).toBe("10000");
    expect(result["camp_002"]).toBeDefined();
    expect(result["camp_002"].spend).toBe("80.00");
  });

  it("follows paging.next until exhausted", async () => {
    // First page has paging.next; second page has no next.
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: [
            {
              campaign_id: "camp_A",
              spend: "10.00",
              impressions: "1000",
              clicks: "50",
              date_start: "2026-05-01",
              date_stop: "2026-05-31",
            },
          ],
          paging: { next: "https://graph.facebook.com/page2" },
        })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: [
            {
              campaign_id: "camp_B",
              spend: "20.00",
              impressions: "2000",
              clicks: "80",
              date_start: "2026-05-01",
              date_stop: "2026-05-31",
            },
          ],
          paging: {},
        })
      );

    const result = await getMetaAccountInsights("org-123");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["camp_A"]).toBeDefined();
    expect(result["camp_B"]).toBeDefined();
  });

  it("returns an empty record when the account has no campaign data", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ data: [], paging: {} }));

    const result = await getMetaAccountInsights("org-empty");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({});
  });
});

// ── TikTok: getTikTokBatchInsights ────────────────────────────────────────────

describe("getTikTokBatchInsights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("makes exactly 1 API call for multiple campaign IDs", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            {
              dimensions: { campaign_id: "tt_111" },
              metrics: { spend: "200", impressions: "8000", clicks: "400", conversions: "20" },
            },
            {
              dimensions: { campaign_id: "tt_222" },
              metrics: { spend: "50", impressions: "2000", clicks: "100", conversions: "5" },
            },
          ],
        },
      })
    );

    const result = await getTikTokBatchInsights("org-123", ["tt_111", "tt_222", "tt_333"]);

    // 1 network call regardless of how many IDs are passed.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    expect(result["tt_111"]).toEqual({ spend: 200, impressions: 8000, clicks: 400, conversions: 20 });
    expect(result["tt_222"]).toEqual({ spend: 50, impressions: 2000, clicks: 100, conversions: 5 });
    // Campaign with no data in the response is absent from result.
    expect(result["tt_333"]).toBeUndefined();
  });

  it("returns an empty record without calling the API when campaignIds is empty", async () => {
    const result = await getTikTokBatchInsights("org-123", []);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("returns an empty record when the API call fails (non-ok status)", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const result = await getTikTokBatchInsights("org-123", ["tt_999"]);
    expect(result).toEqual({});
  });
});

// ── LinkedIn: getLinkedInAccountInsights ──────────────────────────────────────

describe("getLinkedInAccountInsights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("makes exactly 1 API call and returns metrics keyed by numeric campaign ID", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        elements: [
          {
            pivotValues: ["urn:li:sponsoredCampaign:44001"],
            costInLocalCurrency: "300.00",
            impressions: 15000,
            clicks: 500,
            externalWebsiteConversions: 30,
          },
          {
            pivotValues: ["urn:li:sponsoredCampaign:44002"],
            costInLocalCurrency: "120.00",
            impressions: 7000,
            clicks: 200,
            externalWebsiteConversions: 10,
          },
        ],
      })
    );

    const result = await getLinkedInAccountInsights("org-123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result["44001"]).toEqual({ spend: 300, impressions: 15000, clicks: 500, conversions: 30 });
    expect(result["44002"]).toEqual({ spend: 120, impressions: 7000, clicks: 200, conversions: 10 });
  });

  it("returns an empty record when the API call fails (non-ok status)", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
    const result = await getLinkedInAccountInsights("org-abc");
    expect(result).toEqual({});
  });

  it("returns an empty record when elements array is empty", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ elements: [] }));
    const result = await getLinkedInAccountInsights("org-xyz");
    expect(result).toEqual({});
  });
});

// ── Google: getGoogleAccountMetrics ───────────────────────────────────────────

describe("getGoogleAccountMetrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("makes exactly 1 GAQL query and returns metrics keyed by campaign ID", async () => {
    // Google client has a module-level token cache. Use a unique orgId per test
    // so the cache cannot carry over a stale token from another test.
    const uniqueOrgId = `org-google-${Date.now()}`;

    // Google OAuth token exchange (fetchWithRetry is used by googleFetch,
    // but the token exchange calls plain fetch — mock global fetch too).
    const globalFetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeJsonResponse({ access_token: "goog-token", expires_in: 3600 })
    );

    // GAQL search response via fetchWithRetry.
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        results: [
          {
            campaign: { id: "g_1001", name: "Search Campaign A" },
            metrics: {
              costMicros: "5000000",
              impressions: "20000",
              clicks: "800",
              conversions: "40",
              conversionsValue: "4000",
              averageCpc: "6250",
              ctr: "0.04",
            },
          },
          {
            campaign: { id: "g_1002", name: "Display Campaign B" },
            metrics: {
              costMicros: "2000000",
              impressions: "50000",
              clicks: "200",
              conversions: "5",
              conversionsValue: "500",
              averageCpc: "10000",
              ctr: "0.004",
            },
          },
        ],
      })
    );

    const result = await getGoogleAccountMetrics(uniqueOrgId);

    // 1 GAQL search call via fetchWithRetry, NOT one per campaign.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Token exchange uses global fetch.
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);

    expect(result["g_1001"]).toBeDefined();
    expect(result["g_1001"].metrics.costMicros).toBe("5000000");
    expect(result["g_1002"]).toBeDefined();
    expect(result["g_1002"].metrics.impressions).toBe("50000");

    globalFetchSpy.mockRestore();
  });
});

// ── sync_runs: recordSyncRun via syncCampaignsFromPlatform ────────────────────

import { getCredentialField } from "@/lib/integrations/credentials";

/**
 * Helper: configure the credential mock so that ONLY the given platforms
 * report having credentials.  All other platforms return null, so their
 * sync blocks are skipped entirely — this lets each test provide only the
 * fetch mocks it cares about.
 */
function enableOnlyPlatforms(platforms: string[]) {
  // Google checks for "refresh_token"; all others check "access_token".
  const googleFields = new Set(["refresh_token"]);

  vi.mocked(getCredentialField).mockImplementation(
    (_orgId: string, provider: string, field: string, _envFallback?: string | undefined) => {
      if (!platforms.includes(provider)) return Promise.resolve(null);
      // Google also needs developer_token, client_id, client_secret, customer_id.
      if (provider === "google") {
        const googleRequired = new Set(["developer_token", "client_id", "client_secret", "refresh_token", "customer_id"]);
        return Promise.resolve(googleRequired.has(field) ? "test-value" : null);
      }
      // Meta needs access_token + ad_account_id.
      if (provider === "meta") {
        const metaRequired = new Set(["access_token", "ad_account_id"]);
        return Promise.resolve(metaRequired.has(field) ? "test-value" : null);
      }
      // TikTok needs access_token + advertiser_id.
      if (provider === "tiktok") {
        const tiktokRequired = new Set(["access_token", "advertiser_id"]);
        return Promise.resolve(tiktokRequired.has(field) ? "test-value" : null);
      }
      // LinkedIn needs access_token + account_id.
      if (provider === "linkedin") {
        const linkedinRequired = new Set(["access_token", "account_id"]);
        return Promise.resolve(linkedinRequired.has(field) ? "test-value" : null);
      }
      void googleFields; // suppress unused-var warning
      return Promise.resolve("test-value");
    }
  );
}

describe("syncCampaignsFromPlatform — sync_runs recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
    // Default: all platforms have credentials.
    vi.mocked(getCredentialField).mockResolvedValue("test-value");
  });

  it("inserts a sync_run row with status 'success' after a successful Meta sync", async () => {
    // Only enable Meta so we don't need to mock Google/TikTok/LinkedIn.
    enableOnlyPlatforms(["meta"]);

    // Campaign list response.
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            id: "camp_X",
            name: "Test Campaign",
            status: "ACTIVE",
            objective: "OUTCOME_SALES",
            daily_budget: "5000",
            created_time: "2026-01-01",
            updated_time: "2026-05-01",
          },
        ],
        paging: {},
      })
    );
    // Account insights response.
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            campaign_id: "camp_X",
            spend: "50.00",
            impressions: "3000",
            clicks: "100",
            date_start: "2026-05-01",
            date_stop: "2026-05-31",
          },
        ],
        paging: {},
      })
    );

    const results = await syncCampaignsFromPlatform("ws-001", "org-001");

    const metaResult = results.find((r) => r.platform === "meta");
    expect(metaResult?.error).toBeNull();
    expect(metaResult?.synced).toBe(1);

    // The service client must have been called to insert into sync_runs.
    expect(mockFrom).toHaveBeenCalledWith("sync_runs");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-001",
        platform: "meta",
        status: "success",
        campaigns_synced: 1,
        error_message: null,
      })
    );
  });

  it("inserts a sync_run row with status 'error' after a Meta sync failure", async () => {
    enableOnlyPlatforms(["meta"]);

    // Reject the very first fetch so the whole Meta block throws.
    mockFetch.mockRejectedValueOnce(new Error("Meta API down"));

    const results = await syncCampaignsFromPlatform("ws-002", "org-002");

    const metaResult = results.find((r) => r.platform === "meta");
    expect(metaResult?.synced).toBe(0);
    expect(metaResult?.error).toBe("Meta API down");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-002",
        platform: "meta",
        status: "error",
        campaigns_synced: 0,
        error_message: "Meta API down",
      })
    );
  });

  it("inserts a sync_run row with status 'partial' when some TikTok campaigns have no insights", async () => {
    enableOnlyPlatforms(["tiktok"]);

    // TikTok listCampaigns: 2 campaigns.
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            { campaign_id: "tt_A", campaign_name: "TT Campaign A", status: "ENABLE", budget: 100 },
            { campaign_id: "tt_B", campaign_name: "TT Campaign B", status: "ENABLE", budget: 200 },
          ],
          page_info: { has_more: false },
        },
        code: 0,
      })
    );
    // Batch insights: only tt_A has data, tt_B is missing.
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            {
              dimensions: { campaign_id: "tt_A" },
              metrics: { spend: "75", impressions: "3000", clicks: "150", conversions: "8" },
            },
          ],
        },
        code: 0,
      })
    );

    const results = await syncCampaignsFromPlatform("ws-003", "org-003");

    const tiktokResult = results.find((r) => r.platform === "tiktok");
    // Both campaigns are still synced (tt_B gets zero-default metrics).
    expect(tiktokResult?.synced).toBe(2);
    // Error field reflects the partial data situation.
    expect(tiktokResult?.error).toContain("1 campanha(s) sem dados de insights");

    // sync_runs row must carry status 'partial', not 'error'.
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "tiktok",
        status: "partial",
        campaigns_synced: 2,
      })
    );
  });

  it("does not insert a sync_run when no platform has credentials", async () => {
    vi.mocked(getCredentialField).mockResolvedValue(null);

    const results = await syncCampaignsFromPlatform("ws-no-creds", "org-no-creds");

    // No platforms should appear in results.
    expect(results).toHaveLength(0);
    // No sync_run INSERT should happen.
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
