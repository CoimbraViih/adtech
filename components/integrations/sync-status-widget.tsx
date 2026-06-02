"use client";

import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Minus } from "lucide-react";
import type { SyncRun, SyncRunStatus } from "@/types/database";

type SyncStatusWidgetProps = {
  platform: string;
  workspaceId: string;
  /** Most-recent sync_run row fetched server-side; null if never synced */
  initialRun: SyncRun | null;
  /** Whether the platform has credentials configured */
  configured: boolean;
};

type SyncApiResponse = {
  platform: string;
  synced: number;
  error: string | null;
};

function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

type StatusBadgeProps = {
  status: SyncRunStatus;
  startedAt: string;
  campaignsSynced: number;
  errorMessage: string | null;
};

function StatusBadge({ status, startedAt, campaignsSynced, errorMessage }: StatusBadgeProps) {
  if (status === "success") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-[color:var(--adflow-success)]"
        title={`${campaignsSynced} campanhas sincronizadas`}
      >
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        <span>Sincronizado {formatRelative(startedAt)} — {campaignsSynced} camp.</span>
      </span>
    );
  }

  if (status === "partial") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-[color:var(--adflow-warning)]"
        title={errorMessage ?? undefined}
      >
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span>
          Sincronização parcial
          {errorMessage ? ` — ${truncate(errorMessage)}` : ""}
        </span>
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-[color:var(--adflow-danger)]"
        title={errorMessage ?? undefined}
      >
        <XCircle className="w-3 h-3 shrink-0" />
        <span>
          Falha na última sincronização
          {errorMessage ? ` — ${truncate(errorMessage)}` : ""}
        </span>
      </span>
    );
  }

  // never-synced fallback
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--adflow-fg-muted)]">
      <Minus className="w-3 h-3 shrink-0" />
      <span>Nunca sincronizado</span>
    </span>
  );
}

export function SyncStatusWidget({
  platform,
  workspaceId,
  initialRun,
  configured,
}: SyncStatusWidgetProps) {
  // Optimistic local run state so the UI refreshes immediately after a sync
  const [run, setRun] = useState<SyncRun | null>(initialRun);
  const [syncing, setSyncing] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    if (!configured || syncing) return;
    setSyncing(true);
    setInlineError(null);

    const startedAt = new Date().toISOString();

    try {
      const res = await fetch("/api/campaigns/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, workspaceId }),
      });

      const data = await res.json() as SyncApiResponse;

      if (!res.ok) {
        setInlineError((data as { error?: string }).error ?? "Erro desconhecido.");
        // Optimistically create an error run in local state
        setRun({
          id: `local_${Date.now()}`,
          workspace_id: workspaceId,
          platform,
          status: "error",
          campaigns_synced: 0,
          error_message: (data as { error?: string }).error ?? "Erro desconhecido.",
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          created_at: startedAt,
        });
        return;
      }

      // Build an optimistic run row from the response
      const newRun: SyncRun = {
        id: `local_${Date.now()}`,
        workspace_id: workspaceId,
        platform: data.platform,
        status: data.error ? "partial" : "success",
        campaigns_synced: data.synced,
        error_message: data.error,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        created_at: startedAt,
      };
      setRun(newRun);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de rede.";
      setInlineError(msg);
      setRun({
        id: `local_${Date.now()}`,
        workspace_id: workspaceId,
        platform,
        status: "error",
        campaigns_synced: 0,
        error_message: msg,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        created_at: startedAt,
      });
    } finally {
      setSyncing(false);
    }
  }, [configured, syncing, platform, workspaceId]);

  return (
    <div className="flex items-center justify-between gap-2 mt-2">
      {/* Status label */}
      <div className="min-w-0 flex-1">
        {run ? (
          <StatusBadge
            status={run.status}
            startedAt={run.started_at}
            campaignsSynced={run.campaigns_synced}
            errorMessage={run.error_message}
          />
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--adflow-fg-muted)]">
            <Minus className="w-3 h-3 shrink-0" />
            <span>Nunca sincronizado</span>
          </span>
        )}
        {inlineError && !run && (
          <p className="text-[10px] text-[color:var(--adflow-danger)] mt-0.5 truncate">
            {truncate(inlineError)}
          </p>
        )}
      </div>

      {/* Sync button */}
      <button
        onClick={handleSync}
        disabled={!configured || syncing}
        title={
          !configured
            ? "Configure as credenciais para sincronizar"
            : syncing
            ? "Sincronizando…"
            : "Sincronizar agora"
        }
        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors
          bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]
          hover:bg-[color:var(--adflow-accent)]/10 hover:text-[color:var(--adflow-accent)]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[color:var(--adflow-border)] disabled:hover:text-[color:var(--adflow-fg-muted)]"
      >
        <RefreshCw
          className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`}
        />
        <span>{syncing ? "Sincronizando…" : "Sincronizar"}</span>
      </button>
    </div>
  );
}
