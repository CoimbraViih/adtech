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

const MOCK_KPI: KpiSummary = {
  total_events: 12_483,
  total_conversions: 247,
  total_revenue: 48_750,
  cpa: 197.37,
  avg_order_value: 540.56,
};

const MOCK_FUNNEL: FunnelStep[] = [
  { event_type: "page_view", label: "Visitas", count: 12_483, drop_off_rate: 0 },
  { event_type: "lead", label: "Leads", count: 1_420, drop_off_rate: 0.886 },
  { event_type: "add_to_cart", label: "Carrinho", count: 538, drop_off_rate: 0.621 },
  { event_type: "purchase", label: "Compras", count: 90, drop_off_rate: 0.833 },
];

const MOCK_CHANNELS: ChannelAttribution[] = [
  { channel: "google", conversions: 110, revenue: 22_000, attribution_share: 0.451 },
  { channel: "facebook", conversions: 75, revenue: 15_750, attribution_share: 0.323 },
  { channel: "organic", conversions: 40, revenue: 8_000, attribution_share: 0.164 },
  { channel: "direct", conversions: 22, revenue: 3_000, attribution_share: 0.062 },
];

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
  const _workspaceId = session.workspace.id;

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

  // TODO(M5-backend): replace with real Supabase queries once M1-backend lands
  // const [kpi, funnel, channels] = await Promise.all([
  //   getKpiSummary(session.workspace.id, dateFrom, dateTo),
  //   getFunnelSteps(session.workspace.id, dateFrom, dateTo),
  //   getChannelAttribution(session.workspace.id, dateFrom, dateTo, model),
  // ]);
  void getKpiSummary; void getFunnelSteps; void getChannelAttribution;
  const kpi = MOCK_KPI;
  const funnel = MOCK_FUNNEL;
  const channels = MOCK_CHANNELS;

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
