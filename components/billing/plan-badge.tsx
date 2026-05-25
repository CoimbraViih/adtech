import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/stripe/plans";
import type { OrgPlan } from "@/types/database";

const PLAN_STYLES: Record<OrgPlan, string> = {
  free: "bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]",
  pro: "bg-data/20 text-data",
  agency: "bg-accent/20 text-accent",
};

type PlanBadgeProps = {
  plan: OrgPlan;
  className?: string;
};

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
        PLAN_STYLES[plan],
        className
      )}
    >
      {PLANS[plan].name}
    </span>
  );
}
