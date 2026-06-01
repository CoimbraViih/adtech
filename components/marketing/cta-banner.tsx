export function CtaBanner() {
  return (
    <section className="border-b" style={{ borderColor: "#1E1E2E" }}>
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 py-12"
        style={{ borderLeft: "3px solid #E8390E" }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-2"
              style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
            >
              Early Access
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold mb-2"
              style={{ fontFamily: "var(--font-space-grotesk),sans-serif", color: "#F1F5F9" }}
            >
              Pronto para parar de desperdiçar verba?
            </h2>
            <p className="text-sm" style={{ color: "#475569", fontFamily: "var(--font-manrope),sans-serif" }}>
              3 meses de Pro grátis para as primeiras 100 agências no lançamento.
            </p>
          </div>
          <a
            href="#waitlist"
            className="shrink-0 px-6 py-3 rounded text-sm font-semibold text-white"
            style={{ background: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
          >
            Garantir minha vaga →
          </a>
        </div>
      </div>
    </section>
  );
}
