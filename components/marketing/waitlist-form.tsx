"use client";

import { useState } from "react";
import { z } from "zod";

const AGENCY_SIZES = [
  { value: "solo", label: "Só eu (freelancer)" },
  { value: "small", label: "Pequena (2–10 pessoas)" },
  { value: "medium", label: "Média (11–50 pessoas)" },
  { value: "large", label: "Grande (50+ pessoas)" },
] as const;

type FieldErrors = { name?: string; email?: string; agency_size?: string; global?: string };

const clientSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  email: z.string().email("E-mail inválido"),
  agency_size: z.enum(["solo", "small", "medium", "large"], {
    error: () => ({ message: "Selecione o tamanho da sua agência" }),
  }),
});

export function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agencySize, setAgencySize] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = clientSchema.safeParse({ name, email, agency_size: agencySize });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && field !== "global") fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const body = (await res.json()) as { error?: string };
        setErrors({ global: body.error ?? "Erro ao enviar. Tente novamente." });
      }
    } catch {
      setErrors({ global: "Erro de conexão. Verifique sua internet." });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-[color:var(--adflow-success)]/15 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[color:var(--adflow-success)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[color:var(--adflow-fg)] mb-2">
          Você está na lista!
        </h3>
        <p className="text-sm text-[color:var(--adflow-fg-muted)]">
          Entraremos em contato quando sua vaga estiver pronta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div>
        <label
          htmlFor="waitlist-name"
          className="block text-xs font-medium text-[color:var(--adflow-fg)] mb-1.5"
        >
          Nome
        </label>
        <input
          id="waitlist-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="w-full px-3 py-2 rounded-md text-sm bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:border-[color:var(--adflow-accent)] transition-colors"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-[color:var(--adflow-danger)]">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="waitlist-email"
          className="block text-xs font-medium text-[color:var(--adflow-fg)] mb-1.5"
        >
          E-mail profissional
        </label>
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@suaagencia.com"
          className="w-full px-3 py-2 rounded-md text-sm bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:border-[color:var(--adflow-accent)] transition-colors"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-[color:var(--adflow-danger)]">{errors.email}</p>
        )}
      </div>

      {/* Agency size */}
      <div>
        <label
          htmlFor="waitlist-size"
          className="block text-xs font-medium text-[color:var(--adflow-fg)] mb-1.5"
        >
          Tamanho da agência
        </label>
        <select
          id="waitlist-size"
          value={agencySize}
          onChange={(e) => setAgencySize(e.target.value)}
          className="w-full px-3 py-2 rounded-md text-sm bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] focus:outline-none focus:border-[color:var(--adflow-accent)] transition-colors"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {AGENCY_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.agency_size && (
          <p className="mt-1 text-xs text-[color:var(--adflow-danger)]">{errors.agency_size}</p>
        )}
      </div>

      {/* Global error */}
      {errors.global && (
        <p className="text-xs text-[color:var(--adflow-danger)] bg-[color:var(--adflow-danger)]/10 px-3 py-2 rounded-md">
          {errors.global}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-md bg-[color:var(--adflow-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Enviando..." : "Garantir minha vaga →"}
      </button>

      <p className="text-xs text-[color:var(--adflow-fg-muted)] text-center">
        Sem spam. Cancelamento a qualquer momento.
      </p>
    </form>
  );
}
