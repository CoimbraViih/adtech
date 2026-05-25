export function MarketingFooter() {
  return (
    <footer className="border-t border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[color:var(--adflow-accent)]" />
          <span className="text-sm font-semibold text-[color:var(--adflow-fg)]">AdFlow</span>
        </div>
        <p className="text-xs text-[color:var(--adflow-fg-muted)]">
          © {new Date().getFullYear()} AdFlow. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-4 text-xs text-[color:var(--adflow-fg-muted)]">
          <a href="#" className="hover:text-[color:var(--adflow-fg)] transition-colors">
            Privacidade
          </a>
          <a href="#" className="hover:text-[color:var(--adflow-fg)] transition-colors">
            Termos
          </a>
        </div>
      </div>
    </footer>
  );
}
