import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { Plus, Activity, TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { RtbCampaignsTable } from "@/components/campaigns/rtb-campaigns-table";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
import { canAccessProgrammatic } from "@/lib/stripe/plans";
import { UpgradeBanner } from "@/components/billing/upgrade-banner";
import type { RtbCampaign } from "@/types/database";

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
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const plan = session.organization.plan;
  if (!canAccessProgrammatic(plan)) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">Programático</h1>
        <UpgradeBanner feature="Programático RTB" requiredPlan="agency" currentPlan={plan} />
      </div>
    );
  }

  const sp = await searchParams;
  const dateFrom =
    sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare: CompareMode = (
    ["prev_period", "prev_year", "none"] as CompareMode[]
  ).includes(sp.compare as CompareMode)
    ? (sp.compare as CompareMode)
    : "prev_period";

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("rtb_campaigns")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("created_at", { ascending: false });

  const rtbCampaigns: RtbCampaign[] = data ?? [];

  const totalBids = rtbCampaigns.reduce((s, c) => s + c.impressions, 0);
  const totalWins = rtbCampaigns.reduce((s, c) => s + c.wins, 0);
  const totalSpend = rtbCampaigns.reduce((s, c) => s + c.spend, 0);
  const winRate = totalBids > 0 ? totalWins / totalBids : 0;
  const avgCpm = totalWins > 0 ? (totalSpend / totalWins) * 1000 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Campanhas Programáticas
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {rtbCampaigns.filter((c) => c.status === "active").length} ativa
            {rtbCampaigns.filter((c) => c.status === "active").length !== 1 ? "s" : ""}{" "}
            de {rtbCampaigns.length} no total
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
        <KpiCard label="Total de Bids" value={fmt(totalBids)} icon={Activity} />
        <KpiCard
          label="Win Rate"
          value={`${fmt(winRate * 100, 1)}%`}
          icon={TrendingUp}
          highlight={winRate >= 0.4}
        />
        <KpiCard label="CPM Médio" value={`R$ ${fmt(avgCpm, 2)}`} icon={BarChart2} />
        <KpiCard label="Gasto Total" value={`R$ ${fmt(totalSpend, 2)}`} icon={DollarSign} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <RtbCampaignsTable campaigns={rtbCampaigns} />
      </div>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
};

function KpiCard({ label, value, icon: Icon, highlight }: KpiCardProps) {
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
          highlight ? "text-[color:var(--adflow-success)]" : "text-[color:var(--adflow-fg)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
