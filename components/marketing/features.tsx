import { BarChart2, Sparkles, Radio, LineChart, Zap, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
};

const FEATURES: Feature[] = [
  {
    icon: BarChart2,
    title: "Campanhas Unificadas",
    description: "Gerencie Meta e Google num único painel. Sincronização automática de métricas em tempo real.",
    color: "#3B82F6",
  },
  {
    icon: Sparkles,
    title: "AI Creative Studio",
    description: "Gere headlines e CTAs com GPT-4o. Score 0-100 com checagem de política embutida.",
    color: "#E8390E",
  },
  {
    icon: Radio,
    title: "Pixel Server-Side",
    description: "Tracking resistente a bloqueadores. Integração nativa com Meta CAPI e Google Enhanced.",
    color: "#10B981",
  },
  {
    icon: LineChart,
    title: "Analytics Multi-Touch",
    description: "Attribution last-click, linear e time-decay. Funil de conversão completo por canal.",
    color: "#8B5CF6",
  },
  {
    icon: Globe,
    title: "Programático RTB",
    description: "Mídia programática via OpenRTB 2.6. DMP proprietário com segmentação comportamental.",
    color: "#F59E0B",
  },
  {
    icon: Zap,
    title: "Automação & Alertas",
    description: "Alertas em tempo real para ROAS, CPA e gasto. Notificações in-app e por e-mail.",
    color: "#06B6D4",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden"
    >
      {/* Grid bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Top separator */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.3),transparent)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#E8390E" }}>
            Plataforma
          </p>
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{
              background: "linear-gradient(135deg,#F1F5F9 30%,#64748B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Tudo que sua agência precisa
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: "#475569" }}>
            Um loop fechado: IA gera criativos → campanhas rodam → pixel captura conversões → analytics otimiza → repete.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group relative p-6 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                  transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = `${feat.color}40`;
                  el.style.boxShadow = `0 0 30px ${feat.color}12, 0 8px 32px rgba(0,0,0,0.3)`;
                  el.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(255,255,255,0.06)";
                  el.style.boxShadow = "none";
                  el.style.transform = "translateY(0)";
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 inset-x-0 h-px"
                  style={{ background: `linear-gradient(90deg,transparent,${feat.color}60,transparent)` }}
                />

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: `${feat.color}12`,
                    border: `1px solid ${feat.color}25`,
                    boxShadow: `0 0 16px ${feat.color}10`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>

                <h3 className="text-sm font-semibold mb-2" style={{ color: "#E2E8F0" }}>
                  {feat.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
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
