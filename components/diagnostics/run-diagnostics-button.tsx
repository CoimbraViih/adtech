"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunDiagnosticsButton({
  workspaceId,
  campaignId,
}: {
  workspaceId: string;
  campaignId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/diagnostics/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...(campaignId ? { campaignId } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Falha ao executar diagnóstico.");
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className="text-sm px-4 py-2 rounded-lg bg-[color:var(--adflow-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Analisando…" : "Rodar análise"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
