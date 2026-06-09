"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import type { OrgPlan } from "@/types/database";

type UpgradeBannerProps = {
  feature: string;
  requiredPlan: OrgPlan;
  currentPlan?: OrgPlan;
};

export function UpgradeBanner({ feature, requiredPlan, currentPlan = "free" }: UpgradeBannerProps) {
  const [open, setOpen] = useState(false);
  const planLabel = requiredPlan === "agency" ? "Agency" : "Pro";

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-[color:var(--adflow-border)] flex items-center justify-center">
          <Lock className="w-5 h-5 text-[color:var(--adflow-fg-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">
            {feature} requer o plano {planLabel}
          </p>
          <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
            Faça upgrade para desbloquear esta funcionalidade.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          Ver planos
        </button>
      </div>
      <UpgradeModal open={open} onClose={() => setOpen(false)} currentPlan={currentPlan} />
    </>
  );
}
