"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { IntegrationModal } from "@/components/settings/integration-modal";
import { SyncStatusWidget } from "@/components/integrations/sync-status-widget";
import type { SyncRun } from "@/types/database";

const SYNC_PLATFORMS = new Set(["meta", "google", "tiktok", "linkedin"]);

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type IntegrationCardProps = {
  providerKey: string;
  label: string;
  description: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  lastTestedAt: string | null;
  /** Most-recent sync run for this platform; null if never synced or not a sync platform */
  syncRun: SyncRun | null;
  /** Workspace ID needed by the sync widget */
  workspaceId: string;
  onSaved: () => void;
};

export function IntegrationCard({
  providerKey,
  label,
  description,
  docsUrl,
  fields,
  configured,
  lastTestedAt,
  syncRun,
  workspaceId,
  onSaved,
}: IntegrationCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remover integração ${label}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/settings/integrations/${providerKey}`, { method: "DELETE" });
      onSaved();
    } finally {
      setDeleting(false);
    }
  }

  const testedDate = lastTestedAt
    ? new Date(lastTestedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : null;

  const isSyncable = SYNC_PLATFORMS.has(providerKey);

  return (
    <>
      <div className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--adflow-fg)] truncate">{label}</p>
            <p className="text-xs text-[color:var(--adflow-fg-muted)] line-clamp-2 mt-0.5">{description}</p>
          </div>
          {configured ? (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-[color:var(--adflow-success)] text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] text-[10px] px-2 py-0.5 rounded-full">
              <Circle className="w-3 h-3" /> Não configurado
            </span>
          )}
        </div>

        {testedDate && (
          <p className="text-[10px] text-[color:var(--adflow-fg-muted)]">
            Testado em {testedDate}
          </p>
        )}

        {/* Sync status + button — only for ad platforms */}
        {isSyncable && (
          <SyncStatusWidget
            platform={providerKey}
            workspaceId={workspaceId}
            initialRun={syncRun}
            configured={configured}
          />
        )}

        <div className="flex gap-2 mt-auto pt-1">
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 text-xs font-semibold bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white rounded-md py-1.5 transition-colors"
          >
            {configured ? "Editar" : "Configurar"}
          </button>
          {configured && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-md bg-[color:var(--adflow-border)] hover:bg-[color:var(--adflow-danger)]/10 hover:text-[color:var(--adflow-danger)] text-[color:var(--adflow-fg-muted)] transition-colors disabled:opacity-50"
              aria-label="Remover integração"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <IntegrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        providerKey={providerKey}
        label={label}
        docsUrl={docsUrl}
        fields={fields}
        configured={configured}
        onSaved={() => { setModalOpen(false); onSaved(); }}
      />
    </>
  );
}
