import type { AlertRule, CampaignMetricSnapshot } from "@/types/database";

export function evaluateRule(
  rule: AlertRule,
  metric: CampaignMetricSnapshot
): boolean {
  if (rule.status === "paused") return false;

  if (rule.last_triggered_at) {
    const elapsedMs = Date.now() - new Date(rule.last_triggered_at).getTime();
    const cooldownMs = rule.cooldown_minutes * 60 * 1000;
    if (elapsedMs < cooldownMs) return false;
  }

  return conditionBreach(rule, metric);
}

function conditionBreach(rule: AlertRule, m: CampaignMetricSnapshot): boolean {
  switch (rule.condition) {
    case "roas_below":
      return m.roas !== null && m.roas < rule.threshold;
    case "cpa_above":
      return m.cpa !== null && m.cpa > rule.threshold;
    case "spend_above":
      return m.spend > rule.threshold;
    case "ctr_below":
      return m.ctr !== null && m.ctr < rule.threshold;
    case "conversions_below":
      return m.conversions < rule.threshold;
  }
}

export function buildNotificationMessage(
  rule: AlertRule,
  metric: CampaignMetricSnapshot,
  actualValue: number
): { title: string; body: string } {
  const conditionLabels: Record<AlertRule["condition"], string> = {
    roas_below: "ROAS abaixo do limite",
    cpa_above: "CPA acima do limite",
    spend_above: "Gasto acima do limite",
    ctr_below: "CTR abaixo do limite",
    conversions_below: "Conversões abaixo do limite",
  };

  const title = `Alerta: ${conditionLabels[rule.condition]}`;
  const body = `Campanha "${metric.campaign_name}": valor atual ${actualValue.toFixed(2)}, limite configurado ${rule.threshold}. Regra: "${rule.name}".`;

  return { title, body };
}

export function getMetricValue(
  condition: AlertRule["condition"],
  metric: CampaignMetricSnapshot
): number | null {
  switch (condition) {
    case "roas_below":      return metric.roas;
    case "cpa_above":       return metric.cpa;
    case "spend_above":     return metric.spend;
    case "ctr_below":       return metric.ctr;
    case "conversions_below": return metric.conversions;
  }
}
