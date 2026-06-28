import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { OptimizationAction } from '@/types/database'
import { computeOutcomeD7 } from '@/lib/ai/measure-outcomes'

export async function GET(req: Request) {
  // Vercel Cron authorization
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const { data: actions, error: fetchError } = await supabase
    .from('optimization_actions')
    .select('*')
    .eq('status', 'executed')
    .is('outcome_measured_at', null)
    .lte('executed_at', sevenDaysAgo)
    .limit(50)

  if (fetchError) {
    console.error('[measure-outcomes] failed to fetch actions', fetchError)
    return NextResponse.json({ error: 'Falha ao buscar ações' }, { status: 500 })
  }

  if (!actions || actions.length === 0) {
    return NextResponse.json({ measured: 0 })
  }

  let measured = 0

  for (const rawAction of actions) {
    const action = rawAction as OptimizationAction
    try {
      const beforeSnap = action.before_snapshot as Record<string, unknown>
      const beforeRoas = typeof beforeSnap.roas === 'number' ? beforeSnap.roas : 0
      const beforeSpend = typeof beforeSnap.spend === 'number' ? beforeSnap.spend : 0
      const beforeConversions =
        typeof beforeSnap.conversions === 'number' ? beforeSnap.conversions : 0

      // Fetch D+7 metrics for this campaign
      const executedDate = action.executed_at!.slice(0, 10)
      const d7Date = new Date(
        new Date(executedDate).getTime() + 7 * 86_400_000,
      )
        .toISOString()
        .slice(0, 10)

      const { data: afterMetrics } = await supabase
        .from('campaign_metrics_daily')
        .select('roas, spend, conversions')
        .eq('workspace_id', action.workspace_id)
        .eq('campaign_external_id', action.campaign_external_id)
        .eq('platform', action.platform)
        .gte('date', executedDate)
        .lte('date', d7Date)

      if (!afterMetrics || afterMetrics.length === 0) continue

      const afterRoas =
        afterMetrics.reduce(
          (s: number, r: { roas: number | null }) => s + (r.roas ?? 0),
          0,
        ) / afterMetrics.length
      const afterSpend = afterMetrics.reduce(
        (s: number, r: { spend: number }) => s + (r.spend ?? 0),
        0,
      )
      const afterConversions = afterMetrics.reduce(
        (s: number, r: { conversions: number }) => s + (r.conversions ?? 0),
        0,
      )

      const outcome = computeOutcomeD7(
        { roas: beforeRoas, spend: beforeSpend, conversions: beforeConversions },
        { roas: afterRoas, spend: afterSpend, conversions: afterConversions },
      )

      const { error: updateError } = await supabase
        .from('optimization_actions')
        .update({
          outcome_d7: outcome,
          outcome_measured_at: new Date().toISOString(),
          status: 'outcome_measured',
        })
        .eq('id', action.id)

      if (updateError) {
        console.error('[measure-outcomes] update failed for action', action.id, updateError)
        continue
      }

      measured++
    } catch (err) {
      console.error('[measure-outcomes] error processing action', action.id, err)
    }
  }

  return NextResponse.json({ measured })
}
