import type { Skill } from "../types";

export const spendNoConversion: Skill = {
  id: "spend-no-conversion",
  label: "Gasto sem conversão",
  requiredMetrics: ["spend", "conversions"],
  shouldTrigger(ctx) {
    if (ctx.conversions > 0) return null;
    const cpaBench = ctx.benchmarks["cpa"];
    const spendFloor = cpaBench ? cpaBench.target * 3 : 150;
    if (ctx.spend < spendFloor) return null;
    return {
      severity: "critical",
      title: "Gasto sem nenhuma conversão",
      evidence:
        `R$${ctx.spend.toFixed(2)} gastos sem converter nenhuma vez ` +
        `(mínimo esperado: R$${spendFloor.toFixed(2)}). Verificar pixel, ` +
        `segmentação e página de destino.`,
      metricsSnapshot: { spend: ctx.spend, conversions: 0, spend_floor: spendFloor },
    };
  },
};
