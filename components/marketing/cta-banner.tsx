export function CtaBanner() {
  return (
    <section className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.3),transparent)" }}
      />

      {/* Orbs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle,rgba(232,57,14,0.08) 0%,transparent 70%)",
          filter: "blur(60px)",
          animation: "mkt-pulse-glow 5s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          top: "20%",
          left: "20%",
          background: "radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)",
          filter: "blur(50px)",
          animation: "mkt-pulse-glow 7s ease-in-out infinite 1.5s",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div
          className="relative rounded-2xl px-10 py-16 md:px-16 md:py-20 overflow-hidden"
          style={{
            background: "rgba(232,57,14,0.04)",
            border: "1px solid rgba(232,57,14,0.2)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 80px rgba(232,57,14,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Scan line */}
          <div
            className="absolute inset-x-0 h-px pointer-events-none"
            style={{
              background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.5),transparent)",
              animation: "mkt-scan 5s linear infinite",
              top: 0,
            }}
          />

          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#E8390E" }}>
            Early Access
          </p>

          <h2
            className="text-3xl md:text-5xl font-bold mb-5"
            style={{
              background: "linear-gradient(135deg,#F1F5F9 0%,#94A3B8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Pronto para escalar com IA?
          </h2>

          <p className="text-sm mb-8 max-w-md mx-auto leading-relaxed" style={{ color: "#475569" }}>
            Entre na lista e ganhe{" "}
            <span style={{ color: "#E8390E", fontWeight: 600 }}>3 meses de Pro grátis</span>
            {" "}para agências que fizerem onboarding no lançamento.
          </p>

          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md text-sm font-semibold uppercase tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg,#E8390E 0%,#c42d07 100%)",
              boxShadow: "0 0 30px rgba(232,57,14,0.4), 0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            Garantir minha vaga →
          </a>
        </div>
      </div>
    </section>
  );
}
