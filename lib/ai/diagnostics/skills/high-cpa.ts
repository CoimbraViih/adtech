import type { Skill } from "../types";

export const highCpa: Skill = {
  id: "high-cpa",
  label: "CPA acima do target",
  requiredMetrics: ["cpa", "conversions"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["cpa"];
    if (!bench || ctx.cpa == null || ctx.conversions === 0) return null;
    const failing = bench.comparator === "lte" ? ctx.cpa > bench.target : ctx.cpa < bench.target;
    if (!failing) return null;
    return {
      severity: ctx.cpa > bench.target * 2 ? "critical" : "warning",
      title: "CPA acima do target",
      evidence:
        `CPA R$${ctx.cpa.toFixed(2)} vs target R$${bench.target.toFixed(2)} ` +
        `com ${ctx.conversions} conversões. Revisar oferta, página de destino ou audiência.`,
      metricsSnapshot: { cpa: ctx.cpa, cpa_target: bench.target, conversions: ctx.conversions },
    };
  },
};
