import { Check } from "lucide-react";

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    description: "Para testar a plataforma.",
    features: [
      "1 workspace",
      "Até 5 campanhas ativas",
      "AI Creative Studio (10/mês)",
      "1 pixel de tracking",
      "Analytics básico (30 dias)",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 500",
    period: "/mês",
    description: "Para agências em crescimento.",
    features: [
      "Até 10 workspaces",
      "Campanhas ilimitadas",
      "AI Creative Studio ilimitado",
      "Pixels ilimitados",
      "Analytics completo + multi-touch",
      "Alertas automáticos",
      "Suporte via e-mail",
    ],
    cta: "Começar Pro",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "R$ 3.000",
    period: "/mês",
    description: "Para grandes grupos de mídia.",
    features: [
      "Tudo do Pro",
      "Workspaces ilimitados",
      "Compra programática RTB",
      "DMP proprietário",
      "White-label (em breve)",
      "SLA + suporte dedicado",
      "Onboarding guiado",
    ],
    cta: "Falar com vendas",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden"
    >
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.3),transparent)" }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: "20%",
          left: "30%",
          background: "radial-gradient(circle,rgba(232,57,14,0.05) 0%,transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#E8390E" }}>
            Planos
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
            Simples. Sem surpresas.
          </h2>
          <p className="text-sm" style={{ color: "#475569" }}>
            Comece grátis. Escale conforme sua agência cresce.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="relative p-6 rounded-xl flex flex-col overflow-hidden"
              style={
                plan.highlighted
                  ? {
                      background: "rgba(232,57,14,0.04)",
                      border: "1px solid rgba(232,57,14,0.35)",
                      boxShadow: "0 0 50px rgba(232,57,14,0.1), 0 0 100px rgba(232,57,14,0.05)",
                      backdropFilter: "blur(16px)",
                    }
                  : {
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(12px)",
                    }
              }
            >
              {/* Top line */}
              <div
                className="absolute top-0 inset-x-0 h-px"
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(90deg,transparent,#E8390E,transparent)"
                    : "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)",
                }}
              />

              {plan.highlighted && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white"
                  style={{
                    background: "linear-gradient(135deg,#E8390E,#c42d07)",
                    boxShadow: "0 0 16px rgba(232,57,14,0.5)",
                  }}
                >
                  Mais popular
                </div>
              )}

              <div className="mb-5">
                <p
                  className="text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: plan.highlighted ? "#E8390E" : "#475569" }}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-4xl font-bold"
                    style={{
                      color: plan.highlighted ? "#F1F5F9" : "#94A3B8",
                      textShadow: plan.highlighted ? "0 0 20px rgba(232,57,14,0.3)" : "none",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {plan.period}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#475569" }}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check
                      className="w-3.5 h-3.5 shrink-0 mt-0.5"
                      style={{
                        color: plan.highlighted ? "#E8390E" : "#10B981",
                        filter: plan.highlighted ? "drop-shadow(0 0 4px rgba(232,57,14,0.6))" : "none",
                      }}
                    />
                    <span className="text-xs" style={{ color: "#64748B" }}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#waitlist"
                className="block w-full text-center py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider"
                style={
                  plan.highlighted
                    ? {
                        background: "linear-gradient(135deg,#E8390E,#c42d07)",
                        color: "#fff",
                        boxShadow: "0 0 20px rgba(232,57,14,0.35)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#64748B",
                      }
                }
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
