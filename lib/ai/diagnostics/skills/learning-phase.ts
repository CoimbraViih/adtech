import type { Skill } from "../types";

export const learningPhase: Skill = {
  id: "learning-phase",
  label: "Fase de aprendizado",
  requiredMetrics: ["conversions"],
  shouldTrigger(ctx) {
    if (ctx.conversions >= 50) return null;
    return {
      severity: "info",
      title: "Campanha em fase de aprendizado",
      evidence:
        `${ctx.conversions} conversões acumuladas (mínimo 50 para saída do aprendizado). ` +
        `Evitar alterações até atingir o volume mínimo.`,
      metricsSnapshot: { conversions: ctx.conversions, conversions_needed: 50 },
    };
  },
};
