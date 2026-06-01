"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import type { AiDiagnostic } from "@/types/database";

const SEVERITY_STYLES = {
  critical: {
    chip: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "Crítico",
    bar: "bg-red-500",
  },
  warning: {
    chip: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    label: "Atenção",
    bar: "bg-yellow-500",
  },
  info: {
    chip: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    label: "Info",
    bar: "bg-blue-500",
  },
} as const;

type Props = { diagnostic: AiDiagnostic };

export function DiagnosticCard({ diagnostic: initial }: Props) {
  const [expanded, setExpanded] = useState(false);
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
    <div className="border border-[color:var(--adflow-border)] rounded-lg overflow-hidden bg-[color:var(--adflow-surface)]">
      {/* Compact header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--adflow-border)]/30 transition-colors text-left"
      >
        <span className={`text-xs font-medium px-2 py-0.5 rounded border shrink-0 ${style.chip}`}>
          {style.label}
        </span>
        <span className="flex-1 text-sm font-medium text-[color:var(--adflow-fg)] truncate">
          {initial.title}
        </span>
        <span className="text-xs text-[color:var(--adflow-fg-muted)] shrink-0 mr-2">
          {new Date(initial.created_at).toLocaleDateString("pt-BR")}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[color:var(--adflow-fg-muted)] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[color:var(--adflow-fg-muted)] shrink-0" />
        )}
      </button>

      {/* Preview strip — rationale always visible when collapsed */}
      {!expanded && (
        <div className="px-4 pb-3 border-t border-[color:var(--adflow-border)]">
          <p className="text-xs text-[color:var(--adflow-fg-muted)] leading-relaxed pt-2 line-clamp-2">
            {initial.rationale}
          </p>
          <div className="flex items-start gap-1.5 mt-2">
            <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-[color:var(--adflow-data)]" />
            <p className="text-xs text-[color:var(--adflow-data)] leading-relaxed line-clamp-1">
              {initial.suggested_action}
            </p>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-[color:var(--adflow-border)] space-y-3">
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">{initial.rationale}</p>

          <div className="bg-[color:var(--adflow-bg,#0D0D1A)] border border-[color:var(--adflow-border)] rounded p-3">
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
      )}
    </div>
  );
}
