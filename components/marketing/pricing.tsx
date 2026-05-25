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
    description: "Para testar a plataforma com uma conta.",
    features: [
      "1 workspace",
      "Até 5 campanhas ativas",
      "AI Creative Studio (10 gerações/mês)",
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
    description: "Para agências em crescimento gerenciando múltiplos clientes.",
    features: [
      "Até 10 workspaces",
      "Campanhas ilimitadas",
      "AI Creative Studio ilimitado",
      "Pixels ilimitados",
      "Analytics completo + atribuição multi-touch",
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
    description: "Para grandes agências e grupos de mídia programática.",
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
      className="py-20 md:py-28 px-4 sm:px-6 border-t border-[color:var(--adflow-border)]"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-[color:var(--adflow-fg)] mb-3">
            Planos simples, sem surpresas
          </h2>
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            Comece grátis. Escale conforme sua agência cresce.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-lg border flex flex-col ${
                plan.highlighted
                  ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-surface)]"
                  : "border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-0.5 rounded-full bg-[color:var(--adflow-accent)] text-white text-xs font-semibold">
                    Mais popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] mb-1 uppercase tracking-wide">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[color:var(--adflow-fg)]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[color:var(--adflow-fg-muted)]">{plan.period}</span>
                </div>
                <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-2">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[color:var(--adflow-success)] shrink-0 mt-0.5" />
                    <span className="text-xs text-[color:var(--adflow-fg)]">{feat}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#waitlist"
                className={`block w-full text-center py-2 rounded-md text-sm font-semibold transition-opacity ${
                  plan.highlighted
                    ? "bg-[color:var(--adflow-accent)] text-white hover:opacity-90"
                    : "border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] hover:border-[color:var(--adflow-fg-muted)]"
                }`}
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
