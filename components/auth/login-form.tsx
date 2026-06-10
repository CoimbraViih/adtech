"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { loginWithPassword } from "@/lib/auth/actions";

const schema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("Digite um e-mail válido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginWithPassword(data.email, data.password);
      if (result && "error" in result) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-[color:var(--adflow-danger)]/30 bg-[color:var(--adflow-danger)]/8 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--adflow-danger)]" />
          <p className="text-xs text-[color:var(--adflow-danger)]">{serverError}</p>
        </div>
      )}

      {/* E-mail */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-email"
          className="text-xs font-medium text-[color:var(--adflow-fg-muted)]"
        >
          E-mail
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder="voce@agencia.com"
          autoComplete="email"
          disabled={isPending}
          aria-invalid={!!errors.email}
          className={errors.email ? "border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30" : ""}
          {...register("email")}
        />
        {errors.email && (
          <p className="flex items-center gap-1.5 text-xs text-[color:var(--adflow-danger)]">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Senha */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-password"
          className="text-xs font-medium text-[color:var(--adflow-fg-muted)]"
        >
          Senha
        </label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isPending}
            aria-invalid={!!errors.password}
            className={
              errors.password
                ? "pr-9 border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30"
                : "pr-9"
            }
            {...register("password")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="flex items-center gap-1.5 text-xs text-[color:var(--adflow-danger)]">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>

      {process.env.NODE_ENV !== "production" && (
        <p className="text-center text-[10px] text-[color:var(--adflow-fg-muted)]">
          Dev:{" "}
          <a
            href="/api/auth/dev-login"
            className="text-[color:var(--adflow-accent)] hover:underline"
          >
            entrar direto sem e-mail
          </a>
        </p>
      )}
    </form>
  );
}
