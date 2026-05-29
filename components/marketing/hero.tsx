import { ParticleCanvas } from "@/components/marketing/particle-canvas";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 py-24">
      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(232,57,14,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(232,57,14,0.04) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient orbs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: "-20%",
          left: "60%",
          background: "radial-gradient(circle,rgba(232,57,14,0.12) 0%,transparent 70%)",
          animation: "mkt-pulse-glow 6s ease-in-out infinite",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: "40%",
          left: "-15%",
          background: "radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)",
          animation: "mkt-pulse-glow 8s ease-in-out infinite 2s",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          bottom: "10%",
          right: "5%",
          background: "radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)",
          animation: "mkt-pulse-glow 7s ease-in-out infinite 1s",
          filter: "blur(40px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium uppercase tracking-widest"
          style={{
            background: "rgba(232,57,14,0.08)",
            border: "1px solid rgba(232,57,14,0.25)",
            color: "#E8390E",
            boxShadow: "0 0 20px rgba(232,57,14,0.1)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#10B981",
              boxShadow: "0 0 8px #10B981",
              animation: "mkt-blink 2s ease-in-out infinite",
            }}
          />
          Plataforma all-in-one para agências brasileiras
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
          <span
            style={{
              background: "linear-gradient(135deg,#F1F5F9 0%,#94A3B8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Publicidade com IA.
          </span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#E8390E 0%,#ff6b35 50%,#ff8c42 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(232,57,14,0.4))",
            }}
          >
            Resultados reais.
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "#64748B" }}
        >
          Unifique campanhas Meta e Google, gere criativos com IA, rastreie conversões
          server-side e otimize com attribution multi-touch — tudo num único painel.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#waitlist"
            className="relative w-full sm:w-auto px-8 py-3.5 rounded-md text-sm font-semibold uppercase tracking-wider text-white overflow-hidden group"
            style={{
              background: "linear-gradient(135deg,#E8390E 0%,#c42d07 100%)",
              boxShadow: "0 0 30px rgba(232,57,14,0.4), 0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <span className="relative z-10">Começar grátis →</span>
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-md text-sm font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94A3B8",
              backdropFilter: "blur(8px)",
            }}
          >
            Ver features
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-20 mb-20">
          {[
            { value: "R$ 2M+", label: "gasto gerenciado" },
            { value: "500+", label: "campanhas ativas" },
            { value: "4.8×", label: "ROAS médio" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-3xl font-bold mb-1"
                style={{
                  background: "linear-gradient(135deg,#F1F5F9 0%,#E8390E 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stat.value}
              </div>
              <div className="text-xs uppercase tracking-widest" style={{ color: "#475569" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Holographic dashboard mockup */}
        <div
          className="relative mx-auto max-w-4xl rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(232,57,14,0.2)",
            boxShadow:
              "0 0 60px rgba(232,57,14,0.08), 0 0 120px rgba(59,130,246,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
            animation: "mkt-float-slow 8s ease-in-out infinite",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{
              borderColor: "rgba(232,57,14,0.1)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {["rgba(232,57,14,0.6)", "rgba(245,158,11,0.4)", "rgba(16,185,129,0.4)"].map((c, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: c, boxShadow: `0 0 6px ${c}` }}
              />
            ))}
            <div
              className="flex-1 mx-4 h-5 rounded-sm flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", maxWidth: 260 }}
            >
              <span className="text-[10px] tracking-widest" style={{ color: "#334155" }}>
                app.adflow.io/dashboard
              </span>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-5" style={{ background: "rgba(13,13,26,0.9)" }}>
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "ROAS", value: "4.8×", color: "#10B981" },
                { label: "CPA", value: "R$42", color: "#3B82F6" },
                { label: "Spend", value: "R$18k", color: "#E8390E" },
                { label: "Conv.", value: "1.2k", color: "#8B5CF6" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${kpi.color}22`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#475569" }}>
                    {kpi.label}
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: kpi.color, textShadow: `0 0 12px ${kpi.color}80` }}
                  >
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="grid grid-cols-3 gap-3">
              <div
                className="col-span-2 rounded-lg p-4 h-40 flex flex-col justify-between"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(232,57,14,0.08)",
                }}
              >
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "#334155" }}>
                  Spend últimos 30 dias
                </div>
                <div className="flex items-end gap-1 h-24">
                  {[35, 55, 45, 70, 60, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, rgba(232,57,14,0.7), rgba(232,57,14,0.2))`,
                        boxShadow: h > 80 ? "0 0 8px rgba(232,57,14,0.4)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div
                className="rounded-lg p-4 h-40 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(59,130,246,0.08)",
                }}
              >
                <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "#334155" }}>
                  Canais
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  {[
                    { label: "Meta", pct: 65, color: "#3B82F6" },
                    { label: "Google", pct: 45, color: "#E8390E" },
                    { label: "RTB", pct: 25, color: "#8B5CF6" },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-[10px] mb-1" style={{ color: "#475569" }}>
                        <span>{c.label}</span>
                        <span style={{ color: c.color }}>{c.pct}%</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${c.pct}%`,
                            background: c.color,
                            boxShadow: `0 0 6px ${c.color}80`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scan line */}
          <div
            className="absolute inset-x-0 h-px pointer-events-none"
            style={{
              background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.6),transparent)",
              animation: "mkt-scan 4s linear infinite",
              top: 0,
            }}
          />
        </div>
      </div>
    </section>
  );
}
