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

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 13,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#E2E8F0",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const focusStyle = {
  borderColor: "rgba(232,57,14,0.6)",
  boxShadow: "0 0 0 3px rgba(232,57,14,0.1)",
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
      <div className="text-center py-10">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            boxShadow: "0 0 30px rgba(16,185,129,0.2)",
          }}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>
          Você está na lista!
        </h3>
        <p className="text-sm" style={{ color: "#475569" }}>
          Entraremos em contato quando sua vaga estiver pronta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "#475569" }}>
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
          style={{ ...inputStyle, ...(focused === "name" ? focusStyle : {}), caretColor: "#E8390E" }}
        />
        {errors.name && <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "#475569" }}>
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
          style={{ ...inputStyle, ...(focused === "email" ? focusStyle : {}), caretColor: "#E8390E" }}
        />
        {errors.email && <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>{errors.email}</p>}
      </div>

      {/* Agency size */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "#475569" }}>
          Tamanho da agência
        </label>
        <select
          id="waitlist-size"
          value={agencySize}
          onChange={(e) => setAgencySize(e.target.value)}
          onFocus={() => setFocused("size")}
          onBlur={() => setFocused(null)}
          style={{ ...inputStyle, ...(focused === "size" ? focusStyle : {}) }}
        >
          <option value="" disabled style={{ background: "#0D0D1A" }}>Selecione...</option>
          {AGENCY_SIZES.map((s) => (
            <option key={s.value} value={s.value} style={{ background: "#0D0D1A" }}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.agency_size && <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>{errors.agency_size}</p>}
      </div>

      {errors.global && (
        <p
          className="text-xs px-3 py-2 rounded-lg"
          style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          {errors.global}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-md text-sm font-semibold uppercase tracking-wider text-white"
        style={{
          background: loading
            ? "rgba(232,57,14,0.4)"
            : "linear-gradient(135deg,#E8390E 0%,#c42d07 100%)",
          boxShadow: loading ? "none" : "0 0 25px rgba(232,57,14,0.3)",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Enviando..." : "Garantir minha vaga →"}
      </button>

      <p className="text-xs text-center" style={{ color: "#334155" }}>
        Sem spam. Cancele quando quiser.
      </p>
    </form>
  );
}
