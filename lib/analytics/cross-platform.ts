import { createServiceClient } from "@/lib/supabase/service";

// ── Input/output types ────────────────────────────────────────────────────────

export type NormalizedCampaignMetrics = {
  workspaceId: string;
  campaignExternalId: string;
  platform: string;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
  pixelConversions: number; // always 0 at sync time; updated by pixel fanout
};

export type ReconciliationRow = {
  campaignExternalId: string;
  platform: string;
  spend: number;
  platformConversions: number;
  pixelConversions: number;
  /** (platformConversions - pixelConversions) / platformConversions. null when platformConversions === 0. */
  divergencePct: number | null;
};

// ── Pure functions (no I/O — easy to unit-test) ───────────────────────────────

export function normalizeCampaignMetrics(
  workspaceId: string,
  platform: string,
  date: string,
  campaigns: Array<{
    externalId: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>
): NormalizedCampaignMetrics[] {
  return campaigns.map((c) => ({
    workspaceId,
    campaignExternalId: c.externalId,
    platform,
    date,
    spend: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    revenue: c.revenue,
    roas: c.spend > 0 && c.revenue > 0 ? c.revenue / c.spend : null,
    cpa: c.conversions > 0 ? c.spend / c.conversions : null,
    pixelConversions: 0,
  }));
}

export function reconcileWithPixel(
  rows: Array<{
    campaignExternalId: string;
    platform: string;
    spend: number;
    platformConversions: number;
    pixelConversions: number;
  }>
): ReconciliationRow[] {
  return rows.map((r) => ({
    ...r,
    divergencePct:
      r.platformConversions > 0
        ? (r.platformConversions - r.pixelConversions) / r.platformConversions
        : null,
  }));
}

// ── I/O helpers ───────────────────────────────────────────────────────────────

export async function upsertDailyMetrics(rows: NormalizedCampaignMetrics[]): Promise<void> {
  if (rows.length === 0) return;
  const db = createServiceClient();
  const records = rows.map((r) => ({
    workspace_id: r.workspaceId,
    campaign_external_id: r.campaignExternalId,
    platform: r.platform,
    date: r.date,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    revenue: r.revenue,
    roas: r.roas,
    cpa: r.cpa,
    pixel_conversions: r.pixelConversions,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db
    .from("campaign_metrics_daily")
    .upsert(records, { onConflict: "workspace_id,campaign_external_id,platform,date" });
  if (error) throw new Error(`[cross-platform] upsertDailyMetrics: ${(error as { message?: string }).message ?? String(error)}`);
}

export async function getReconciliationRows(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<ReconciliationRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("campaign_metrics_daily")
    .select("campaign_external_id, platform, spend, conversions, pixel_conversions")
    .eq("workspace_id", workspaceId)
    .gte("date", dateFrom)
    .lte("date", dateTo);
  if (error) throw new Error(`[cross-platform] getReconciliationRows: ${(error as { message?: string }).message ?? String(error)}`);
  const rows = (data ?? []) as Array<{
    campaign_external_id: string;
    platform: string;
    spend: number;
    conversions: number;
    pixel_conversions: number;
  }>;
  return reconcileWithPixel(
    rows.map((r) => ({
      campaignExternalId: r.campaign_external_id,
      platform: r.platform,
      spend: Number(r.spend),
      platformConversions: Number(r.conversions),
      pixelConversions: Number(r.pixel_conversions),
    }))
  );
}
