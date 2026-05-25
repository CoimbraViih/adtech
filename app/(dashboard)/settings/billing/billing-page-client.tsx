"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { FAKE_SESSION } from "@/lib/auth/session";
import {
  PLANS,
  campaignLimit,
  creativeLimit,
  pixelLimit,
  formatPlanPrice,
} from "@/lib/stripe/plans";
import { PlanBadge } from "@/components/billing/plan-badge";
import { UsageMeter } from "@/components/billing/usage-meter";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

// Mock usage — TODO(M9-backend): fetch from Supabase
const MOCK_USAGE = { campaigns: 2, creatives: 7, pixels: 1 };

export function BillingPageClient() {
  const params = useSearchParams();
  const session = FAKE_SESSION;
  const plan = session.organization.plan;
  const planConfig = PLANS[plan];

  const checkoutStatus = params.get("checkout");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">
          Assinatura &amp; Billing
        </h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)]">
          Gerencie seu plano e informações de pagamento.
        </p>
      </div>

      {checkoutStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-success/10 border border-success/30 text-sm text-success">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Plano atualizado com sucesso!
        </div>
      )}
      {checkoutStatus === "canceled" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm text-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Checkout cancelado. Nenhuma cobrança foi feita.
        </div>
      )}

      <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide mb-1">
              Plano atual
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-[color:var(--adflow-fg)]">
                {planConfig.name}
              </span>
              <PlanBadge plan={plan} />
            </div>
            <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
              {formatPlanPrice(plan)}
              {plan !== "free" ? "/mês" : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {plan !== "free" && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:border-[color:var(--adflow-muted)] transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-3 h-3" />
                {portalLoading ? "Abrindo…" : "Gerenciar assinatura"}
              </button>
            )}
            {plan !== "agency" && (
              <button
                onClick={() => setUpgradeOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
              >
                <CreditCard className="w-3 h-3" />
                Fazer upgrade
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-[color:var(--adflow-border)] pt-4 space-y-3">
          <p className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wide">
            Uso do período
          </p>
          <UsageMeter
            label="Campanhas"
            current={MOCK_USAGE.campaigns}
            limit={campaignLimit(plan)}
          />
          <UsageMeter
            label="Criativos"
            current={MOCK_USAGE.creatives}
            limit={creativeLimit(plan)}
          />
          <UsageMeter
            label="Pixels"
            current={MOCK_USAGE.pixels}
            limit={pixelLimit(plan)}
          />
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={plan}
      />
    </div>
  );
}
