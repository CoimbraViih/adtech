"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunDiagnosticsButton({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    setLoading(true);
    await fetch("/api/ai/diagnostics/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg bg-[color:var(--adflow-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {loading ? "Analisando…" : "Rodar análise"}
    </button>
  );
}
