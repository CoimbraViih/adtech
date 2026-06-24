"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanBadge } from "@/components/billing/plan-badge";
import type { OrgPlan } from "@/types/database";

// ── Inline plan data (M22: subscription plans kept for legacy checkout UI) ───

type PlanFeatures = {
  aiCreatives: boolean;
  automation: boolean;
  programmatic: boolean;
  whiteLabel: boolean;
  prioritySupport: boolean;
};

type PlanConfig = {
  name: string;
  priceMonthly: number;
  stripePriceId: string;
  campaigns: number;
  creatives: number;
  pixels: number;
  features: PlanFeatures;
};

const PLANS: Record<OrgPlan, PlanConfig> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: "",
    campaigns: 3,
    creatives: 10,
    pixels: 1,
    features: { aiCreatives: false, automation: false, programmatic: false, whiteLabel: false, prioritySupport: false },
  },
  pro: {
    name: "Pro",
    priceMonthly: 50000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "price_pro_test",
    campaigns: 25,
    creatives: 100,
    pixels: 5,
    features: { aiCreatives: true, automation: true, programmatic: false, whiteLabel: false, prioritySupport: false },
  },
  agency: {
    name: "Agency",
    priceMonthly: 300000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID ?? "price_agency_test",
    campaigns: -1,
    creatives: -1,
    pixels: -1,
    features: { aiCreatives: true, automation: true, programmatic: true, whiteLabel: true, prioritySupport: true },
  },
};

function formatPlanPrice(plan: OrgPlan): string {
  const { priceMonthly } = PLANS[plan];
  if (priceMonthly === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(priceMonthly / 100);
}

function formatLimit(limit: number): string {
  return limit === -1 ? "Ilimitado" : String(limit);
}

// ── Component ─────────────────────────────────────────────────────────────────

type PlanCardProps = {
  plan: OrgPlan;
  currentPlan: OrgPlan;
  onSelect: (plan: OrgPlan) => void;
  loading?: boolean;
};

const PLAN_FEATURES: Array<{ label: string; key: keyof PlanFeatures }> = [
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
