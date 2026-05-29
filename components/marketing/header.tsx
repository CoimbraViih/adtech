import Link from "next/link";

function CrosshairIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.5" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="12" y1="1" x2="12" y2="6" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="12" y1="18" x2="12" y2="23" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="1" y1="12" x2="6" y2="12" stroke="#E8390E" strokeWidth="1.5" />
      <line x1="18" y1="12" x2="23" y2="12" stroke="#E8390E" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="#E8390E" />
    </svg>
  );
}

export function MarketingHeader() {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(13,13,26,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1E1E2E",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <CrosshairIcon />
          <span
            className="font-bold text-sm tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            <span style={{ color: "#E8390E" }}>Ad</span>
            <span style={{ color: "#F1F5F9" }}>Hunter</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Preços" },
            { href: "#faq", label: "FAQ" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="mkt-nav-link text-xs font-medium tracking-wide"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="mkt-nav-link text-xs font-medium"
          >
            Entrar
          </Link>
          <a
            href="#waitlist"
            className="text-xs font-semibold px-4 py-1.5 rounded text-white"
            style={{ background: "#E8390E" }}
          >
            Começar grátis
          </a>
        </div>
      </div>
    </header>
  );
}
