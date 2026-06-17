import Link from "next/link";

function MiniCrosshair() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="12" y1="4" x2="12" y2="7" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="12" y1="17" x2="12" y2="20" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="4" y1="12" x2="7" y2="12" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="17" y1="12" x2="20" y2="12" stroke="#E8390E" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="#E8390E" />
    </svg>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{
      position: "relative",
      zIndex: 2,
      borderTop: "1px solid rgba(30,30,46,0.8)",
      background: "rgba(0,0,5,0.6)",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MiniCrosshair />
          <span style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 11, color: "#334155",
            letterSpacing: "0.15em",
          }}>
            ADHUNTER © 2026
          </span>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Privacidade", href: "/privacy" },
            { label: "Termos", href: "/terms" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 12, color: "#334155",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 9, color: "#1E1E2E",
          letterSpacing: "0.1em",
        }}>
          SYS.ADHUNTER.v2.0 // ONLINE
        </div>
      </div>
    </footer>
  );
}
