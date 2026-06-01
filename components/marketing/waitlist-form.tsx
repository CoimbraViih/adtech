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
  padding: "8px 12px",
  borderRadius: 4,
  fontSize: 13,
  background: "#0D0D1A",
  border: "1px solid #1E1E2E",
  color: "#E2E8F0",
  outline: "none",
  fontFamily: "var(--font-manrope),sans-serif",
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
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as keyof FieldErrors;
        if (f && f !== "global") fe[f] = issue.message;
      }
      setErrors(fe);
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
        setErrors({ global: body.error ?? "Erro ao enviar." });
      }
    } catch {
      setErrors({ global: "Erro de conexão." });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <p
          className="text-sm font-semibold mb-1"
          style={{ color: "#10B981", fontFamily: "var(--font-space-grotesk),sans-serif" }}
        >
          Vaga garantida.
        </p>
        <p className="text-xs" style={{ color: "#475569" }}>
          Entraremos em contato quando seu acesso estiver pronto.
        </p>
      </div>
    );
  }

  const focusStyle: React.CSSProperties = { borderColor: "#E8390E" };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {/* Name */}
      <div>
        <label
          className="block text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "#475569", fontFamily: "var(--font-manrope),sans-serif" }}
        >
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
          <p className="mt-1 text-[10px]" style={{ color: "#EF4444" }}>{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          className="block text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "#475569", fontFamily: "var(--font-manrope),sans-serif" }}
        >
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
          <p className="mt-1 text-[10px]" style={{ color: "#EF4444" }}>{errors.email}</p>
        )}
      </div>

      {/* Agency size */}
      <div>
        <label
          className="block text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "#475569", fontFamily: "var(--font-manrope),sans-serif" }}
        >
          Tamanho da agência
        </label>
        <select
          id="waitlist-size"
          value={agencySize}
          onChange={(e) => setAgencySize(e.target.value)}
          onFocus={() => setFocused("size")}
          onBlur={() => setFocused(null)}
          style={{ ...baseInput, ...(focused === "size" ? focusStyle : {}) }}
        >
          <option value="" disabled style={{ background: "#0D0D1A" }}>Selecione...</option>
          {AGENCY_SIZES.map((s) => (
            <option key={s.value} value={s.value} style={{ background: "#0D0D1A" }}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.agency_size && (
          <p className="mt-1 text-[10px]" style={{ color: "#EF4444" }}>{errors.agency_size}</p>
        )}
      </div>

      {errors.global && (
        <p
          className="text-xs px-3 py-2 rounded"
          style={{ color: "#EF4444", background: "#EF44440A", border: "1px solid #EF444420" }}
        >
          {errors.global}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded text-sm font-semibold text-white"
        style={{
          background: loading ? "#7C1A07" : "#E8390E",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "var(--font-manrope),sans-serif",
        }}
      >
        {loading ? "Enviando..." : "Garantir minha vaga →"}
      </button>

      <p className="text-[10px] text-center" style={{ color: "#334155" }}>
        Sem spam. Cancele quando quiser.
      </p>
    </form>
  );
}
