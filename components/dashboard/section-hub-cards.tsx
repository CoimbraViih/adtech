import Link from "next/link";
import { ArrowRight, Wand2, Radio, BarChart2 } from "lucide-react";

type HubCardProps = {
  title: string;
  icon: React.ElementType;
  stats: { label: string; value: string }[];
  href: string;
  accentColor?: string;
};

function HubCard({ title, icon: Icon, stats, href, accentColor = "var(--adflow-data)" }: HubCardProps) {
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
        <span className="text-sm font-medium text-[color:var(--adflow-fg)]">{title}</span>
      </div>
      <div className="space-y-1.5">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--adflow-fg-muted)]">{s.label}</span>
            <span className="text-xs font-semibold text-[color:var(--adflow-fg)] tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs mt-auto"
        style={{ color: accentColor }}
      >
        Abrir <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

type Props = {
  creatives: { total: number; approved: number; avgScore: number | null };
  pixelEvents: number;
  pixelCount: number;
  analyticsConversions: number;
  analyticsRevenue: number;
};

export function SectionHubCards({ creatives, pixelEvents, pixelCount, analyticsConversions, analyticsRevenue }: Props) {
  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const NUM = new Intl.NumberFormat("pt-BR");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <HubCard
        title="AI Creative Studio"
        icon={Wand2}
        accentColor="var(--adflow-accent)"
        href="/creatives"
        stats={[
          { label: "Copies geradas", value: NUM.format(creatives.total) },
          { label: "Aprovadas", value: NUM.format(creatives.approved) },
          { label: "Score médio", value: creatives.avgScore !== null ? `${creatives.avgScore}/100` : "—" },
        ]}
      />
      <HubCard
        title="Pixel & Tracking"
        icon={Radio}
        accentColor="var(--adflow-success)"
        href="/pixel"
        stats={[
          { label: "Pixels ativos", value: NUM.format(pixelCount) },
          { label: "Eventos capturados", value: NUM.format(pixelEvents) },
        ]}
      />
      <HubCard
        title="Analytics"
        icon={BarChart2}
        accentColor="var(--adflow-data)"
        href="/analytics"
        stats={[
          { label: "Conversões rastreadas", value: NUM.format(analyticsConversions) },
          { label: "Receita atribuída", value: BRL.format(analyticsRevenue) },
        ]}
      />
    </div>
  );
}
