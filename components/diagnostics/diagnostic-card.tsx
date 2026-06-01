"use client";

import { useState } from "react";
import type { AiDiagnostic } from "@/types/database";

const SEVERITY_STYLES = {
  critical: {
    chip: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "Crítico",
  },
  warning: {
    chip: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    label: "Atenção",
  },
  info: {
    chip: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    label: "Info",
  },
} as const;

type Props = { diagnostic: AiDiagnostic };

export function DiagnosticCard({ diagnostic: initial }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState<"apply" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  async function updateStatus(status: "applied" | "dismissed") {
    setLoading(status === "applied" ? "apply" : "dismiss");
    setError(null);
    try {
      const res = await fetch(`/api/ai/diagnostics/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError("Falha ao atualizar. Tente novamente.");
      } else {
        setDismissed(true);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  const style = SEVERITY_STYLES[initial.severity];

  return (
    <div className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${style.chip}`}>
            {style.label}
          </span>
          <span className="text-sm font-medium text-[color:var(--adflow-fg)]">
            {initial.title}
          </span>
        </div>
        <span className="text-xs text-[color:var(--adflow-fg-muted)] shrink-0">
          {new Date(initial.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <p className="text-sm text-[color:var(--adflow-fg-muted)]">{initial.rationale}</p>

      <div className="bg-[color:var(--adflow-bg)] border border-[color:var(--adflow-border)] rounded p-3">
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mb-1 uppercase tracking-wide font-medium">
          Ação recomendada
        </p>
        <p className="text-sm text-[color:var(--adflow-fg)]">{initial.suggested_action}</p>
      </div>

      {Object.keys(initial.metrics_snapshot).length > 0 && (
        <div className="font-mono text-xs text-[color:var(--adflow-fg-muted)] flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(initial.metrics_snapshot).map(([k, v]) => (
            <span key={k}>
              {k}:{" "}
              <span className="text-[color:var(--adflow-fg)]">
                {typeof v === "number" ? v.toFixed(4) : String(v)}
              </span>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => updateStatus("applied")}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 disabled:opacity-50 transition-colors"
        >
          {loading === "apply" ? "Aplicando…" : "Aplicar intenção"}
        </button>
        <button
          onClick={() => updateStatus("dismissed")}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:bg-[color:var(--adflow-border)]/30 disabled:opacity-50 transition-colors"
        >
          {loading === "dismiss" ? "Descartando…" : "Descartar"}
        </button>
      </div>
    </div>
  );
}
