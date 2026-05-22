import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
import { DashboardKpiStrip } from "@/components/dashboard/dashboard-kpi-strip";
import { RevenueBarChart } from "@/components/dashboard/revenue-bar-chart";
import { RoasSpendChart } from "@/components/dashboard/roas-spend-chart";
import { ImpressionsConversionsChart } from "@/components/dashboard/impressions-conversions-chart";
import { CampaignStatusHub } from "@/components/dashboard/campaign-status-hub";
import { SectionHubCards } from "@/components/dashboard/section-hub-cards";
import { TopCampaignsTable } from "@/components/dashboard/top-campaigns-table";
import {
  getDashboardKpis,
  getKpiDeltas,
  getCampaignStatusCounts,
  getTopCampaigns,
  getRevenueByDay,
  getRoasAndSpendByDay,
  getImpressionsAndConversionsByDay,
  getCreativesSummary,
} from "@/lib/dashboard/mock-data";

type SearchParams = { from?: string; to?: string; compare?: string };

const VALID_COMPARES = ["prev_period", "prev_year", "none"] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  const _workspaceId = session.workspace.id;

  const sp = await searchParams;
  const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare: CompareMode = (VALID_COMPARES as readonly string[]).includes(sp.compare ?? "")
    ? (sp.compare as CompareMode)
    : "prev_period";

  const kpis = getDashboardKpis();
  const deltas = getKpiDeltas();
  const statusCounts = getCampaignStatusCounts();
  const topCampaigns = getTopCampaigns(5);
  const revenueData = getRevenueByDay(dateFrom, dateTo);
  const roasSpendData = getRoasAndSpendByDay(dateFrom, dateTo);
  const impConvData = getImpressionsAndConversionsByDay(dateFrom, dateTo);
  const creatives = getCreativesSummary();

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
            pixelEvents={1_243}
            pixelCount={2}
            analyticsConversions={247}
            analyticsRevenue={48_750}
          />
        </div>
      </div>

      {/* Top campaigns */}
      <TopCampaignsTable campaigns={topCampaigns} />
    </div>
  );
}
