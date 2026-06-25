"use client";

import { useState } from "react";
import type { CommerceProvider } from "@/lib/commerce/types";

type Props = {
  provider: CommerceProvider;
  label: string;
  logo: string; // text emoji or SVG path
  isConnected: boolean;
  connectedStoreId?: string;
  lastSynced?: string | null;
  // For VTEX only — shows API key form instead of OAuth button
  mode: "oauth" | "apikey";
};

export function CommerceConnectCard({
  provider,
  label,
  logo,
  isConnected,
  connectedStoreId,
  lastSynced,
  mode,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [shopInput, setShopInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/commerce/${provider}/sync`, { method: "POST" });
      const data = (await res.json()) as { upserted?: number; error?: string };
      setSyncMsg(
        data.upserted !== undefined
          ? `${data.upserted} produtos sincronizados`
          : (data.error ?? "Erro")
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveVtex(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/commerce/vtex/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiToken, accountName }),
      });
      if (!res.ok) throw new Error("Falha ao salvar credenciais");
      window.location.reload();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{logo}</span>
        <div>
          <h3 className="text-sm font-medium text-white">{label}</h3>
          {isConnected && connectedStoreId && (
            <p className="text-xs text-[var(--color-muted)]">
              Conectado: {connectedStoreId}
              {lastSynced &&
                ` · Sync: ${new Date(lastSynced).toLocaleDateString("pt-BR")}`}
            </p>
          )}
          {!isConnected && (
            <p className="text-xs text-[var(--color-muted)]">Não conectado</p>
          )}
        </div>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
            isConnected
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-[var(--color-border)] text-[var(--color-muted)]"
          }`}
        >
          {isConnected ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* VTEX: API key form */}
      {mode === "apikey" && !isConnected && (
        <form onSubmit={handleSaveVtex} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Account Name (ex: minhaloja)"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
            className="rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <input
            type="text"
            placeholder="App Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <input
            type="password"
            placeholder="App Token"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            required
            className="rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar credenciais VTEX"}
          </button>
        </form>
      )}

      {/* Shopify: needs shop domain input */}
      {mode === "oauth" && !isConnected && provider === "shopify" && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="sua-loja.myshopify.com"
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <a
            href={
              shopInput
                ? `/api/commerce/shopify/oauth/start?shop=${encodeURIComponent(shopInput)}`
                : "#"
            }
            className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white whitespace-nowrap"
          >
            Conectar Shopify
          </a>
        </div>
      )}

      {/* Nuvemshop: simple OAuth button */}
      {mode === "oauth" && !isConnected && provider === "nuvemshop" && (
        <a
          href="/api/commerce/nuvemshop/oauth/start"
          className="inline-flex items-center justify-center rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Conectar Nuvemshop
        </a>
      )}

      {/* Connected state: sync button */}
      {isConnected && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded border border-[var(--color-border)] bg-[var(--color-base)] px-4 py-2 text-sm text-white hover:border-[var(--color-accent)] disabled:opacity-50"
          >
            {syncing ? "Sincronizando…" : "Sincronizar catálogo"}
          </button>
          {syncMsg && <span className="text-xs text-[var(--color-muted)]">{syncMsg}</span>}
        </div>
      )}
    </div>
  );
}
