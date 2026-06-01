function CrosshairIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.5" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="12" y1="1" x2="12" y2="6" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="12" y1="18" x2="12" y2="23" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="1" y1="12" x2="6" y2="12" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="18" y1="12" x2="23" y2="12" stroke="#E8390E" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="#E8390E" />
    </svg>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{ borderTop: "1px solid #1E1E2E" }}>
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <CrosshairIcon />
          <span
            className="text-xs font-bold"
            style={{ fontFamily: "var(--font-space-grotesk),sans-serif" }}
          >
            <span style={{ color: "#E8390E" }}>Ad</span>
            <span style={{ color: "#334155" }}>Hunter</span>
          </span>
        </div>

        <p
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "#1E293B", fontFamily: "var(--font-jetbrains),monospace" }}
        >
          ADHUNTER · BRAND BOOK v1.0 · família de marcas Hunter
        </p>

        <div className="flex items-center gap-4">
          {["Privacidade", "Termos"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[10px] uppercase tracking-wider mkt-nav-link"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
