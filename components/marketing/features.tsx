"use client";

// Features — dense grid, Linear.app aesthetic.
// Ember only on interactive elements. No decorative color.

const FEATURES = [
  {
    index: "01",
    title: "Campanhas Unificadas",
    description: "Meta e Google num único painel. Crie, pause e monitore campanhas com sincronização automática de métricas em tempo real.",
    tag: "Meta · Google · Programático",
  },
  {
    index: "02",
    title: "AI Creative Studio",
    description: "GPT-4o gera headlines, descrições e CTAs a partir do seu briefing. Score 0–100 com checagem de política Meta/Google embutida.",
    tag: "Criativos · Copy · Score",
  },
  {
    index: "03",
    title: "Pixel Server-Side",
    description: "Tracking resistente a bloqueadores. Fan-out automático para Meta CAPI e Google Enhanced Conversions sem alterar seu site.",
    tag: "CAPI · Enhanced Conv. · LGPD",
  },
  {
    index: "04",
    title: "Analytics Multi-Touch",
    description: "Attribution last-click, linear e time-decay. Funil de conversão por canal com drill-down por campanha, criativo e público.",
    tag: "Last-click · Linear · Time-decay",
  },
  {
    index: "05",
    title: "Programático RTB",
    description: "Compra de mídia via OpenRTB 2.6. DMP proprietário com segmentação por eventos de pixel — sem depender de dados de terceiros.",
    tag: "OpenRTB 2.6 · DMP · Audiências",
  },
  {
    index: "06",
    title: "Alertas Automáticos",
    description: "ROAS caiu abaixo do threshold? CPA explodiu? Notificação em minutos, direto no app e por e-mail, com sugestão de ação.",
    tag: "ROAS · CPA · Spend · CTR",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b" style={{ borderColor: "#1E1E2E" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Section header */}
        <div className="flex items-baseline justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #1E1E2E" }}>
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
            >
              02 — Plataforma
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "var(--font-space-grotesk),sans-serif", color: "#F1F5F9" }}
            >
              Loop fechado de otimização
            </h2>
          </div>
          <p className="hidden md:block text-sm max-w-xs text-right" style={{ color: "#475569" }}>
            IA cria → pixel mede → analytics aprende → IA melhora
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-px" style={{ background: "#1E1E2E" }}>
          {FEATURES.map((f) => (
            <div
              key={f.index}
              className="p-5 group"
              style={{ background: "#0D0D1A" }}
            >
              <div className="flex items-start gap-4">
                <span
                  className="text-xs font-medium mt-0.5 shrink-0"
                  style={{
                    fontFamily: "var(--font-jetbrains),monospace",
                    color: "#1E1E2E",
                  }}
                >
                  {f.index}
                </span>
                <div>
                  <h3
                    className="text-sm font-semibold mb-1.5"
                    style={{
                      fontFamily: "var(--font-space-grotesk),sans-serif",
                      color: "#E2E8F0",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "#475569" }}>
                    {f.description}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-jetbrains),monospace",
                      color: "#334155",
                    }}
                  >
                    {f.tag}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
