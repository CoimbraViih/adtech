/**
 * Unit tests for Task B — ad sets & ads functions and sync layer.
 *
 * Covers:
 * - listMetaAdSets / listMetaAds
 * - listGoogleAdGroups / listGoogleAds
 * - listTikTokAdGroups / listTikTokAds
 * - listLinkedInCreatives
 * - syncCampaignsFromPlatform ad_sets/ads upsert calls (via _upsertData TODOs)
 * - Error in ad set sync does NOT fail campaign sync result
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const { mockInsert, mockFrom } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockFrom };
});

vi.mock("@/lib/integrations/fetch-retry", () => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: vi.fn().mockResolvedValue("test-value"),
}));

vi.mock("@/lib/meta/token-refresh", () => ({
  refreshMetaTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/linkedin/token-refresh", () => ({
  refreshLinkedInTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn().mockReturnValue({ from: mockFrom }),
}));

// ── imports after mocks ───────────────────────────────────────────────────────

import { fetchWithRetry } from "@/lib/integrations/fetch-retry";
import { getCredentialField } from "@/lib/integrations/credentials";
import { listMetaAdSets, listMetaAds } from "@/lib/meta/client";
import { listGoogleAdGroups, listGoogleAds } from "@/lib/google/client";
import { listTikTokAdGroups, listTikTokAds } from "@/lib/tiktok/client";
import { listLinkedInCreatives } from "@/lib/linkedin/client";
import { syncCampaignsFromPlatform } from "@/lib/campaigns/sync";

const mockFetch = vi.mocked(fetchWithRetry);

// ── helpers ───────────────────────────────────────────────────────────────────

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Configure getCredentialField mock so only specific platforms have credentials.
 */
function enableOnlyPlatforms(platforms: string[]) {
  vi.mocked(getCredentialField).mockImplementation(
    (_orgId: string, provider: string, field: string, _envFallback?: string | undefined) => {
      if (!platforms.includes(provider)) return Promise.resolve(null);
      if (provider === "google") {
        const required = new Set(["developer_token", "client_id", "client_secret", "refresh_token", "customer_id"]);
        return Promise.resolve(required.has(field) ? "test-value" : null);
      }
      if (provider === "meta") {
        const required = new Set(["access_token", "ad_account_id"]);
        return Promise.resolve(required.has(field) ? "test-value" : null);
      }
      if (provider === "tiktok") {
        const required = new Set(["access_token", "advertiser_id"]);
        return Promise.resolve(required.has(field) ? "test-value" : null);
      }
      if (provider === "linkedin") {
        const required = new Set(["access_token", "account_id"]);
        return Promise.resolve(required.has(field) ? "test-value" : null);
      }
      return Promise.resolve("test-value");
    }
  );
}

// ── listMetaAdSets ────────────────────────────────────────────────────────────

describe("listMetaAdSets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with correct fields from a single page", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            id: "adset_001",
            name: "Ad Set Alpha",
            status: "ACTIVE",
            daily_budget: "2000",
            targeting: { age_min: 18 },
            created_time: "2026-01-15T10:00:00+0000",
          },
          {
            id: "adset_002",
            name: "Ad Set Beta",
            status: "PAUSED",
            daily_budget: "1000",
            targeting: {},
            created_time: "2026-01-16T10:00:00+0000",
          },
        ],
        paging: {},
      })
    );

    const result = await listMetaAdSets("org-1", "camp_X");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    expect(result[0].id).toBe("adset_001");
    expect(result[0].name).toBe("Ad Set Alpha");
    expect(result[0].status).toBe("ACTIVE");
    expect(result[0].daily_budget).toBe("2000");

    expect(result[1].id).toBe("adset_002");
    expect(result[1].status).toBe("PAUSED");
  });

  it("follows paging.next until exhausted", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: [{ id: "as_A", name: "Set A", status: "ACTIVE", created_time: "2026-01-01" }],
          paging: { next: "https://graph.facebook.com/page2" },
        })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: [{ id: "as_B", name: "Set B", status: "PAUSED", created_time: "2026-01-02" }],
          paging: {},
        })
      );

    const result = await listMetaAdSets("org-2", "camp_Y");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("as_A");
    expect(result[1].id).toBe("as_B");
  });

  it("returns empty array when no ad sets exist", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ data: [], paging: {} }));
    const result = await listMetaAdSets("org-3", "camp_empty");
    expect(result).toEqual([]);
  });
});

// ── listMetaAds ───────────────────────────────────────────────────────────────

describe("listMetaAds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with correct fields", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            id: "ad_001",
            name: "Ad One",
            status: "ACTIVE",
            creative: { id: "cr_001", name: "Creative One" },
          },
          {
            id: "ad_002",
            name: "Ad Two",
            status: "PAUSED",
            creative: { id: "cr_002" },
          },
        ],
        paging: {},
      })
    );

    const result = await listMetaAds("org-1", "adset_001");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    expect(result[0].id).toBe("ad_001");
    expect(result[0].name).toBe("Ad One");
    expect(result[0].status).toBe("ACTIVE");
    expect(result[0].creative?.id).toBe("cr_001");

    expect(result[1].id).toBe("ad_002");
    expect(result[1].status).toBe("PAUSED");
  });

  it("returns empty array when no ads exist", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ data: [], paging: {} }));
    const result = await listMetaAds("org-1", "adset_empty");
    expect(result).toEqual([]);
  });
});

// ── listGoogleAdGroups ────────────────────────────────────────────────────────

describe("listGoogleAdGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with correct fields via GAQL", async () => {
    // Google uses global fetch for token exchange
    const globalFetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeJsonResponse({ access_token: "goog-token", expires_in: 3600 })
    );

    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        results: [
          {
            adGroup: {
              resourceName: "customers/123/adGroups/ag_1",
              id: "ag_1",
              name: "Ad Group One",
              status: "ENABLED",
              cpcBidMicros: "500000",
            },
          },
          {
            adGroup: {
              resourceName: "customers/123/adGroups/ag_2",
              id: "ag_2",
              name: "Ad Group Two",
              status: "PAUSED",
              cpcBidMicros: "300000",
            },
          },
        ],
      })
    );

    const uniqueOrgId = `org-google-adgroups-${Date.now()}`;
    const result = await listGoogleAdGroups(uniqueOrgId, "camp_001");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    expect(result[0].id).toBe("ag_1");
    expect(result[0].name).toBe("Ad Group One");
    expect(result[0].status).toBe("ENABLED");
    expect(result[0].cpcBidMicros).toBe("500000");

    expect(result[1].id).toBe("ag_2");
    expect(result[1].status).toBe("PAUSED");

    globalFetchSpy.mockRestore();
  });

  it("returns empty array when no ad groups exist", async () => {
    const globalFetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeJsonResponse({ access_token: "goog-token-2", expires_in: 3600 })
    );

    mockFetch.mockResolvedValueOnce(makeJsonResponse({ results: [] }));

    const uniqueOrgId = `org-google-adgroups-empty-${Date.now()}`;
    const result = await listGoogleAdGroups(uniqueOrgId, "camp_empty");

    expect(result).toEqual([]);
    globalFetchSpy.mockRestore();
  });
});

// ── listGoogleAds ─────────────────────────────────────────────────────────────

describe("listGoogleAds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with correct fields via GAQL", async () => {
    const globalFetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeJsonResponse({ access_token: "goog-token-ads", expires_in: 3600 })
    );

    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        results: [
          {
            adGroupAd: {
              ad: { id: "gad_1", name: "Responsive Search Ad 1" },
              status: "ENABLED",
            },
          },
          {
            adGroupAd: {
              ad: { id: "gad_2", name: "Responsive Search Ad 2" },
              status: "PAUSED",
            },
          },
        ],
      })
    );

    const uniqueOrgId = `org-google-ads-${Date.now()}`;
    const result = await listGoogleAds(uniqueOrgId, "ag_1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    expect(result[0].id).toBe("gad_1");
    expect(result[0].name).toBe("Responsive Search Ad 1");
    expect(result[0].status).toBe("ENABLED");

    expect(result[1].id).toBe("gad_2");
    expect(result[1].status).toBe("PAUSED");

    globalFetchSpy.mockRestore();
  });
});

// ── listTikTokAdGroups ────────────────────────────────────────────────────────

describe("listTikTokAdGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with id, name, status, budget from data.list", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            { adgroup_id: "ag_tt_1", adgroup_name: "TT Ad Group One", status: "ENABLE", budget: 500 },
            { adgroup_id: "ag_tt_2", adgroup_name: "TT Ad Group Two", status: "DISABLE", budget: 200 },
          ],
          page_info: { has_more: false },
        },
        code: 0,
      })
    );

    const result = await listTikTokAdGroups("org-tt", "camp_tt_1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    expect(result[0].id).toBe("ag_tt_1");
    expect(result[0].name).toBe("TT Ad Group One");
    expect(result[0].status).toBe("ENABLE");
    expect(result[0].budget).toBe(500);

    expect(result[1].id).toBe("ag_tt_2");
    expect(result[1].status).toBe("DISABLE");
    expect(result[1].budget).toBe(200);
  });

  it("paginates when has_more is true", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: {
            list: [{ adgroup_id: "ag_1", adgroup_name: "Group 1", status: "ENABLE", budget: 100 }],
            page_info: { has_more: true },
          },
          code: 0,
        })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({
          data: {
            list: [{ adgroup_id: "ag_2", adgroup_name: "Group 2", status: "ENABLE", budget: 200 }],
            page_info: { has_more: false },
          },
          code: 0,
        })
      );

    const result = await listTikTokAdGroups("org-tt-2", "camp_tt_2");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("throws on non-ok status", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(listTikTokAdGroups("org-tt-err", "camp_err")).rejects.toThrow("TikTok listAdGroups error");
  });
});

// ── listTikTokAds ─────────────────────────────────────────────────────────────

describe("listTikTokAds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with id, name, status from data.list", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            { ad_id: "tt_ad_1", ad_name: "TT Ad One", status: "ENABLE" },
            { ad_id: "tt_ad_2", ad_name: "TT Ad Two", status: "DISABLE" },
          ],
          page_info: { has_more: false },
        },
        code: 0,
      })
    );

    const result = await listTikTokAds("org-tt", "ag_tt_1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    expect(result[0].id).toBe("tt_ad_1");
    expect(result[0].name).toBe("TT Ad One");
    expect(result[0].status).toBe("ENABLE");

    expect(result[1].id).toBe("tt_ad_2");
    expect(result[1].status).toBe("DISABLE");
  });

  it("throws on non-ok status", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(listTikTokAds("org-tt-err", "ag_err")).rejects.toThrow("TikTok listAds error");
  });
});

// ── listLinkedInCreatives ─────────────────────────────────────────────────────

describe("listLinkedInCreatives", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array with id, status, reference from elements", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        elements: [
          {
            id: "urn:li:adCreative:111",
            status: "ACTIVE",
            reference: "urn:li:share:987",
          },
          {
            id: "urn:li:adCreative:222",
            status: "PAUSED",
            reference: "urn:li:ugcPost:654",
          },
        ],
      })
    );

    const result = await listLinkedInCreatives("org-li", "camp_li_1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    // id is the last segment of the URN
    expect(result[0].id).toBe("111");
    expect(result[0].status).toBe("ACTIVE");
    expect(result[0].reference).toBe("urn:li:share:987");

    expect(result[1].id).toBe("222");
    expect(result[1].status).toBe("PAUSED");
  });

  it("paginates when elements.length equals page count", async () => {
    // Build a page with exactly 50 elements to trigger next page
    const page1Elements = Array.from({ length: 50 }, (_, i) => ({
      id: `urn:li:adCreative:${i + 1}`,
      status: "ACTIVE",
    }));
    const page2Elements = [{ id: "urn:li:adCreative:51", status: "PAUSED" }];

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ elements: page1Elements }))
      .mockResolvedValueOnce(makeJsonResponse({ elements: page2Elements }));

    const result = await listLinkedInCreatives("org-li-2", "camp_li_2");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(51);
  });

  it("throws on non-ok status", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(listLinkedInCreatives("org-li-err", "camp_err")).rejects.toThrow(
      "LinkedIn listCreatives error"
    );
  });

  it("returns empty array when elements is empty", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ elements: [] }));
    const result = await listLinkedInCreatives("org-li-empty", "camp_empty");
    expect(result).toEqual([]);
  });
});

// ── sync: error in ad set sync does NOT fail campaign sync ─────────────────────

describe("syncCampaignsFromPlatform — ad set sync errors do not fail campaign sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("campaign sync succeeds even when listMetaAdSets throws", async () => {
    enableOnlyPlatforms(["meta"]);

    // Campaign list — one active campaign
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            id: "camp_fail_adsets",
            name: "Campaign With Broken AdSets",
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
    // Account insights
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: [
          {
            campaign_id: "camp_fail_adsets",
            spend: "100.00",
            impressions: "5000",
            clicks: "200",
            date_start: "2026-05-01",
            date_stop: "2026-05-31",
          },
        ],
        paging: {},
      })
    );
    // listMetaAdSets — returns error response that triggers throw
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ error: { message: "Ad Sets API error", code: 100 } }, 400)
    );

    const results = await syncCampaignsFromPlatform("ws-adset-err", "org-adset-err");

    const metaResult = results.find((r) => r.platform === "meta");
    // Campaign sync must still succeed
    expect(metaResult?.synced).toBe(1);
    expect(metaResult?.error).toBeNull();
  });

  it("campaign sync succeeds even when listTikTokAdGroups throws", async () => {
    enableOnlyPlatforms(["tiktok"]);

    // TikTok listCampaigns — one active campaign
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            { campaign_id: "tt_camp_1", campaign_name: "TT Campaign", status: "ENABLE", budget: 300 },
          ],
          page_info: { has_more: false },
        },
        code: 0,
      })
    );
    // Batch insights
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        data: {
          list: [
            {
              dimensions: { campaign_id: "tt_camp_1" },
              metrics: { spend: "100", impressions: "5000", clicks: "200", conversions: "10" },
            },
          ],
        },
        code: 0,
      })
    );
    // listTikTokAdGroups — network error
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

    const results = await syncCampaignsFromPlatform("ws-tt-adset-err", "org-tt-adset-err");

    const tiktokResult = results.find((r) => r.platform === "tiktok");
    // Campaign sync must still succeed
    expect(tiktokResult?.synced).toBe(1);
  });
});
