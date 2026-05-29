// Hero — brand-compliant: compact, data-forward, no decorative empty space.
// Ref: AdHunter Brand Book §07 "Sem hero gigante vazio"

const METRICS = [
  { value: "4.8×", label: "ROAS médio", color: "#10B981" },
  { value: "R$42", label: "CPA médio", color: "#F1F5F9" },
  { value: "−28%", label: "CPC vs. antes", color: "#10B981" },
  { value: "R$2M+", label: "verba gerenciada", color: "#94A3B8" },
];

export function Hero() {
  return (
    <section className="border-b" style={{ borderColor: "#1E1E2E" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        {/* Eyebrow */}
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
        >
          ADTECH · LOOP FECHADO DE OTIMIZAÇÃO
        </p>

        {/* Headline */}
        <h1
          className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5"
          style={{
            fontFamily: "var(--font-space-grotesk),sans-serif",
            color: "#F1F5F9",
            maxWidth: 720,
          }}
        >
          Mire melhor.{" "}
          <span style={{ color: "#E8390E" }}>Gaste menos.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-base md:text-lg mb-8 leading-relaxed"
          style={{ color: "#64748B", maxWidth: 560, fontFamily: "var(--font-manrope),sans-serif" }}
        >
          15–30% da verba some em anúncios ruins. A AdHunter encontra cada centavo perdido
          e redireciona ao que converte — automaticamente.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3 mb-12">
          <a
            href="#waitlist"
            className="px-5 py-2.5 rounded text-sm font-semibold text-white"
            style={{ background: "#E8390E" }}
          >
            Entrar na lista de espera
          </a>
          <a
            href="#features"
            className="px-5 py-2.5 rounded text-sm font-semibold"
            style={{ color: "#94A3B8", border: "1px solid #1E1E2E" }}
          >
            Ver como funciona →
          </a>
        </div>

        {/* Metrics strip */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ background: "#1E1E2E", border: "1px solid #1E1E2E", borderRadius: 8 }}
        >
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="px-5 py-4"
              style={{ background: "#0D0D1A" }}
            >
              <div
                className="text-2xl font-bold mb-0.5"
                style={{
                  fontFamily: "var(--font-jetbrains),monospace",
                  color: m.color,
                  letterSpacing: "-0.02em",
                }}
              >
                {m.value}
              </div>
              <div
                className="text-[10px] uppercase tracking-widest"
                style={{ color: "#334155", fontFamily: "var(--font-manrope),sans-serif" }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Product preview — anomaly alert card from brand book */}
        <div className="mt-8 rounded-lg overflow-hidden" style={{ border: "1px solid #1E1E2E" }}>
          {/* Fake window chrome */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ background: "#13131F", borderColor: "#1E1E2E" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF444440" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B40" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#10B98140" }} />
            </div>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "#334155", fontFamily: "var(--font-jetbrains),monospace" }}
            >
              adhunter.io/campanhas
            </span>
            <div />
          </div>

          {/* Dashboard content */}
          <div style={{ background: "#0D0D1A" }}>
            {/* Alert card */}
            <div
              className="mx-4 my-4 p-4 rounded-lg"
              style={{ border: "1px solid #E8390E30", background: "#13131F" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded"
                  style={{
                    color: "#E8390E",
                    border: "1px solid #E8390E40",
                    background: "#E8390E0A",
                    fontFamily: "var(--font-manrope),sans-serif",
                  }}
                >
                  AdHunter · Campanhas
                </span>
                <span className="text-[10px]" style={{ color: "#334155" }}>agora mesmo</span>
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "#F1F5F9", fontFamily: "var(--font-space-grotesk),sans-serif" }}
              >
                Anomalia detectada
              </p>
              <p className="text-xs mb-3" style={{ color: "#64748B" }}>
                CPA subiu 64% nas últimas 6h na campanha "Black Friday — Retargeting".
              </p>
              <div className="flex items-center gap-4">
                <button
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ background: "#E8390E" }}
                >
                  Otimizar agora
                </button>
                <button className="text-xs" style={{ color: "#64748B" }}>
                  Ver detalhes
                </button>
              </div>
              <div
                className="flex items-center gap-5 mt-3 pt-3"
                style={{ borderTop: "1px solid #1E1E2E" }}
              >
                {[
                  { label: "CPA", value: "R$41,20", color: "#EF4444", arrow: "▲" },
                  { label: "ROAS", value: "2.8×", color: "#F59E0B", arrow: "▼" },
                  { label: "Spend", value: "R$8.940", color: "#94A3B8", arrow: "" },
                ].map((s) => (
                  <span
                    key={s.label}
                    className="text-[11px]"
                    style={{ fontFamily: "var(--font-jetbrains),monospace", color: s.color }}
                  >
                    {s.arrow && `${s.arrow} `}{s.label} {s.value}
                  </span>
                ))}
              </div>
            </div>

            {/* Campaign table preview */}
            <div className="px-4 pb-4">
              <table className="w-full text-[11px]" style={{ fontFamily: "var(--font-jetbrains),monospace" }}>
                <thead>
                  <tr style={{ color: "#334155" }}>
                    {["Campanha", "Status", "ROAS", "CPA", "Spend"].map((h) => (
                      <th key={h} className="text-left pb-2 font-medium uppercase tracking-wider text-[9px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "BF — Prospecting", status: "ativo", roas: "5.2×", cpa: "R$31", spend: "R$4.2k", roasColor: "#10B981", cpaColor: "#10B981" },
                    { name: "BF — Retargeting", status: "anomalia", roas: "2.8×", cpa: "R$41", spend: "R$8.9k", roasColor: "#F59E0B", cpaColor: "#EF4444" },
                    { name: "Sempre Ativo — TOFU", status: "ativo", roas: "4.1×", cpa: "R$38", spend: "R$1.8k", roasColor: "#10B981", cpaColor: "#94A3B8" },
                  ].map((row) => (
                    <tr key={row.name} style={{ borderTop: "1px solid #1E1E2E" }}>
                      <td className="py-2" style={{ color: "#94A3B8" }}>{row.name}</td>
                      <td className="py-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
                          style={{
                            color: row.status === "anomalia" ? "#E8390E" : "#10B981",
                            background: row.status === "anomalia" ? "#E8390E0A" : "#10B9810A",
                            border: `1px solid ${row.status === "anomalia" ? "#E8390E30" : "#10B98130"}`,
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 font-medium" style={{ color: row.roasColor }}>{row.roas}</td>
                      <td className="py-2" style={{ color: row.cpaColor }}>{row.cpa}</td>
                      <td className="py-2" style={{ color: "#64748B" }}>{row.spend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
