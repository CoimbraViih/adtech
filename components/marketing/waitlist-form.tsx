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

const baseInput: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 4,
  fontSize: 13,
  background: "rgba(0,0,5,0.6)",
  border: "1px solid #1E1E2E",
  color: "#E2E8F0",
  outline: "none",
  fontFamily: "var(--font-manrope), sans-serif",
  transition: "border-color 0.2s",
};

export function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agencySize, setAgencySize] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

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
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: 16, fontWeight: 700, color: "#10B981",
          marginBottom: 8, letterSpacing: "-0.01em",
        }}>
          Vaga garantida.
        </div>
        <div style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: 13, color: "#475569",
        }}>
          Entraremos em contato quando seu acesso estiver pronto.
        </div>
      </div>
    );
  }

  const focusStyle: React.CSSProperties = { borderColor: "#00d4ff", boxShadow: "0 0 0 1px rgba(0,212,255,0.2)" };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Name */}
      <div>
        <label style={{
          display: "block",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9, color: "#475569",
          letterSpacing: "0.15em", textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Nome
        </label>
        <input
          id="waitlist-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocused("name")}
          onBlur={() => setFocused(null)}
          placeholder="Seu nome"
          style={{ ...baseInput, ...(focused === "name" ? focusStyle : {}) }}
        />
        {errors.name && (
          <p style={{ marginTop: 4, fontFamily: "var(--font-manrope), sans-serif", fontSize: 11, color: "#EF4444" }}>
            {errors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label style={{
          display: "block",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9, color: "#475569",
          letterSpacing: "0.15em", textTransform: "uppercase",
          marginBottom: 6,
        }}>
          E-mail profissional
        </label>
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          placeholder="voce@suaagencia.com"
          style={{ ...baseInput, ...(focused === "email" ? focusStyle : {}) }}
        />
        {errors.email && (
          <p style={{ marginTop: 4, fontFamily: "var(--font-manrope), sans-serif", fontSize: 11, color: "#EF4444" }}>
            {errors.email}
          </p>
        )}
      </div>

      {/* Agency size */}
      <div>
        <label style={{
          display: "block",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9, color: "#475569",
          letterSpacing: "0.15em", textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Tamanho da agência
        </label>
        <select
          id="waitlist-size"
          value={agencySize}
          onChange={(e) => setAgencySize(e.target.value)}
          onFocus={() => setFocused("size")}
          onBlur={() => setFocused(null)}
          style={{ ...baseInput, ...(focused === "size" ? focusStyle : {}), cursor: "pointer" }}
        >
          <option value="" disabled style={{ background: "#0D0D1A" }}>Selecione...</option>
          {AGENCY_SIZES.map((s) => (
            <option key={s.value} value={s.value} style={{ background: "#0D0D1A" }}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.agency_size && (
          <p style={{ marginTop: 4, fontFamily: "var(--font-manrope), sans-serif", fontSize: 11, color: "#EF4444" }}>
            {errors.agency_size}
          </p>
        )}
      </div>

      {errors.global && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 4,
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: 12, color: "#EF4444",
        }}>
          {errors.global}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: 4,
          border: "none",
          background: loading ? "#7C1A07" : "#E8390E",
          color: "#ffffff",
          fontFamily: "var(--font-manrope), sans-serif",
          fontWeight: 700, fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "0.02em",
          boxShadow: loading ? "none" : "0 0 20px rgba(232,57,14,0.35)",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
      >
        {loading ? "Enviando..." : "Garantir minha vaga →"}
      </button>

      <p style={{
        textAlign: "center",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 9, color: "#334155",
        letterSpacing: "0.1em",
      }}>
        SEM SPAM · CANCELE QUANDO QUISER
      </p>
    </form>
  );
}
