import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[color:var(--adflow-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded bg-[color:var(--adflow-accent)] mx-auto" />
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Entrar no AdFlow
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            Acesse sua conta para continuar
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-[color:var(--adflow-fg-muted)]">
          Não tem conta?{" "}
          <Link href="/signup" className="text-[color:var(--adflow-accent)] hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
