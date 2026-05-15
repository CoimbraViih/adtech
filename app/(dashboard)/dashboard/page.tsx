import { KpiCard } from "@/components/dashboard/kpi-card";

const MOCK_KPIS = [
  {
    label: "ROAS",
    value: "3.24x",
    delta: 12,
    deltaLabel: "+12% vs mês anterior",
  },
  {
    label: "CPA",
    value: "R$ 48,20",
    delta: -8,
    deltaLabel: "-8% vs mês anterior",
  },
  {
    label: "Spend Total",
    value: "R$ 24.800",
    delta: 5,
    deltaLabel: "+5% vs mês anterior",
  },
  {
    label: "Conversões",
    value: "514",
    delta: 0,
    deltaLabel: "estável",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">
          Dashboard
        </h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
          Visão geral dos últimos 30 dias
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-8 text-center">
        <p className="text-[color:var(--adflow-fg-muted)] text-sm">
          Gráficos de performance serão adicionados no M5 (Analytics)
        </p>
      </div>
    </div>
  );
}
