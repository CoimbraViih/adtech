import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
import { DashboardKpiStrip } from "@/components/dashboard/dashboard-kpi-strip";
import { RevenueBarChart } from "@/components/dashboard/revenue-bar-chart";
import { RoasSpendChart } from "@/components/dashboard/roas-spend-chart";
import { ImpressionsConversionsChart } from "@/components/dashboard/impressions-conversions-chart";
import { CampaignStatusHub } from "@/components/dashboard/campaign-status-hub";
import { SectionHubCards } from "@/components/dashboard/section-hub-cards";
import { TopCampaignsTable } from "@/components/dashboard/top-campaigns-table";
import { CampaignAlertsWidget } from "@/components/dashboard/campaign-alerts-widget";
import type {
  DashboardKpis,
  CampaignStatusCounts,
  TopCampaign,
  DayPoint,
  DualDayPoint,
  CampaignAlert,
} from "@/lib/dashboard/types";

type SearchParams = { from?: string; to?: string; compare?: string };

function parseCompare(v: string | undefined): CompareMode {
  if (v === "prev_period" || v === "prev_year" || v === "none") return v;
  return "prev_period";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireServerSession().catch(() => null);
  if (!session) redirect("/login");
  const workspaceId = session.workspace.id;

  const sp = await searchParams;
  const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare = parseCompare(sp.compare);

  const supabase = await createServerSupabaseClient();

  const [
    { data: campaignsData },
    { data: metricsData },
    { data: creativesData },
    { data: diagnosticsData },
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, platform, status, spend, revenue, conversions, clicks, impressions, roas")
      .eq("workspace_id", workspaceId),
    supabase
      .from("campaign_metrics_daily")
      .select("date, spend, revenue, impressions, conversions, roas")
      .eq("workspace_id", workspaceId)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: true }),
    supabase
      .from("creatives")
      .select("type, status, score")
      .eq("workspace_id", workspaceId),
    supabase
      .from("ai_diagnostics")
      .select("entity_id, title, description, severity, suggested_action, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const campaigns = campaignsData ?? [];
  const metrics = metricsData ?? [];

  // KPIs
  const spend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const revenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const conversions = campaigns.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const clicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const impressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const kpis: DashboardKpis = {
    spend,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    conversions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };

  // Deltas — return zeros until comparison period is implemented
  const deltas: DashboardKpis = { spend: 0, revenue: 0, roas: 0, cpa: 0, conversions: 0, ctr: 0 };

  // Status counts
  const statusCounts: CampaignStatusCounts = {
    active: campaigns.filter((c) => c.status === "active").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    archived: campaigns.filter((c) => c.status === "archived").length,
  };

  // Top campaigns
  const topCampaigns: TopCampaign[] = [...campaigns]
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      roas: c.roas ?? 0,
      spend: c.spend ?? 0,
      conversions: c.conversions ?? 0,
      status: c.status,
    }));

  // Chart: revenue by day
  const revenueData: DayPoint[] = metrics.map((m) => ({
    date: m.date,
    value: Number(m.revenue ?? 0),
  }));

  // Chart: ROAS + Spend by day
  const roasSpendData: DualDayPoint[] = metrics.map((m) => ({
    date: m.date,
    primary: Number(m.roas ?? 0),
    secondary: Number(m.spend ?? 0),
  }));

  // Chart: Impressions + Conversions by day
  const impConvData: DualDayPoint[] = metrics.map((m) => ({
    date: m.date,
    primary: Number(m.impressions ?? 0),
    secondary: Number(m.conversions ?? 0),
  }));

  // Creatives summary
  const allCreatives = creativesData ?? [];
  const copies = allCreatives.filter((c) => c.type === "copy");
  const scores = copies.map((c) => c.score).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const creatives = {
    total: copies.length,
    approved: copies.filter((c) => c.status === "approved").length,
    avgScore,
  };

  // Campaign alerts from ai_diagnostics
  const allDiagnostics = diagnosticsData ?? [];
  const campaignAlerts: CampaignAlert[] = allDiagnostics.map((d) => ({
    campaignId: d.entity_id,
    campaignName: d.entity_id,
    platform: "unknown",
    worstSeverity: (d.severity === "critical" ? "critical" : "warning") as "critical" | "warning",
    worstTitle: d.title,
    worstDescription: d.description,
    suggestedAction: d.suggested_action ?? "",
    openCount: 1,
  }));

  return (
    <div className="space-y-6">
      {/* Header + date filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">Dashboard</h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {dateFrom} → {dateTo}
            {compare !== "none" && (
              <span className="ml-2 text-[color:var(--adflow-fg-muted)]/60">
                · vs {compare === "prev_period" ? "período anterior" : "ano anterior"}
              </span>
            )}
          </p>
        </div>
        <Suspense>
          <GlobalDateFilter
            currentFrom={dateFrom}
            currentTo={dateTo}
            currentCompare={compare}
          />
        </Suspense>
      </div>

      {/* KPI strip */}
      <DashboardKpiStrip kpis={kpis} deltas={deltas} showDelta={compare !== "none"} />

      {/* Charts row 1: Revenue | ROAS+Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueBarChart data={revenueData} />
        <RoasSpendChart data={roasSpendData} />
      </div>

      {/* Chart row 2: Impressions + Conversions full width */}
      <ImpressionsConversionsChart data={impConvData} />

      {/* Hub row: Campaign status + section cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <CampaignStatusHub counts={statusCounts} />
        <div className="lg:col-span-3">
          <SectionHubCards
            creatives={creatives}
            pixelEvents={0}
            pixelCount={0}
            analyticsConversions={conversions}
            analyticsRevenue={revenue}
          />
        </div>
      </div>

      {/* Campaign alerts */}
      <CampaignAlertsWidget alerts={campaignAlerts} />

      {/* Top campaigns */}
      <TopCampaignsTable campaigns={topCampaigns} />
    </div>
  );
}
