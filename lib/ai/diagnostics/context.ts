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

  // Cache benchmarks per (platform, objective) to avoid redundant Supabase calls
  const benchmarkCache: Record<
    string,
    Record<string, { target: number; comparator: "gte" | "lte" }>
  > = {};

  return Promise.all(
    ((data as unknown[]) ?? []).map(async (row) => {
      const r = row as Campaign;
      const cacheKey = `${r.platform}:${r.objective}`;
      if (!benchmarkCache[cacheKey]) {
        benchmarkCache[cacheKey] = await resolveBenchmarks(
          workspaceId,
          r.platform,
          r.objective,
        );
      }
      const benchmarks = benchmarkCache[cacheKey];

      const clicks = Number(r.clicks ?? 0);
      const conversions = Number(r.conversions ?? 0);
      const cvr = clicks > 0 ? conversions / clicks : null;

      return {
        workspaceId,
        organizationId,
        entityType: "campaign" as const,
        entityId: r.id,
        campaignId: r.id,
        name: r.name,
        platform: r.platform,
        objective: r.objective,
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks,
        conversions,
        revenue: Number(r.revenue ?? 0),
        ctr: r.ctr != null ? Number(r.ctr) : null,
        cpa: r.cpa != null ? Number(r.cpa) : null,
        roas: r.roas != null ? Number(r.roas) : null,
        frequency: null, // requires reach column — not stored yet
        cvr,
        ctrDelta7d: null, // future: pull from analytics views
        benchmarks,
      } satisfies CampaignContext;
    }),
  );
}
