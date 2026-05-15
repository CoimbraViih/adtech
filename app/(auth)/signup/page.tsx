import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[color:var(--adflow-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded bg-[color:var(--adflow-accent)] mx-auto" />
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Criar conta
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            14 dias grátis, sem cartão de crédito
          </p>
        </div>

        {/* Signup form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-xs text-[color:var(--adflow-fg-muted)]"
            >
              Nome
            </label>
            <input
              id="name"
              type="text"
              placeholder="Seu nome"
              className="w-full bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--adflow-accent)] transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs text-[color:var(--adflow-fg-muted)]"
            >
              E-mail profissional
            </label>
            <input
              id="email"
              type="email"
              placeholder="voce@agencia.com"
              className="w-full bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--adflow-accent)] transition-shadow"
            />
          </div>
          <Button className="w-full bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white">
            Criar conta grátis
          </Button>
        </div>

        <p className="text-center text-xs text-[color:var(--adflow-fg-muted)]">
          Já tem conta?{" "}
          <Link href="/login" className="text-[color:var(--adflow-accent)] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
