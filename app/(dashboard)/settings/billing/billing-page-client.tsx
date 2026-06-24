"use client";

import { useState } from "react";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { SpendMeter } from "@/components/billing/usage-meter";
import { formatFeeBRL, TIERS, FLOOR_BRL } from "@/lib/billing/fee-calculator";

// ── Types ─────────────────────────────────────────────────────────────────────

type Invoice = {
  id: string;
  amount_brl: number;
  spend_brl: number;
  status: string;
  stripe_hosted_url: string | null;
  paid_at: string | null;
  created_at: string;
  billing_period_id: string;
};

export type BillingPageClientProps = {
  billingStatus: string;
  currentSpendBRL: number;
  estimatedFeeBRL: number;
  currentPeriodLabel: string; // e.g. "Junho 2026"
  invoices: Invoice[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color:var(--adflow-success)]/10 text-[color:var(--adflow-success)] border border-[color:var(--adflow-success)]/20">
        Pago
      </span>
    );
  }
  if (status === "open" || status === "pending") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color:var(--adflow-warning)]/10 text-[color:var(--adflow-warning)] border border-[color:var(--adflow-warning)]/20">
        Pendente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]">
      {status === "closed" ? "Sem fatura" : status}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingPageClient({
  billingStatus,
  currentSpendBRL,
  estimatedFeeBRL,
  currentPeriodLabel,
  invoices,
}: BillingPageClientProps) {
  const [portalLoading, setPortalLoading] = useState(false);

  const isPastDue = billingStatus === "past_due" || billingStatus === "suspended";
  const openInvoice = invoices.find((inv) => inv.status === "open" || inv.status === "pending");

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error("[billing] erro ao abrir portal:", data.error);
        return;
      }
      window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">Billing</h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)]">
          Acompanhe seu gasto gerenciado e faturas mensais.
        </p>
      </div>

      {/* ── 1. Past-due banner ─────────────────────────────────────────── */}
      {isPastDue && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[color:var(--adflow-danger)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[color:var(--adflow-danger)]">
              Pagamento pendente — acesse a fatura para regularizar.
            </p>
          </div>
          {openInvoice?.stripe_hosted_url && (
            <a
              href={openInvoice.stripe_hosted_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-[color:var(--adflow-danger)] text-white hover:bg-[color:var(--adflow-danger)]/90 transition-colors"
            >
              Ver fatura em aberto
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* ── 2. Período atual card ──────────────────────────────────────── */}
      <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5 space-y-4">
        <div>
          <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide mb-1">
            Período atual
          </p>
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">{currentPeriodLabel}</p>
        </div>

        {/* Spend meter */}
        <SpendMeter currentBRL={currentSpendBRL} />

        {/* Fee rows */}
        <div className="border-t border-[color:var(--adflow-border)] pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[color:var(--adflow-fg-muted)]">Gasto gerenciado</span>
            <span className="font-mono font-medium text-[color:var(--adflow-fg)]">
              {formatFeeBRL(currentSpendBRL)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[color:var(--adflow-fg-muted)]">Taxa estimada</span>
            <span className="font-mono font-medium text-[color:var(--adflow-fg)]">
              {formatFeeBRL(estimatedFeeBRL)}
            </span>
          </div>
          <p className="text-xs text-[color:var(--adflow-fg-muted)] pt-1">
            Cobrado no dia 1 do próximo mês.
          </p>
        </div>

        {/* Tier mini-table */}
        <div className="rounded-md border border-[color:var(--adflow-border)] divide-y divide-[color:var(--adflow-border)] text-xs">
          <div className="flex justify-between px-3 py-2">
            <span className="text-[color:var(--adflow-fg-muted)]">Faixa de gasto</span>
            <span className="text-[color:var(--adflow-fg-muted)]">Taxa</span>
          </div>
          {TIERS.map((tier, i) => (
            <div key={i} className="flex justify-between px-3 py-2">
              <span className="text-[color:var(--adflow-fg)]">
                {i === 0 ? "R$ 0 – R$ 2.000" : i === 1 ? "R$ 2.001 – R$ 5.000" : "Acima de R$ 5.000"}
              </span>
              <span className="font-mono text-[color:var(--adflow-fg)]">{tier.label}</span>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2 bg-[color:var(--adflow-border)]/30">
            <span className="text-[color:var(--adflow-fg-muted)]">Piso mínimo</span>
            <span className="font-mono text-[color:var(--adflow-fg)]">{formatFeeBRL(FLOOR_BRL)}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Histórico de faturas card ───────────────────────────────── */}
      <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5 space-y-4">
        <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide">
          Histórico de faturas
        </p>

        {invoices.length === 0 ? (
          <p className="text-sm text-[color:var(--adflow-fg-muted)] py-2">
            Nenhuma fatura ainda — sua primeira fatura é gerada no dia 1 do próximo mês.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--adflow-border)]">
                  <th className="text-left px-5 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
                    Criada em
                  </th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
                    Gasto
                  </th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
                    Taxa
                  </th>
                  <th className="text-center px-5 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--adflow-border)]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[color:var(--adflow-border)]/20 transition-colors">
                    <td className="px-5 py-3 text-[color:var(--adflow-fg)] whitespace-nowrap">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[color:var(--adflow-fg)] whitespace-nowrap">
                      {formatFeeBRL(inv.spend_brl)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[color:var(--adflow-fg)] whitespace-nowrap">
                      {formatFeeBRL(inv.amount_brl)}
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.stripe_hosted_url && (
                        <a
                          href={inv.stripe_hosted_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
                          title="Abrir fatura"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Stripe portal link ──────────────────────────────────────── */}
      <div className="text-center">
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="text-xs text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          {portalLoading ? "Abrindo…" : "Gerenciar método de pagamento"}
        </button>
      </div>
    </div>
  );
}
