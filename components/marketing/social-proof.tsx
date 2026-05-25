const TESTIMONIALS = [
  {
    quote:
      "Reduzi o CPA das campanhas em 34% no primeiro mês. O pixel server-side sozinho já pagou o plano.",
    author: "Fernanda Costa",
    role: "Diretora de Performance · Agência Pulse",
    initials: "FC",
  },
  {
    quote:
      "Antes usava 4 ferramentas diferentes. Agora centralizo tudo no AdFlow e minha equipe ganhou 10h por semana.",
    author: "Rafael Monteiro",
    role: "Head de Mídia Paga · BrandLab",
    initials: "RM",
  },
  {
    quote:
      "O AI Creative Studio gera variações que eu nunca pensaria. O score de qualidade virou nosso padrão de aprovação.",
    author: "Juliana Pires",
    role: "Creative Strategist · ThinkAds",
    initials: "JP",
  },
];

export function SocialProof() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 border-t border-[color:var(--adflow-border)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-[color:var(--adflow-fg)] mb-3">
            Agências que já usam o AdFlow
          </h2>
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            Resultados reais de quem gerencia mídia todo dia.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="p-5 rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]"
            >
              <p className="text-sm text-[color:var(--adflow-fg)] leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[color:var(--adflow-accent)]/15 flex items-center justify-center text-xs font-semibold text-[color:var(--adflow-accent)]">
                  {t.initials}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--adflow-fg)]">
                    {t.author}
                  </div>
                  <div className="text-xs text-[color:var(--adflow-fg-muted)]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
