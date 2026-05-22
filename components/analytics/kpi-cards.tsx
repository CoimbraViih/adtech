import type { KpiSummary } from "@/types/database";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR");

type Props = { kpi: KpiSummary };

export function KpiCards({ kpi }: Props) {
  const cards = [
    { label: "Total de Eventos", value: NUM.format(kpi.total_events), color: "text-white" },
    { label: "Conversões", value: NUM.format(kpi.total_conversions), color: "text-success" },
    { label: "Receita", value: BRL.format(kpi.total_revenue), color: "text-data" },
    { label: "CPA", value: kpi.cpa > 0 ? BRL.format(kpi.cpa) : "—", color: "text-warning" },
    { label: "Ticket Médio", value: kpi.avg_order_value > 0 ? BRL.format(kpi.avg_order_value) : "—", color: "text-white" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">{c.label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
