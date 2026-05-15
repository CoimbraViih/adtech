"use client";

import { Button } from "@/components/ui/button";

export function SignupForm() {
  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs text-[color:var(--adflow-fg-muted)]">
          Nome
        </label>
        <input
          id="name"
          type="text"
          placeholder="Seu nome"
          autoComplete="name"
          className="w-full bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--adflow-accent)] transition-shadow"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs text-[color:var(--adflow-fg-muted)]">
          E-mail profissional
        </label>
        <input
          id="email"
          type="email"
          placeholder="voce@agencia.com"
          autoComplete="email"
          className="w-full bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--adflow-accent)] transition-shadow"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white"
      >
        Criar conta grátis
      </Button>
    </form>
  );
}
