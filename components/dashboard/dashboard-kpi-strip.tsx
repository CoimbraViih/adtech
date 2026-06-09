import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DashboardKpis } from "@/types/dashboard";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

type KpiDef = {
  label: string;
  value: string;
  delta: number;
  invertDelta?: boolean;
};

function Delta({ delta, invert }: { delta: number; invert?: boolean }) {
  const good = invert ? delta < 0 : delta > 0;
  const bad = invert ? delta > 0 : delta < 0;
  if (delta === 0) return <span className="flex items-center gap-1 text-[color:var(--adflow-fg-muted)] text-xs"><Minus className="w-3 h-3" /> estável</span>;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${good ? "text-[color:var(--adflow-success)]" : bad ? "text-[color:var(--adflow-danger)]" : "text-[color:var(--adflow-fg-muted)]"}`}>
      {good ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

type Props = { kpis: DashboardKpis; deltas: DashboardKpis; showDelta: boolean };

export function DashboardKpiStrip({ kpis, deltas, showDelta }: Props) {
  const cards: KpiDef[] = [
    { label: "Spend Total", value: BRL.format(kpis.spend), delta: deltas.spend },
    { label: "Receita", value: BRL.format(kpis.revenue), delta: deltas.revenue },
    { label: "ROAS", value: `${kpis.roas.toFixed(2)}x`, delta: deltas.roas },
    { label: "CPA", value: BRL.format(kpis.cpa), delta: deltas.cpa, invertDelta: true },
    { label: "Conversões", value: NUM.format(kpis.conversions), delta: deltas.conversions },
    { label: "CTR", value: `${kpis.ctr.toFixed(2)}%`, delta: deltas.ctr },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-2">
          <span className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide font-medium">{c.label}</span>
          <span className="text-xl font-semibold text-[color:var(--adflow-fg)] font-mono tabular-nums">{c.value}</span>
          {showDelta && <Delta delta={c.delta} invert={c.invertDelta} />}
        </div>
      ))}
    </div>
  );
}
