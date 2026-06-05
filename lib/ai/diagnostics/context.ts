import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveBenchmarks } from "./benchmarks";
import type { CampaignContext } from "./types";
import type { Campaign } from "@/types/database";

export async function buildCampaignContexts(
  workspaceId: string,
  organizationId: string,
  campaignId?: string,
): Promise<CampaignContext[]> {
  const supabase = await createServerSupabaseClient();

  // ── Fetch campaigns ──────────────────────────────────────────────────────────
  let query = supabase
    .from("campaigns")
    .select(
      "id, name, platform, objective, spend, impressions, clicks, conversions, revenue, cpa, roas, ctr, status, external_id",
    )
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  if (campaignId) {
    query = query.eq("id", campaignId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const campaigns = ((data as unknown[]) ?? []) as (Campaign & { external_id: string | null })[];

  // ── Fetch pixel conversions from campaign_metrics_daily (last 30 days) ───────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  type MetricsRow = {
    campaign_external_id: string;
    platform: string;
    pixel_conversions: number;
    conversions: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metricsDb = supabase.from("campaign_metrics_daily") as any;
  const { data: metricsData } = (await metricsDb
    .select("campaign_external_id, platform, pixel_conversions, conversions")
    .eq("workspace_id", workspaceId)
    .gte("date", thirtyDaysAgo)) as { data: MetricsRow[] | null; error: unknown };

  // Aggregate pixel_conversions and platform conversions per (external_id, platform).
  type AggMetrics = { pixelConversions: number; platformConversions: number };
  const pixelByKey = new Map<string, AggMetrics>();
  for (const row of (metricsData ?? []) as Array<{
    campaign_external_id: string;
    platform: string;
    pixel_conversions: number;
    conversions: number;
  }>) {
    const key = `${row.campaign_external_id}:${row.platform}`;
    const cur = pixelByKey.get(key) ?? { pixelConversions: 0, platformConversions: 0 };
    pixelByKey.set(key, {
      pixelConversions: cur.pixelConversions + Number(row.pixel_conversions),
      platformConversions: cur.platformConversions + Number(row.conversions),
    });
  }

  // ── Pre-resolve benchmarks ───────────────────────────────────────────────────
  const uniqueKeys = [...new Set(campaigns.map((r) => `${r.platform}:${r.objective}`))];
  const benchmarkCache: Record<string, Record<string, { target: number; comparator: "gte" | "lte" }>> = {};
  for (const key of uniqueKeys) {
    const [platform, objective] = key.split(":");
    benchmarkCache[key] = await resolveBenchmarks(workspaceId, platform, objective);
  }

  // ── Build contexts ───────────────────────────────────────────────────────────
  return campaigns.map((row) => {
    const cacheKey = `${row.platform}:${row.objective}`;
    const benchmarks = benchmarkCache[cacheKey] ?? {};
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversions ?? 0);
    const cvr = clicks > 0 ? conversions / clicks : null;

    // Look up pixel metrics by external_id + platform.
    const metricKey = row.external_id ? `${row.external_id}:${row.platform}` : null;
    const pixelMetrics = metricKey ? pixelByKey.get(metricKey) : undefined;
    const pixelConversions = pixelMetrics?.pixelConversions ?? null;
    const divergencePct =
      pixelMetrics && pixelMetrics.platformConversions > 0
        ? (pixelMetrics.platformConversions - pixelMetrics.pixelConversions) /
          pixelMetrics.platformConversions
        : null;

    return {
      workspaceId,
      organizationId,
      entityType: "campaign" as const,
      entityId: row.id,
      campaignId: row.id,
      name: row.name,
      platform: row.platform,
      objective: row.objective,
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks,
      conversions,
      revenue: Number(row.revenue ?? 0),
      ctr: row.ctr != null ? Number(row.ctr) : null,
      cpa: row.cpa != null ? Number(row.cpa) : null,
      roas: row.roas != null ? Number(row.roas) : null,
      frequency: null,
      cvr,
      ctrDelta7d: null,
      benchmarks,
      pixelConversions,
      divergencePct,
    } satisfies CampaignContext;
  });
}
