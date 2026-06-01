const TESTIMONIALS = [
  {
    metric: "−34%",
    metricLabel: "no CPA",
    metricColor: "#10B981",
    quote:
      "O pixel server-side mudou o jogo. Dados de conversão mais limpos, menos fugas. O CPA caiu 34% no primeiro mês sem mexer nos criativos.",
    author: "Fernanda Costa",
    role: "Diretora de Performance · Agência Pulse",
  },
  {
    metric: "10h",
    metricLabel: "poupadas/sem.",
    metricColor: "#F1F5F9",
    quote:
      "Centralizei Meta e Google numa tela. O tempo que perdia trocando de aba e consolidando planilhas agora vai pra otimização de verdade.",
    author: "Rafael Monteiro",
    role: "Head de Mídia Paga · BrandLab",
  },
  {
    metric: ">80",
    metricLabel: "score criativo",
    metricColor: "#3B82F6",
    quote:
      "Antes aprovava criativo no feeling. Agora uso o score 0–100 com checagem de política. O CTR médio dos anúncios subiu 22%.",
    author: "Juliana Pires",
    role: "Creative Strategist · ThinkAds",
  },
];

export function SocialProof() {
  return (
    <section className="border-b" style={{ borderColor: "#1E1E2E" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #1E1E2E" }}>
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
            >
              03 — Resultados
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "var(--font-space-grotesk),sans-serif", color: "#F1F5F9" }}
            >
              Dados de quem usa todo dia
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-px" style={{ background: "#1E1E2E" }}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="p-5"
              style={{ background: "#0D0D1A" }}
            >
              {/* Metric hero */}
              <div className="mb-4 pb-4" style={{ borderBottom: "1px solid #1E1E2E" }}>
                <div
                  className="text-3xl font-bold"
                  style={{
                    fontFamily: "var(--font-jetbrains),monospace",
                    color: t.metricColor,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {t.metric}
                </div>
                <div
                  className="text-[10px] uppercase tracking-widest mt-0.5"
                  style={{ color: "#334155", fontFamily: "var(--font-manrope),sans-serif" }}
                >
                  {t.metricLabel}
                </div>
              </div>

              <p className="text-xs leading-relaxed mb-4" style={{ color: "#64748B" }}>
                "{t.quote}"
              </p>

              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "#94A3B8", fontFamily: "var(--font-manrope),sans-serif" }}
                >
                  {t.author}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "#334155" }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
