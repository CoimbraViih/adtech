"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { sendMagicLink } from "@/lib/auth/actions";

const schema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("Digite um e-mail válido"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [googlePending, startGoogleTransition] = useTransition();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await sendMagicLink(data.email);
      if ("error" in result) {
        setServerError(result.error);
        setStatus("error");
      } else {
        setStatus("success");
      }
    });
  }

  function handleGoogle() {
    startGoogleTransition(async () => {
      // TODO(M1-backend): call supabase.auth.signInWithOAuth({ provider: "google" })
      // For now redirect to fake callback
      window.location.href = "/callback?provider=google";
    });
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--adflow-success)]/10">
          <CheckCircle2 className="h-5 w-5 text-[color:var(--adflow-success)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">
            Link enviado!
          </p>
          <p className="mt-1 text-xs text-[color:var(--adflow-fg-muted)]">
            Verifique sua caixa de entrada e clique no link para entrar.
          </p>
        </div>
        <button
          onClick={() => { setStatus("idle"); setServerError(null); }}
          className="mt-1 text-xs text-[color:var(--adflow-accent)] hover:underline"
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-[color:var(--adflow-danger)]/30 bg-[color:var(--adflow-danger)]/8 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--adflow-danger)]" />
            <p className="text-xs text-[color:var(--adflow-danger)]">{serverError}</p>
          </div>
        )}

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
            className={
              errors.email
                ? "border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30"
                : ""
            }
            {...register("email")}
          />
          {errors.email && (
            <p className="flex items-center gap-1.5 text-xs text-[color:var(--adflow-danger)]">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.email.message}
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
              Enviando link…
            </>
          ) : (
            "Enviar link mágico"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[color:var(--adflow-border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[color:var(--adflow-base)] px-3 text-[color:var(--adflow-fg-muted)]">
            ou continue com
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={googlePending}
        onClick={handleGoogle}
        className="w-full border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-surface)] bg-transparent disabled:opacity-60"
      >
        {googlePending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        Continuar com Google
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
    </>
  );
}
