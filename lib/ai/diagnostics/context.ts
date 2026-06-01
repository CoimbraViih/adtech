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

  let query = supabase
    .from("campaigns")
    .select(
      "id, name, platform, objective, spend, impressions, clicks, conversions, revenue, cpa, roas, ctr, status",
    )
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  if (campaignId) {
    query = query.eq("id", campaignId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const campaigns = ((data as unknown[]) ?? []) as Campaign[];

  // Pre-resolve benchmarks sequentially per unique (platform, objective) pair
  const uniqueKeys = [...new Set(campaigns.map((r) => `${r.platform}:${r.objective}`))];
  const benchmarkCache: Record<string, Record<string, { target: number; comparator: "gte" | "lte" }>> = {};
  for (const key of uniqueKeys) {
    const [platform, objective] = key.split(":");
    benchmarkCache[key] = await resolveBenchmarks(workspaceId, platform, objective);
  }

  return campaigns.map((row) => {
    const cacheKey = `${row.platform}:${row.objective}`;
    const benchmarks = benchmarkCache[cacheKey] ?? {};
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversions ?? 0);
    const cvr = clicks > 0 ? conversions / clicks : null;

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
    } satisfies CampaignContext;
  });
}
