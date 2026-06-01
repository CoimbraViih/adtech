import type { Skill } from "../types";

export const clickNoConvert: Skill = {
  id: "click-no-convert",
  label: "Cliques sem conversão",
  requiredMetrics: ["ctr", "cvr", "clicks"],
  shouldTrigger(ctx) {
    if (ctx.ctr == null || ctx.cvr == null || ctx.clicks < 100) return null;
    const ctrBench = ctx.benchmarks["ctr"];
    const ctrOk = ctrBench ? ctx.ctr >= ctrBench.target : ctx.ctr >= 0.01;
    if (!ctrOk) return null;
    if (ctx.cvr >= 0.005) return null;
    return {
      severity: "warning",
      title: "CTR saudável mas CVR crítico",
      evidence:
        `CTR ${(ctx.ctr * 100).toFixed(2)}% (saudável) mas CVR de ` +
        `${(ctx.cvr * 100).toFixed(2)}% em ${ctx.clicks} cliques. ` +
        `Problema provável: página de destino ou oferta.`,
      metricsSnapshot: { ctr: ctx.ctr, cvr: ctx.cvr, clicks: ctx.clicks },
    };
  },
};
