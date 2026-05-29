export function MarketingFooter() {
  return (
    <footer
      className="relative py-8 px-4 sm:px-6"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded"
            style={{
              background: "linear-gradient(135deg,#E8390E,#c42d07)",
              boxShadow: "0 0 10px rgba(232,57,14,0.4)",
            }}
          />
          <span className="text-xs font-bold tracking-tight" style={{ color: "#334155" }}>
            Ad<span style={{ color: "#E8390E" }}>Flow</span>
          </span>
        </div>
        <p className="text-xs" style={{ color: "#1E293B" }}>
          © {new Date().getFullYear()} AdFlow. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-5">
          {["Privacidade", "Termos"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs uppercase tracking-widest transition-colors"
              style={{ color: "#1E293B" }}
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
