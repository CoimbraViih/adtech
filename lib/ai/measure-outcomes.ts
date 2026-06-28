export type MetricSnapshot = { roas: number; spend: number; conversions: number }

export type OutcomeResult = {
  roas_delta: number
  roas_pct_change: number
  spend_delta: number
  conversions_delta: number
  outcome: 'improved' | 'degraded' | 'neutral'
}

export function computeOutcomeD7(before: MetricSnapshot, after: MetricSnapshot): OutcomeResult {
  const roas_delta = after.roas - before.roas
  const roas_pct_change =
    before.roas > 0 ? ((after.roas - before.roas) / before.roas) * 100 : 0

  let outcome: OutcomeResult['outcome'] = 'neutral'
  if (roas_pct_change >= 10) outcome = 'improved'
  else if (roas_pct_change <= -10) outcome = 'degraded'

  return {
    roas_delta: Math.round(roas_delta * 10000) / 10000,
    roas_pct_change: Math.round(roas_pct_change * 100) / 100,
    spend_delta: Math.round((after.spend - before.spend) * 100) / 100,
    conversions_delta: after.conversions - before.conversions,
    outcome,
  }
}
