"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/auth/actions";

const schema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(60, "Nome muito longo"),
    email: z.string().min(1, "E-mail é obrigatório").email("Digite um e-mail válido"),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await signUp(data.name, data.email, data.password);
      if ("error" in result) {
        setServerError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/onboarding"), 800);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--adflow-success)]/10">
          <CheckCircle2 className="h-5 w-5 text-[color:var(--adflow-success)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">Conta criada!</p>
          <p className="mt-1 text-xs text-[color:var(--adflow-fg-muted)]">
            Redirecionando para o onboarding…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-[color:var(--adflow-danger)]/30 bg-[color:var(--adflow-danger)]/8 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--adflow-danger)]" />
          <p className="text-xs text-[color:var(--adflow-danger)]">{serverError}</p>
        </div>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Nome completo
        </label>
        <Input
          id="signup-name"
          type="text"
          placeholder="João Silva"
          autoComplete="name"
          disabled={isPending}
          aria-invalid={!!errors.name}
          className={errors.name ? "border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30" : ""}
          {...register("name")}
        />
        {errors.name && (
          <p className="flex items-center gap-1.5 text-xs text-[color:var(--adflow-danger)]">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.name.message}
          </p>
        )}
      </div>

      {/* E-mail */}
      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          E-mail profissional
        </label>
        <Input
          id="signup-email"
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
        <label htmlFor="signup-password" className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Senha
        </label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
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

      {/* Confirmar senha */}
      <div className="space-y-1.5">
        <label htmlFor="signup-confirm" className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Confirmar senha
        </label>
        <div className="relative">
          <Input
            id="signup-confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isPending}
            aria-invalid={!!errors.confirmPassword}
            className={
              errors.confirmPassword
                ? "pr-9 border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30"
                : "pr-9"
            }
            {...register("confirmPassword")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="flex items-center gap-1.5 text-xs text-[color:var(--adflow-danger)]">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.confirmPassword.message}
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
            Criando conta…
          </>
        ) : (
          "Criar conta grátis"
        )}
      </Button>

      <p className="text-center text-[10px] text-[color:var(--adflow-fg-muted)]">
        Ao criar sua conta você concorda com nossos{" "}
        <a href="#" className="underline hover:text-[color:var(--adflow-fg)]">
          Termos de Uso
        </a>{" "}
        e{" "}
        <a href="#" className="underline hover:text-[color:var(--adflow-fg)]">
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  );
}
