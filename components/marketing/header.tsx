import Link from "next/link";

export function MarketingHeader() {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(13,13,26,0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(232,57,14,0.12)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg,#E8390E 0%,#ff6040 100%)",
              boxShadow: "0 0 16px rgba(232,57,14,0.6)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.2) 0%,transparent 60%)" }}
            />
          </div>
          <span className="font-bold text-sm tracking-tight text-[color:var(--adflow-fg)]">
            Ad<span style={{ color: "#E8390E" }}>Flow</span>
          </span>
        </Link>

        {/* Nav — pure CSS hover via style tag trick using group/peer isn't needed;
            Tailwind can't do dynamic color, so we use a global CSS class instead */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { href: "#features", label: "Features" },
            { href: "#pricing", label: "Preços" },
            { href: "#faq", label: "FAQ" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="mkt-nav-link text-xs font-medium uppercase tracking-widest transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="mkt-nav-link text-xs font-medium uppercase tracking-widest transition-colors"
          >
            Entrar
          </Link>
          <a
            href="#waitlist"
            className="text-xs font-semibold px-5 py-2 rounded-md uppercase tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg,#E8390E 0%,#c42d07 100%)",
              boxShadow: "0 0 20px rgba(232,57,14,0.35)",
            }}
          >
            Começar grátis
          </a>
        </div>
      </div>
    </header>
  );
}
