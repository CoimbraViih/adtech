import Link from "next/link";
import { Suspense } from "react";
import type { ComponentType } from "react";
import { Plus, Activity, TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { RtbCampaignsTable } from "@/components/campaigns/rtb-campaigns-table";
import { MOCK_RTB_CAMPAIGNS, getMockRtbKpis } from "@/lib/rtb/mock-data";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export default async function ProgrammaticPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; compare?: string }>;
}) {
  const sp = await searchParams;
  const dateFrom =
    sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare: CompareMode = (
    ["prev_period", "prev_year", "none"] as CompareMode[]
  ).includes(sp.compare as CompareMode)
    ? (sp.compare as CompareMode)
    : "prev_period";

  const kpis = getMockRtbKpis("ws_demo");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Campanhas Programáticas
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {MOCK_RTB_CAMPAIGNS.filter((c) => c.status === "active").length} ativa
            {MOCK_RTB_CAMPAIGNS.filter((c) => c.status === "active").length !== 1
              ? "s"
              : ""}{" "}
            de {MOCK_RTB_CAMPAIGNS.length} no total
          </p>
        </div>
        <Link
          href="/campaigns/programmatic/new"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha RTB
        </Link>
        <Suspense>
          <GlobalDateFilter
            currentFrom={dateFrom}
            currentTo={dateTo}
            currentCompare={compare}
          />
        </Suspense>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total de Bids"
          value={fmt(kpis.totalBids)}
          icon={Activity}
          change={+8.2}
        />
        <KpiCard
          label="Win Rate"
          value={`${fmt(kpis.winRate * 100, 1)}%`}
          icon={TrendingUp}
          change={+3.5}
          highlight={kpis.winRate >= 0.4}
        />
        <KpiCard
          label="CPM Médio"
          value={`R$ ${fmt(kpis.avgCpm, 2)}`}
          icon={BarChart2}
          change={-2.1}
          invertChange
        />
        <KpiCard
          label="Gasto Total"
          value={`R$ ${fmt(kpis.totalSpend, 2)}`}
          icon={DollarSign}
          change={+14.7}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <RtbCampaignsTable campaigns={MOCK_RTB_CAMPAIGNS} />
      </div>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  change: number;
  highlight?: boolean;
  invertChange?: boolean;
};

function KpiCard({
  label,
  value,
  icon: Icon,
  change,
  highlight,
  invertChange,
}: KpiCardProps) {
  const isPositive = invertChange ? change <= 0 : change >= 0;
  const ChangeIcon = change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          {label}
        </span>
        <div className="w-7 h-7 rounded-md bg-[color:var(--adflow-border)] flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
        </div>
      </div>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          highlight
            ? "text-[color:var(--adflow-success)]"
            : "text-[color:var(--adflow-fg)]"
        }`}
      >
        {value}
      </p>
      <div className="flex items-center gap-1 mt-1.5">
        <ChangeIcon
          className={`w-3 h-3 ${
            isPositive
              ? "text-[color:var(--adflow-success)]"
              : "text-[color:var(--adflow-danger)]"
          }`}
        />
        <span
          className={`text-xs ${
            isPositive
              ? "text-[color:var(--adflow-success)]"
              : "text-[color:var(--adflow-danger)]"
          }`}
        >
          {change > 0 ? "+" : ""}
          {change}% vs mês anterior
        </span>
      </div>
    </div>
  );
}
