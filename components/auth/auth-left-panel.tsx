/** Left panel shared by /login and /signup — sci-fi targeting aesthetic. */
export function AuthLeftPanel() {
  return (
    <div
      style={{
        background: "#080810",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Grid background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.035) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Scan line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)",
          animation: "hud-scan 5s linear infinite",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />

      {/* HUD corners */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            zIndex: 7,
            ...(pos === "tl" && { top: 10, left: 10, borderTop: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }),
            ...(pos === "tr" && { top: 10, right: 10, borderTop: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }),
            ...(pos === "bl" && { bottom: 10, left: 10, borderBottom: "1px solid rgba(0,212,255,0.5)", borderLeft: "1px solid rgba(0,212,255,0.5)" }),
            ...(pos === "br" && { bottom: 10, right: 10, borderBottom: "1px solid rgba(0,212,255,0.5)", borderRight: "1px solid rgba(0,212,255,0.5)" }),
          }}
        />
      ))}

      {/* ── TOP: Logo ── */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          paddingTop: 36,
          flexShrink: 0,
        }}
      >
        {/* Symbol */}
        <svg width="32" height="32" viewBox="0 0 110 110" fill="none" aria-hidden>
          <circle cx="55" cy="55" r="40" stroke="#E8390E" strokeWidth="4" />
          <path
            d="M55 7 V22 M55 88 V103 M7 55 H22 M88 55 H103"
            stroke="#E8390E"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="55" cy="55" r="12" fill="#E8390E" />
        </svg>
        {/* Wordmark */}
        <span
          style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#E8390E" }}>Ad</span>
          <span style={{ color: "#EAEAF2" }}>Hunter</span>
        </span>
      </div>

      {/* ── MIDDLE: Targeting rings (flex-grow) ── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {/* Glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(232,57,14,0.09) 0%, transparent 65%)",
          }}
        />

        {/* Rings */}
        {[80, 160, 280, 440].map((size, i) => (
          <div
            key={size}
            aria-hidden
            style={{
              position: "absolute",
              width: size,
              height: size,
              border: `1px solid rgba(232,57,14,${[0.32, 0.16, 0.07, 0.03][i]})`,
              borderRadius: "50%",
            }}
          />
        ))}

        {/* Crosshair H */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 420,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(232,57,14,0.15), transparent)",
          }}
        />
        {/* Crosshair V */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 1,
            height: 420,
            background: "linear-gradient(180deg, transparent, rgba(232,57,14,0.15), transparent)",
          }}
        />

        {/* Tick marks */}
        {[
          { width: 1, height: 8, top: "calc(50% - 44px)", left: "50%", transform: "translateX(-50%)" },
          { width: 1, height: 8, top: "calc(50% + 36px)", left: "50%", transform: "translateX(-50%)" },
          { width: 8, height: 1, top: "50%", left: "calc(50% + 36px)", transform: "translateY(-50%)" },
          { width: 8, height: 1, top: "50%", left: "calc(50% - 44px)", transform: "translateY(-50%)" },
        ].map((style, i) => (
          <div
            key={i}
            aria-hidden
            style={{ position: "absolute", background: "rgba(232,57,14,0.6)", ...style }}
          />
        ))}

        {/* Center dot */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            background: "#E8390E",
            borderRadius: "50%",
            boxShadow: "0 0 14px rgba(232,57,14,0.7)",
            zIndex: 2,
          }}
        />
      </div>

      {/* ── BOTTOM: Tagline + stats ── */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "0 32px 36px",
          flexShrink: 0,
          background: "linear-gradient(to bottom, transparent 0%, rgba(8,8,16,0.75) 28%)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "#00d4ff",
            opacity: 0.75,
            marginBottom: 12,
          }}
        >
          PLATAFORMA DE PERFORMANCE
        </p>

        <h2
          style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            marginBottom: 20,
          }}
        >
          Mire melhor.{" "}
          <br />
          <span style={{ color: "#10B981" }}>Gaste menos.</span>
        </h2>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {[
            { dot: "#10B981", label: "CPA médio", value: "−34%", color: "#10B981" },
            { dot: "#00d4ff", label: "ROAS médio", value: "4.2×",  color: "#00d4ff" },
            { dot: "#94A3B8", label: "Verba gerenciada", value: "R$2.1M", color: "#94A3B8" },
          ].map(({ dot, label, value, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: dot,
                  flexShrink: 0,
                  boxShadow: dot !== "#94A3B8" ? `0 0 6px ${dot}` : undefined,
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#64748b" }}>{label}</span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains, monospace)",
                  fontWeight: 600,
                  fontSize: 11,
                  color,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
