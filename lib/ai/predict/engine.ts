import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildCampaignContexts } from '@/lib/ai/diagnostics/context'
import { forecastPacing } from '@/lib/ai/predict/pacing'
import { forecastRoas } from '@/lib/ai/predict/roas'
import { proposeAction } from '@/lib/ai/actions/executor'
import type { OptimizationAction } from '@/types/database'

type PacingRationaleData = { avgDailyBurn: number; dailyBudget: number; pacingRatio: number }
type RoasRationaleData = { forecastRoas: number; trend: string }

export function generateRationale(
  reason: 'overpace' | 'underpace' | 'roas_decline',
  data: PacingRationaleData | RoasRationaleData,
): string {
  if (reason === 'overpace') {
    const d = data as PacingRationaleData
    return (
      `Pacing overpace detectado: gasto médio diário de R$${d.avgDailyBurn} ` +
      `está ${Math.round(d.pacingRatio * 100)}% do budget diário de R$${d.dailyBudget}. ` +
      `Redução de budget recomendada para evitar esgotamento prematuro do orçamento.`
    )
  }
  if (reason === 'underpace') {
    const d = data as PacingRationaleData
    return (
      `Pacing underpace detectado: gasto médio diário de R$${d.avgDailyBurn} ` +
      `está apenas ${Math.round(d.pacingRatio * 100)}% do budget diário de R$${d.dailyBudget}. ` +
      `Aumento de budget recomendado para aproveitar a janela de veiculação.`
    )
  }
  // roas_decline
  const d = data as RoasRationaleData
  return (
    `Declínio de ROAS detectado: forecast de ROAS para os próximos dias é ${d.forecastRoas} (tendência: ${d.trend}). ` +
    `Pausa da campanha recomendada para revisão de criativos e segmentação antes de continuar o investimento.`
  )
}

export async function runPredictiveEngine(
  workspaceId: string,
  organizationId: string,
  mode: 'suggest' | 'autonomous' = 'suggest',
): Promise<OptimizationAction[]> {
  const supabase = await createServerSupabaseClient()
  const contexts = await buildCampaignContexts(workspaceId, organizationId)

  if (contexts.length === 0) return []

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metricsDb = supabase.from('campaign_metrics_daily') as any
  const { data: metricsRaw } = (await metricsDb
    .select('campaign_external_id, platform, date, spend, roas, conversions')
    .eq('workspace_id', workspaceId)
    .gte('date', thirtyDaysAgo)) as {
    data: {
      campaign_external_id: string
      platform: string
      date: string
      spend: number
      roas: number | null
      conversions: number
    }[] | null
  }

  const metrics = metricsRaw ?? []
  const proposed: OptimizationAction[] = []

  for (const ctx of contexts) {
    const extId = (ctx as unknown as { external_id?: string }).external_id ?? ctx.entityId
    const campaignMetrics = metrics.filter(
      (m) => m.campaign_external_id === extId && m.platform === ctx.platform,
    )

    // ── Pacing forecast ──────────────────────────────────────────────────
    const dailyBudget = ctx.spend > 0 ? ctx.spend / 30 : 0
    if (dailyBudget > 0 && campaignMetrics.length >= 3) {
      const pacing = forecastPacing(
        campaignMetrics.map((m) => ({ date: m.date, spend: Number(m.spend) })),
        { dailyBudget },
      )

      if (pacing.status !== 'on_track' && pacing.suggestedDailyBudget !== null) {
        const actionType =
          pacing.status === 'overpace' ? 'budget_decrease' : 'budget_increase'
        const rationale = generateRationale(pacing.status, {
          avgDailyBurn: pacing.avgDailyBurn,
          dailyBudget: pacing.dailyBudget,
          pacingRatio: pacing.pacingRatio,
        })

        const action = await proposeAction({
          workspaceId,
          organizationId,
          campaignId: ctx.campaignId,
          campaignExternalId: extId,
          platform: ctx.platform,
          actionType,
          rationale,
          mode,
          beforeSnapshot: { spend: ctx.spend, pacing },
          budgetBefore: dailyBudget,
          budgetAfter: pacing.suggestedDailyBudget,
        })
        proposed.push(action)
      }
    }

    // ── ROAS decline → pause suggestion ─────────────────────────────────
    if (campaignMetrics.length >= 3) {
      const roas = forecastRoas(
        campaignMetrics.map((m) => ({
          date: m.date,
          roas: m.roas != null ? Number(m.roas) : null,
          conversions: Number(m.conversions),
          spend: Number(m.spend),
        })),
      )

      if (roas.trend === 'down' && roas.forecastRoas < 1.0 && roas.confidenceScore >= 0.5) {
        const rationale = generateRationale('roas_decline', {
          forecastRoas: roas.forecastRoas,
          trend: roas.trend,
        })
        const action = await proposeAction({
          workspaceId,
          organizationId,
          campaignId: ctx.campaignId,
          campaignExternalId: extId,
          platform: ctx.platform,
          actionType: 'pause',
          rationale,
          mode,
          beforeSnapshot: { roas: ctx.roas, roasForecast: roas },
          budgetBefore: null,
          budgetAfter: null,
        })
        proposed.push(action)
      }
    }
  }

  return proposed
}
