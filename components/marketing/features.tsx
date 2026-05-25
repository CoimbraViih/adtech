import { BarChart2, Sparkles, Radio, LineChart, Zap, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: BarChart2,
    title: "Campanhas Unificadas",
    description:
      "Crie e gerencie campanhas Meta e Google num único lugar. Sincronização automática de métricas em tempo real.",
  },
  {
    icon: Sparkles,
    title: "AI Creative Studio",
    description:
      "Gere headlines, descrições e CTAs com GPT-4o. Score de qualidade 0-100 com checagem de política Meta/Google embutida.",
  },
  {
    icon: Radio,
    title: "Pixel Server-Side",
    description:
      "Tracking server-side resistente a bloqueadores de anúncio. Integração nativa com Meta CAPI e Google Enhanced Conversions.",
  },
  {
    icon: LineChart,
    title: "Analytics Multi-Touch",
    description:
      "Attribution com modelos last-click, linear e time-decay. Funil de conversão completo por canal e campanha.",
  },
  {
    icon: Globe,
    title: "Programático RTB",
    description:
      "Compra de mídia programática via OpenRTB 2.6. DMP proprietário com segmentação comportamental baseada nos seus pixels.",
  },
  {
    icon: Zap,
    title: "Automação & Alertas",
    description:
      "Alertas automáticos para ROAS caindo, CPA explodindo e gasto acima do limite. Notificações in-app e por e-mail em minutos.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-20 md:py-28 px-4 sm:px-6 border-t border-[color:var(--adflow-border)]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-[color:var(--adflow-fg)] mb-3">
            Tudo que sua agência precisa
          </h2>
          <p className="text-[color:var(--adflow-fg-muted)] max-w-xl mx-auto text-sm md:text-base">
            Um loop fechado de otimização: IA gera criativos → campanhas rodam → pixel captura
            conversões → analytics identifica o que funcionou → IA melhora o próximo.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group p-5 rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] hover:border-[color:var(--adflow-accent)]/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-[color:var(--adflow-accent)]/10 group-hover:bg-[color:var(--adflow-accent)]/20 flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-4 h-4 text-[color:var(--adflow-accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-1.5">
                  {feat.title}
                </h3>
                <p className="text-xs text-[color:var(--adflow-fg-muted)] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
