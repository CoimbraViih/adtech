import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[color:var(--adflow-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded bg-[color:var(--adflow-accent)] mx-auto" />
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Criar conta
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            14 dias grátis, sem cartão de crédito
          </p>
        </div>

        <SignupForm />

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
