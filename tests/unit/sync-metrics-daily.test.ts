import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all platform clients — we only care about the metrics upsert call.
vi.mock("@/lib/meta/client", () => ({
  listMetaCampaigns: vi.fn().mockResolvedValue([
    { id: "meta-1", name: "Meta Campaign", status: "ACTIVE", daily_budget: "10000" },
  ]),
  getMetaAccountInsights: vi.fn().mockResolvedValue({
    "meta-1": {
      spend: "500.00",
      impressions: "20000",
      clicks: "400",
      actions: [{ action_type: "purchase", value: "10" }],
      purchase_roas: [{ value: "2.5" }],
    },
  }),
  listMetaAdSets: vi.fn().mockResolvedValue([]),
  listMetaAds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/google/client", () => ({
  listGoogleCampaigns: vi.fn().mockResolvedValue([]),
  getGoogleAccountMetrics: vi.fn().mockResolvedValue({}),
  listGoogleAdGroups: vi.fn().mockResolvedValue([]),
  listGoogleAds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/tiktok/client", () => ({
  listTikTokCampaigns: vi.fn().mockResolvedValue([]),
  getTikTokBatchInsights: vi.fn().mockResolvedValue({}),
  listTikTokAdGroups: vi.fn().mockResolvedValue([]),
  listTikTokAds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/linkedin/client", () => ({
  listLinkedInCampaigns: vi.fn().mockResolvedValue([]),
  getLinkedInAccountInsights: vi.fn().mockResolvedValue({}),
  listLinkedInCreatives: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: vi.fn().mockResolvedValue("tok"),
}));

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }), upsert: mockUpsert }),
  }),
}));

vi.mock("@/lib/analytics/cross-platform", () => ({
  normalizeCampaignMetrics: vi.fn((workspaceId, platform, date, campaigns) =>
    campaigns.map((c: { externalId: string }) => ({ workspaceId, campaignExternalId: c.externalId, platform, date }))
  ),
  upsertDailyMetrics: vi.fn().mockResolvedValue(undefined),
}));

import { syncCampaignsFromPlatform } from "@/lib/campaigns/sync";
import * as crossPlatform from "@/lib/analytics/cross-platform";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(crossPlatform.upsertDailyMetrics).mockResolvedValue(undefined);
});

describe("syncCampaignsFromPlatform — metrics daily upsert", () => {
  it("chama upsertDailyMetrics para Meta quando há campanhas", async () => {
    await syncCampaignsFromPlatform("ws-1", "org-1");
    const upsertSpy = vi.mocked(crossPlatform.upsertDailyMetrics);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [rows] = upsertSpy.mock.calls[0];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].platform).toBe("meta");
  });

  it("não chama upsertDailyMetrics quando não há campanhas (Google mock vazio)", async () => {
    // Google mock retorna [] — não deve haver call para google
    await syncCampaignsFromPlatform("ws-1", "org-1");
    const upsertSpy = vi.mocked(crossPlatform.upsertDailyMetrics);
    const calls = upsertSpy.mock.calls;
    const googleCalls = calls.filter(([rows]) => rows[0]?.platform === "google");
    expect(googleCalls).toHaveLength(0);
  });

  it("falha silenciosa de upsertDailyMetrics não interrompe o sync", async () => {
    vi.mocked(crossPlatform.upsertDailyMetrics).mockRejectedValueOnce(new Error("DB down"));
    const results = await syncCampaignsFromPlatform("ws-1", "org-1");
    const metaResult = results.find((r) => r.platform === "meta");
    // sync de campanhas ainda deve reportar sucesso
    expect(metaResult?.error).toBeNull();
  });
});
