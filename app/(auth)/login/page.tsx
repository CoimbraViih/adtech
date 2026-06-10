import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth/auth-left-panel";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="h-screen overflow-hidden grid md:grid-cols-2 bg-[#080810]">
      {/* Left — hidden on mobile */}
      <div className="hidden md:flex h-full">
        <AuthLeftPanel />
      </div>

      {/* Right — form panel */}
      <div
        className="flex items-center justify-center p-6 md:p-10 h-screen md:h-full overflow-y-auto"
        style={{
          background: "#0D0D1A",
          position: "relative",
        }}
      >
        {/* Subtle cyan glow top-right */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 85% 15%, rgba(0,212,255,0.05) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />

        <div className="w-full max-w-sm" style={{ position: "relative", zIndex: 2 }}>
          {/* Mobile-only logo */}
          <div className="flex items-center justify-center gap-3 mb-8 md:hidden">
            <svg width="28" height="28" viewBox="0 0 110 110" fill="none" aria-hidden>
              <circle cx="55" cy="55" r="40" stroke="#E8390E" strokeWidth="4" />
              <path d="M55 7 V22 M55 88 V103 M7 55 H22 M88 55 H103" stroke="#E8390E" strokeWidth="4" strokeLinecap="round" />
              <circle cx="55" cy="55" r="12" fill="#E8390E" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              <span style={{ color: "#E8390E" }}>Ad</span>
              <span style={{ color: "#EAEAF2" }}>Hunter</span>
            </span>
          </div>

          {/* HUD card */}
          <div
            style={{
              background: "rgba(19,19,31,0.85)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "32px",
              backdropFilter: "blur(20px)",
              position: "relative",
            }}
          >
            {/* Neon top line */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0, left: "6%", right: "6%",
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)",
              }}
            />
            {/* HUD corners */}
            <span aria-hidden style={{ position: "absolute", top: -1, left: -1, width: 12, height: 12, borderTop: "1.5px solid #00d4ff", borderLeft: "1.5px solid #00d4ff" }} />
            <span aria-hidden style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: "1.5px solid #00d4ff", borderRight: "1.5px solid #00d4ff" }} />

            <h1
              style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                marginBottom: 4,
              }}
            >
              Entrar na plataforma
            </h1>
            <p className="text-sm text-[color:var(--adflow-fg-muted)] mb-6">
              Acesse sua conta para continuar
            </p>

            <LoginForm />
          </div>

          <p className="mt-5 text-center text-xs text-[color:var(--adflow-fg-muted)]">
            Não tem conta?{" "}
            <Link href="/signup" className="text-[color:var(--adflow-accent)] hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
