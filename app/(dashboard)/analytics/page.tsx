import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { getKpiSummary, getFunnelSteps, getChannelAttribution } from "@/lib/analytics/aggregates";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { ChannelTable } from "@/components/analytics/channel-table";
import { AttributionModelSelector } from "@/components/analytics/attribution-model-selector";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
import type { AttributionModel, KpiSummary, FunnelStep, ChannelAttribution } from "@/types/database";

type SearchParams = { from?: string; to?: string; model?: string; compare?: string };

export default async function AnalyticsPage({
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
  const workspaceId = session.workspace.id;

  const sp = await searchParams;
  const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const model: AttributionModel =
    (["last_click", "linear", "time_decay"] as AttributionModel[]).includes(sp.model as AttributionModel)
      ? (sp.model as AttributionModel)
      : "last_click";
  const compare: CompareMode = (["prev_period", "prev_year", "none"] as CompareMode[]).includes(sp.compare as CompareMode)
    ? (sp.compare as CompareMode)
    : "prev_period";

  const [kpi, funnel, channels] = await Promise.all([
    getKpiSummary(workspaceId, dateFrom, dateTo),
    getFunnelSteps(workspaceId, dateFrom, dateTo),
    getChannelAttribution(workspaceId, dateFrom, dateTo, model),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics & Atribuição</h1>
          <p className="text-sm text-muted mt-1">
            Performance de conversões com modelos de atribuição multi-touch.
          </p>
        </div>
        <Suspense>
          <GlobalDateFilter currentFrom={dateFrom} currentTo={dateTo} currentCompare={compare} />
        </Suspense>
      </div>

      <KpiCards kpi={kpi} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FunnelChart steps={funnel} />

        <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Atribuição por Canal</h2>
            <Suspense>
              <AttributionModelSelector current={model} />
            </Suspense>
          </div>
          <ChannelTable channels={channels} />
        </div>
      </div>
    </div>
  );
}
