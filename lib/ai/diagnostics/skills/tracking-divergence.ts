import type { Skill } from "../types";

const SPEND_THRESHOLD = 100; // R$100 minimum spend to avoid noise on tiny campaigns
const COVERAGE_THRESHOLD = 0.5; // pixel must capture at least 50% of platform conversions

export const trackingDivergence: Skill = {
  id: "tracking-divergence",
  label: "Divergência de rastreamento",
  requiredMetrics: ["conversions", "pixelConversions", "spend"],
  shouldTrigger(ctx) {
    if (ctx.pixelConversions == null) return null;
    if (ctx.conversions === 0) return null;
    if (ctx.spend < SPEND_THRESHOLD) return null;
    const coverage = ctx.pixelConversions / ctx.conversions;
    if (coverage >= COVERAGE_THRESHOLD) return null;
    return {
      severity: "warning",
      title: "Divergência de rastreamento detectada",
      evidence:
        `Pixel server-side registrou ${ctx.pixelConversions} conversões vs ` +
        `${ctx.conversions} reportadas pela plataforma ` +
        `(${(coverage * 100).toFixed(0)}% de cobertura). ` +
        `Verifique a instalação do pixel e o mapeamento de eventos de conversão.`,
      metricsSnapshot: {
        platform_conversions: ctx.conversions,
        pixel_conversions: ctx.pixelConversions,
        coverage_pct: coverage,
        spend: ctx.spend,
      },
    };
  },
};
