"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PlanCard } from "@/components/billing/plan-card";
import type { OrgPlan } from "@/types/database";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  currentPlan: OrgPlan;
};

export function UpgradeModal({ open, onClose, currentPlan }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<OrgPlan | null>(null);

  async function handleSelect(plan: OrgPlan) {
    if (plan === "free") return;
    setLoading(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        console.error("[upgrade-modal] erro no checkout:", data.error);
        return;
      }

      onClose();
      router.push(data.url);
    } finally {
      setLoading(null);
    }
  }

  const plans: OrgPlan[] = ["free", "pro", "agency"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)]">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--adflow-fg)]">
            Escolha o plano certo para sua agência
          </DialogTitle>
          <DialogDescription className="text-[color:var(--adflow-fg-muted)]">
            Sem fidelidade. Cancele quando quiser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={handleSelect}
              loading={loading === plan}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
