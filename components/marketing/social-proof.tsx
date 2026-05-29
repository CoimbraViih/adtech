const TESTIMONIALS = [
  {
    quote: "Reduzi o CPA em 34% no primeiro mês. O pixel server-side sozinho já pagou o plano.",
    author: "Fernanda Costa",
    role: "Diretora de Performance · Agência Pulse",
    initials: "FC",
    color: "#E8390E",
  },
  {
    quote: "Antes usava 4 ferramentas. Agora centralizo tudo no AdFlow e ganho 10h por semana.",
    author: "Rafael Monteiro",
    role: "Head de Mídia Paga · BrandLab",
    initials: "RM",
    color: "#3B82F6",
  },
  {
    quote: "O AI Creative Studio gera variações incríveis. O score virou nosso padrão de aprovação.",
    author: "Juliana Pires",
    role: "Creative Strategist · ThinkAds",
    initials: "JP",
    color: "#8B5CF6",
  },
];

export function SocialProof() {
  return (
    <section className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.3),transparent)" }}
      />

      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#3B82F6" }}>
            Depoimentos
          </p>
          <h2
            className="text-3xl md:text-5xl font-bold"
            style={{
              background: "linear-gradient(135deg,#F1F5F9 30%,#64748B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Agências que já usam
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="relative p-6 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${t.color}18`,
                boxShadow: `0 0 40px ${t.color}06`,
              }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 inset-x-0 h-px"
                style={{ background: `linear-gradient(90deg,transparent,${t.color}50,transparent)` }}
              />

              {/* Quote mark */}
              <div
                className="text-5xl font-serif leading-none mb-3 select-none"
                style={{ color: t.color, opacity: 0.4, textShadow: `0 0 20px ${t.color}` }}
              >
                "
              </div>

              <p className="text-sm leading-relaxed mb-5" style={{ color: "#94A3B8" }}>
                {t.quote}
              </p>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: `${t.color}15`,
                    border: `1px solid ${t.color}30`,
                    color: t.color,
                    boxShadow: `0 0 12px ${t.color}20`,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: "#E2E8F0" }}>
                    {t.author}
                  </div>
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
