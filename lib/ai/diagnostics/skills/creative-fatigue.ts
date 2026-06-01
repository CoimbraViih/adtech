import type { Skill } from "../types";

export const creativeFatigue: Skill = {
  id: "creative-fatigue",
  label: "Fadiga de criativo",
  requiredMetrics: ["frequency", "ctrDelta7d"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["frequency"];
    if (!bench || ctx.frequency == null || ctx.ctrDelta7d == null) return null;
    const freqHigh = ctx.frequency > bench.target;
    if (!freqHigh) return null;
    if (ctx.ctrDelta7d > -0.20) return null;
    return {
      severity: ctx.frequency > bench.target * 1.5 ? "critical" : "warning",
      title: "Fadiga de criativo detectada",
      evidence:
        `Frequência ${ctx.frequency.toFixed(1)}x (limite ${bench.target}x) com queda de CTR ` +
        `de ${(Math.abs(ctx.ctrDelta7d) * 100).toFixed(0)}% em 7 dias. Rotacionar criativos.`,
      metricsSnapshot: {
        frequency: ctx.frequency,
        frequency_limit: bench.target,
        ctr_delta_7d: ctx.ctrDelta7d,
      },
    };
  },
};
