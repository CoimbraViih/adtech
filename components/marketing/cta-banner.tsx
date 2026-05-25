export function CtaBanner() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 border-t border-[color:var(--adflow-border)]">
      <div className="max-w-3xl mx-auto text-center">
        <div
          className="rounded-xl p-10 md:p-16"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(232,57,14,0.12) 0%, transparent 70%), var(--adflow-surface)",
            border: "1px solid rgba(232,57,14,0.25)",
          }}
        >
          <h2 className="text-2xl md:text-4xl font-bold text-[color:var(--adflow-fg)] mb-4">
            Pronto para escalar com IA?
          </h2>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mb-8 max-w-md mx-auto leading-relaxed">
            Entre na lista de espera e ganhe 3 meses de Pro grátis para agências que fizerem
            onboarding no lançamento.
          </p>
          <a
            href="#waitlist"
            className="inline-block px-8 py-3 rounded-md bg-[color:var(--adflow-accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Garantir minha vaga →
          </a>
        </div>
      </div>
    </section>
  );
}
