import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[color:var(--adflow-accent)]" />
          <span className="font-semibold text-sm tracking-tight text-[color:var(--adflow-fg)]">
            AdFlow
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-[color:var(--adflow-fg-muted)]">
          <a href="#features" className="hover:text-[color:var(--adflow-fg)] transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-[color:var(--adflow-fg)] transition-colors">
            Preços
          </a>
          <a href="#faq" className="hover:text-[color:var(--adflow-fg)] transition-colors">
            FAQ
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            Entrar
          </Link>
          <a
            href="#waitlist"
            className="text-sm px-4 py-1.5 rounded-md bg-[color:var(--adflow-accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Começar grátis
          </a>
        </div>
      </div>
    </header>
  );
}
