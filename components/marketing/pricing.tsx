import { Check, Minus } from "lucide-react";

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
    price: "R$0",
    period: "/mês",
    description: "Para testar a plataforma.",
    features: [
      "1 workspace",
      "5 campanhas ativas",
      "10 gerações de copy/mês",
      "1 pixel de tracking",
      "Analytics 30 dias",
      "—",
      "—",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$500",
    period: "/mês",
    description: "Para agências em crescimento.",
    features: [
      "Até 10 workspaces",
      "Campanhas ilimitadas",
      "Copy ilimitada + score",
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
    price: "R$3.000",
    period: "/mês",
    description: "Para grandes grupos de mídia.",
    features: [
      "Workspaces ilimitados",
      "Campanhas ilimitadas",
      "Copy ilimitada + score",
      "Pixels ilimitados",
      "Analytics + DMP proprietário",
      "RTB programático",
      "SLA + onboarding guiado",
    ],
    cta: "Falar com vendas",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b" style={{ borderColor: "#1E1E2E" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #1E1E2E" }}>
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
            >
              04 — Planos
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "var(--font-space-grotesk),sans-serif", color: "#F1F5F9" }}
            >
              Simples. Sem surpresas.
            </h2>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-px" style={{ background: "#1E1E2E" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col p-5"
              style={{
                background: plan.highlighted ? "#13131F" : "#0D0D1A",
                borderTop: plan.highlighted ? `2px solid #E8390E` : "2px solid transparent",
              }}
            >
              {/* Plan header */}
              <div className="mb-5">
                <p
                  className="text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: plan.highlighted ? "#E8390E" : "#475569", fontFamily: "var(--font-manrope),sans-serif" }}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-3xl font-bold"
                    style={{
                      fontFamily: "var(--font-jetbrains),monospace",
                      color: "#F1F5F9",
                      letterSpacing: "-0.02em",
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

              {/* Feature list */}
              <ul className="space-y-2.5 flex-1 mb-5">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {feat === "—" ? (
                      <Minus className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#1E1E2E" }} />
                    ) : (
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                    )}
                    <span
                      className="text-xs"
                      style={{ color: feat === "—" ? "#1E1E2E" : "#64748B" }}
                    >
                      {feat === "—" ? "não incluído" : feat}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="#waitlist"
                className="block w-full text-center py-2 rounded text-xs font-semibold"
                style={
                  plan.highlighted
                    ? { background: "#E8390E", color: "#fff" }
                    : { border: "1px solid #1E1E2E", color: "#64748B" }
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
