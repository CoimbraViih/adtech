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
import { CampaignAlertsWidget } from "@/components/dashboard/campaign-alerts-widget";
import {
  getDashboardKpis,
  getKpiDeltas,
  getCampaignStatusCounts,
  getTopCampaigns,
  getRevenueByDay,
  getRoasAndSpendByDay,
  getImpressionsAndConversionsByDay,
  getCreativesSummary,
  getCampaignAlerts,
} from "@/lib/dashboard/queries";

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
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const sp = await searchParams;
  const dateFrom =
    sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare = parseCompare(sp.compare);

  const workspaceId = session.workspace.id;

  const [
    kpis,
    deltas,
    statusCounts,
    topCampaigns,
    campaignAlerts,
    revenueData,
    roasSpendData,
    impConvData,
    creatives,
  ] = await Promise.all([
    getDashboardKpis(workspaceId),
    getKpiDeltas(),
    getCampaignStatusCounts(workspaceId),
    getTopCampaigns(workspaceId, 5),
    getCampaignAlerts(workspaceId),
    getRevenueByDay(workspaceId, dateFrom, dateTo),
    getRoasAndSpendByDay(workspaceId, dateFrom, dateTo),
    getImpressionsAndConversionsByDay(workspaceId, dateFrom, dateTo),
    getCreativesSummary(workspaceId),
  ]);

  return (
    <div className="space-y-6">
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

      <DashboardKpiStrip kpis={kpis} deltas={deltas} showDelta={compare !== "none"} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueBarChart data={revenueData} />
        <RoasSpendChart data={roasSpendData} />
      </div>

      <ImpressionsConversionsChart data={impConvData} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <CampaignStatusHub counts={statusCounts} />
        <div className="lg:col-span-3">
          <SectionHubCards
            creatives={creatives}
            pixelEvents={0}
            pixelCount={0}
            analyticsConversions={kpis.conversions}
            analyticsRevenue={kpis.revenue}
          />
        </div>
      </div>

      <CampaignAlertsWidget alerts={campaignAlerts} />
      <TopCampaignsTable campaigns={topCampaigns} />
    </div>
  );
}
