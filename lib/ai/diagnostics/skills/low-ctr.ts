import type { Skill } from "../types";

export const lowCtr: Skill = {
  id: "low-ctr",
  label: "CTR abaixo do benchmark",
  requiredMetrics: ["ctr", "impressions"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["ctr"];
    if (!bench || ctx.ctr == null || ctx.impressions < 1000) return null;
    const failing = bench.comparator === "gte" ? ctx.ctr < bench.target : ctx.ctr > bench.target;
    if (!failing) return null;
    return {
      severity: ctx.ctr < bench.target * 0.5 ? "critical" : "warning",
      title: "CTR abaixo do benchmark",
      evidence:
        `CTR de ${(ctx.ctr * 100).toFixed(2)}% vs meta ${(bench.target * 100).toFixed(2)}% ` +
        `em ${ctx.impressions.toLocaleString("pt-BR")} impressões. ` +
        `Possível desalinhamento de criativo ou audiência.`,
      metricsSnapshot: { ctr: ctx.ctr, ctr_target: bench.target, impressions: ctx.impressions },
    };
  },
};
