import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns/mock-data";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export default function CampaignsPage() {
  const active = MOCK_CAMPAIGNS.filter((c) => c.status === "active");
  const totalSpend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalConversions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">Campanhas</h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {active.length} ativa{active.length !== 1 ? "s" : ""} de {MOCK_CAMPAIGNS.length} no total
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova campanha
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Gasto total"
          value={`R$ ${fmt(totalSpend, 2)}`}
          icon={DollarSign}
          change={+12.4}
        />
        <KpiCard
          label="ROAS médio"
          value={`${fmt(avgRoas, 2)}x`}
          icon={TrendingUp}
          change={+8.1}
          highlight={avgRoas >= 3}
        />
        <KpiCard
          label="CPA médio"
          value={`R$ ${fmt(avgCpa, 2)}`}
          icon={TrendingDown}
          change={-4.3}
          invertChange
        />
        <KpiCard
          label="Conversões"
          value={fmt(totalConversions)}
          icon={Target}
          change={+21.7}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <CampaignTable campaigns={MOCK_CAMPAIGNS} />
      </div>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: number;
  highlight?: boolean;
  invertChange?: boolean;
};

function KpiCard({ label, value, icon: Icon, change, highlight, invertChange }: KpiCardProps) {
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
          highlight ? "text-[color:var(--adflow-success)]" : "text-[color:var(--adflow-fg)]"
        }`}
      >
        {value}
      </p>
      <div className="flex items-center gap-1 mt-1.5">
        <ChangeIcon
          className={`w-3 h-3 ${
            isPositive ? "text-[color:var(--adflow-success)]" : "text-[color:var(--adflow-danger)]"
          }`}
        />
        <span
          className={`text-xs ${
            isPositive ? "text-[color:var(--adflow-success)]" : "text-[color:var(--adflow-danger)]"
          }`}
        >
          {change > 0 ? "+" : ""}{change}% vs mês anterior
        </span>
      </div>
    </div>
  );
}
