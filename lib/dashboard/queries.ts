import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DayPoint,
  DualDayPoint,
  DashboardKpis,
  CampaignStatusCounts,
  TopCampaign,
  CampaignAlert,
} from "@/types/dashboard";

export async function getDashboardKpis(workspaceId: string): Promise<DashboardKpis> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("campaigns")
    .select("spend, revenue, impressions, clicks, conversions")
    .eq("workspace_id", workspaceId);

  if (!data || data.length === 0) {
    return { spend: 0, revenue: 0, roas: 0, cpa: 0, conversions: 0, ctr: 0 };
  }

  const spend = data.reduce((s, c) => s + Number(c.spend ?? 0), 0);
  const revenue = data.reduce((s, c) => s + Number(c.revenue ?? 0), 0);
  const conversions = data.reduce((s, c) => s + Number(c.conversions ?? 0), 0);
  const clicks = data.reduce((s, c) => s + Number(c.clicks ?? 0), 0);
  const impressions = data.reduce((s, c) => s + Number(c.impressions ?? 0), 0);

  return {
    spend,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    conversions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

export async function getKpiDeltas(): Promise<DashboardKpis> {
  // Real delta requires campaign_metrics_daily period comparison.
  // Returns zeros until platform syncs populate time-series data.
  return { spend: 0, revenue: 0, roas: 0, cpa: 0, conversions: 0, ctr: 0 };
}

export async function getCampaignStatusCounts(workspaceId: string): Promise<CampaignStatusCounts> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("campaigns")
    .select("status")
    .eq("workspace_id", workspaceId);

  if (!data) return { active: 0, paused: 0, draft: 0, archived: 0 };

  return {
    active: data.filter((c) => c.status === "active").length,
    paused: data.filter((c) => c.status === "paused").length,
    draft: data.filter((c) => c.status === "draft").length,
    archived: data.filter((c) => c.status === "archived").length,
  };
}

export async function getTopCampaigns(workspaceId: string, n = 5): Promise<TopCampaign[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, name, platform, roas, spend, conversions, status")
    .eq("workspace_id", workspaceId)
    .order("roas", { ascending: false, nullsFirst: false })
    .limit(n);

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
    roas: Number(c.roas ?? 0),
    spend: Number(c.spend ?? 0),
    conversions: Number(c.conversions ?? 0),
    status: c.status,
  }));
}

export async function getCampaignAlerts(workspaceId: string): Promise<CampaignAlert[]> {
  const supabase = await createServerSupabaseClient();
  const { data: diagnostics } = await supabase
    .from("ai_diagnostics")
    .select("id, campaign_id, severity, title, rationale, suggested_action")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .in("severity", ["critical", "warning"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (!diagnostics || diagnostics.length === 0) return [];

  const byCampaign = new Map<string, typeof diagnostics>();
  for (const d of diagnostics) {
    if (!d.campaign_id) continue;
    const existing = byCampaign.get(d.campaign_id) ?? [];
    byCampaign.set(d.campaign_id, [...existing, d]);
  }
  if (byCampaign.size === 0) return [];

  const campaignIds = Array.from(byCampaign.keys());
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, platform")
    .in("id", campaignIds);

  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));

  return Array.from(byCampaign.entries()).flatMap(([campaignId, diags]) => {
    const campaign = campaignMap.get(campaignId);
    if (!campaign) return [];
    const worst = diags.reduce((a, b) =>
      a.severity === "critical" ? a : b.severity === "critical" ? b : a
    );
    return [
      {
        campaignId,
        campaignName: campaign.name,
        platform: campaign.platform,
        worstSeverity: worst.severity as "critical" | "warning",
        worstTitle: worst.title,
        worstDescription: worst.rationale,
        suggestedAction: worst.suggested_action ?? "",
        openCount: diags.length,
      },
    ];
  });
}

export async function getRevenueByDay(
  workspaceId: string,
  from: string,
  to: string
): Promise<DayPoint[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("campaign_metrics_daily")
    .select("date, revenue")
    .eq("workspace_id", workspaceId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (!data || data.length === 0) return [];

  const byDate = new Map<string, number>();
  for (const row of data) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + Number(row.revenue ?? 0));
  }
  return Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
}

export async function getRoasAndSpendByDay(
  workspaceId: string,
  from: string,
  to: string
): Promise<DualDayPoint[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("campaign_metrics_daily")
    .select("date, roas, spend")
    .eq("workspace_id", workspaceId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (!data || data.length === 0) return [];

  const byDate = new Map<string, { spend: number; revenue: number }>();
  for (const row of data) {
    const existing = byDate.get(row.date) ?? { spend: 0, revenue: 0 };
    const spend = Number(row.spend ?? 0);
    const roas = Number(row.roas ?? 0);
    byDate.set(row.date, {
      spend: existing.spend + spend,
      revenue: existing.revenue + roas * spend,
    });
  }
  return Array.from(byDate.entries()).map(([date, { spend, revenue }]) => ({
    date,
    primary: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
    secondary: Math.round(spend),
  }));
}

export async function getImpressionsAndConversionsByDay(
  workspaceId: string,
  from: string,
  to: string
): Promise<DualDayPoint[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("campaign_metrics_daily")
    .select("date, impressions, conversions")
    .eq("workspace_id", workspaceId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (!data || data.length === 0) return [];

  const byDate = new Map<string, { impressions: number; conversions: number }>();
  for (const row of data) {
    const existing = byDate.get(row.date) ?? { impressions: 0, conversions: 0 };
    byDate.set(row.date, {
      impressions: existing.impressions + Number(row.impressions ?? 0),
      conversions: existing.conversions + Number(row.conversions ?? 0),
    });
  }
  return Array.from(byDate.entries()).map(([date, { impressions, conversions }]) => ({
    date,
    primary: impressions,
    secondary: conversions,
  }));
}

export async function getCreativesSummary(workspaceId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("creatives")
    .select("status, score")
    .eq("workspace_id", workspaceId)
    .eq("type", "copy");

  if (!data) return { total: 0, approved: 0, avgScore: null };

  const scores = data.map((c) => c.score).filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return {
    total: data.length,
    approved: data.filter((c) => c.status === "approved").length,
    avgScore,
  };
}
