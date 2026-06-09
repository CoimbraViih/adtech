"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, formatPlanPrice, formatLimit } from "@/lib/stripe/plans";
import { PlanBadge } from "@/components/billing/plan-badge";
import type { OrgPlan } from "@/types/database";

type PlanCardProps = {
  plan: OrgPlan;
  currentPlan: OrgPlan;
  onSelect: (plan: OrgPlan) => void;
  loading?: boolean;
};

const PLAN_FEATURES: Array<{ label: string; key: keyof typeof PLANS.free.features }> = [
  { label: "IA para criativos (GPT-4o)", key: "aiCreatives" },
  { label: "Automação de alertas", key: "automation" },
  { label: "Programático RTB", key: "programmatic" },
  { label: "White-label", key: "whiteLabel" },
  { label: "Suporte prioritário", key: "prioritySupport" },
];

export function PlanCard({ plan, currentPlan, onSelect, loading }: PlanCardProps) {
  const config = PLANS[plan];
  const isCurrent = plan === currentPlan;
  const isDowngrade =
    (currentPlan === "agency" && plan !== "agency") ||
    (currentPlan === "pro" && plan === "free");

  return (
    <div
      className={cn(
        "rounded-lg border p-5 flex flex-col gap-4 transition-colors",
        isCurrent
          ? "border-accent bg-accent/5"
          : "border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <PlanBadge plan={plan} />
          <p className="mt-2 text-xl font-semibold text-[color:var(--adflow-fg)]">
            {formatPlanPrice(plan)}
            {plan !== "free" && (
              <span className="text-sm font-normal text-[color:var(--adflow-fg-muted)]">/mês</span>
            )}
          </p>
        </div>
        {isCurrent && (
          <span className="text-xs text-accent font-medium">Atual</span>
        )}
      </div>

      <ul className="space-y-1.5 text-sm flex-1">
        <li className="text-[color:var(--adflow-fg-muted)]">
          <span className="font-mono text-[color:var(--adflow-fg)]">{formatLimit(config.campaigns)}</span>{" "}
          campanhas
        </li>
        <li className="text-[color:var(--adflow-fg-muted)]">
          <span className="font-mono text-[color:var(--adflow-fg)]">{formatLimit(config.creatives)}</span>{" "}
          criativos
        </li>
        <li className="text-[color:var(--adflow-fg-muted)]">
          <span className="font-mono text-[color:var(--adflow-fg)]">{formatLimit(config.pixels)}</span>{" "}
          pixel(s)
        </li>
        {PLAN_FEATURES.map(({ label, key }) => (
          <li key={key} className="flex items-center gap-2">
            {config.features[key] ? (
              <Check className="w-3.5 h-3.5 text-success shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-[color:var(--adflow-border)] shrink-0" />
            )}
            <span
              className={cn(
                config.features[key]
                  ? "text-[color:var(--adflow-fg)]"
                  : "text-[color:var(--adflow-fg-muted)]"
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      {!isCurrent && !isDowngrade && plan !== "free" && (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={cn(
            "w-full rounded-md py-2 text-sm font-medium transition-colors",
            "bg-accent text-white hover:bg-accent/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? "Processando…" : `Upgrade para ${config.name}`}
        </button>
      )}

      {!isCurrent && isDowngrade && (
        <p className="text-xs text-center text-[color:var(--adflow-fg-muted)]">
          Para fazer downgrade, use o portal de assinatura.
        </p>
      )}
    </div>
  );
}
