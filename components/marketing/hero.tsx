export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 md:py-36 px-4 sm:px-6">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(232,57,14,0.14) 0%, transparent 65%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] text-xs text-[color:var(--adflow-fg-muted)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--adflow-success)]" />
          Plataforma all-in-one para agências brasileiras
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[color:var(--adflow-fg)] leading-[1.1] mb-5">
          Publicidade com IA.{" "}
          <span className="text-[color:var(--adflow-accent)]">Resultados reais.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-[color:var(--adflow-fg-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Unifique campanhas Meta e Google, gere criativos automaticamente, rastreie conversões
          server-side e otimize com attribution multi-touch — tudo num único dashboard.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#waitlist"
            className="w-full sm:w-auto px-8 py-3 rounded-md bg-[color:var(--adflow-accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Começar grátis →
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3 rounded-md border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] font-semibold text-sm hover:text-[color:var(--adflow-fg)] hover:border-[color:var(--adflow-fg-muted)] transition-colors"
          >
            Ver features
          </a>
        </div>

        {/* Stats strip */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          {[
            { value: "R$ 2M+", label: "em gasto gerenciado" },
            { value: "500+", label: "campanhas ativas" },
            { value: "4.8×", label: "ROAS médio" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-[color:var(--adflow-fg)]">{stat.value}</div>
              <div className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-2 shadow-2xl shadow-black/40">
          {/* Fake browser chrome */}
          <div className="flex items-center gap-1.5 px-3 pb-2 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--adflow-border)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--adflow-border)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--adflow-border)]" />
            <div className="flex-1 mx-3 h-5 rounded bg-[color:var(--adflow-border)]/40 flex items-center justify-center">
              <span className="text-[10px] text-[color:var(--adflow-fg-muted)]">app.adflow.io/dashboard</span>
            </div>
          </div>
          {/* Fake dashboard grid */}
          <div className="rounded-lg bg-[color:var(--adflow-base)] p-4 h-64 md:h-80">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {["ROAS", "CPA", "Spend", "Conv."].map((label) => (
                <div
                  key={label}
                  className="rounded-md bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-3"
                >
                  <div className="text-[10px] text-[color:var(--adflow-fg-muted)] mb-1">{label}</div>
                  <div className="h-4 w-16 rounded bg-[color:var(--adflow-border)]/60" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 rounded-md bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] h-36 p-3 flex flex-col justify-end gap-1">
                <div className="flex items-end gap-1 h-20">
                  {[40, 65, 55, 80, 70, 90, 75, 85, 95, 72, 88, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-[color:var(--adflow-accent)]/40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-[color:var(--adflow-fg-muted)]">Spend últimos 30 dias</div>
              </div>
              <div className="rounded-md bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] h-36 p-3">
                <div className="text-[10px] text-[color:var(--adflow-fg-muted)] mb-2">Campanhas</div>
                <div className="space-y-1.5">
                  {["Meta Ads", "Google", "Programático"].map((c) => (
                    <div key={c} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--adflow-accent)]" />
                      <div className="flex-1 h-1.5 rounded-full bg-[color:var(--adflow-border)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--adflow-data)]"
                          style={{ width: c === "Meta Ads" ? "70%" : c === "Google" ? "50%" : "30%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
