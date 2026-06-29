import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ScreenContext } from './types'

type ChatCompletionTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: object
  }
}

export const ASSISTANT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getCampaignSummary',
      description: 'Retorna resumo das campanhas do workspace: nome, plataforma, status, orçamento e métricas recentes.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'draft', 'all'],
            description: 'Filtro de status. Use "all" para todas.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPixelStats',
      description: 'Retorna estatísticas de eventos do pixel AdFlow nos últimos N dias.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Quantidade de dias retroativos (padrão: 7).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCreativesOverview',
      description: 'Retorna visão geral dos criativos do workspace: tipo, headline, quality score.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explainMetric',
      description: 'Explica o que é uma métrica de marketing digital e como interpretar o valor informado.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Nome da métrica: CTR, CPA, ROAS, CPM, etc.' },
          value: { type: 'number', description: 'Valor atual da métrica.' },
        },
        required: ['metric'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pauseCampaign',
      description: 'Pausa uma campanha ativa. REQUER confirmação explícita do usuário antes de executar.',
      parameters: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'ID interno da campanha no AdFlow.' },
          campaignName: { type: 'string', description: 'Nome da campanha (para exibir na confirmação).' },
        },
        required: ['campaignId', 'campaignName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resumeCampaign',
      description: 'Reativa uma campanha pausada. REQUER confirmação explícita do usuário antes de executar.',
      parameters: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'ID interno da campanha no AdFlow.' },
          campaignName: { type: 'string', description: 'Nome da campanha (para exibir na confirmação).' },
        },
        required: ['campaignId', 'campaignName'],
      },
    },
  },
]

// Set of tools that require user confirmation before executing
export const WRITE_TOOLS = new Set(['pauseCampaign', 'resumeCampaign'])

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ScreenContext
): Promise<string> {
  switch (name) {
    case 'getCampaignSummary':
      return getCampaignSummary(args, ctx)
    case 'getPixelStats':
      return getPixelStats(args, ctx)
    case 'getCreativesOverview':
      return getCreativesOverview(ctx)
    case 'explainMetric':
      return explainMetric(args)
    default:
      throw new Error(`Tool desconhecida: ${name}`)
  }
}

async function getCampaignSummary(
  args: Record<string, unknown>,
  ctx: ScreenContext
): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const statusFilter = typeof args.status === 'string' && args.status !== 'all'
    ? args.status
    : null

  let query = supabase
    .from('campaigns')
    .select('id, name, status, platform, daily_budget, start_date, end_date')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: campaigns, error } = await query
  if (error) { console.error('[assistant/tools] getCampaignSummary error:', error.message); throw new Error('Erro ao buscar dados de campanhas.') }

  // Fetch last 7-day metrics for these campaigns
  const ids = (campaigns ?? []).map((c) => c.id)
  let metrics: Array<{ campaign_id: string; impressions: number; clicks: number; conversions: number; spend: number }> = []

  if (ids.length > 0) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: metricsData } = await supabase
      .from('campaign_metrics_daily')
      .select('campaign_id, impressions, clicks, conversions, spend')
      .in('campaign_id', ids)
      .gte('date', since)

    // Aggregate by campaign_id
    const agg: Record<string, typeof metrics[0]> = {}
    for (const m of metricsData ?? []) {
      if (!agg[m.campaign_id]) {
        agg[m.campaign_id] = { campaign_id: m.campaign_id, impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      }
      agg[m.campaign_id].impressions += m.impressions ?? 0
      agg[m.campaign_id].clicks += m.clicks ?? 0
      agg[m.campaign_id].conversions += m.conversions ?? 0
      agg[m.campaign_id].spend += Number(m.spend ?? 0)
    }
    metrics = Object.values(agg)
  }

  const metricsMap = Object.fromEntries(metrics.map((m) => [m.campaign_id, m]))

  const result = (campaigns ?? []).map((c) => {
    const m = metricsMap[c.id]
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      platform: c.platform,
      daily_budget: c.daily_budget,
      last_7d: m
        ? {
            impressions: m.impressions,
            clicks: m.clicks,
            conversions: m.conversions,
            spend: m.spend.toFixed(2),
            ctr: m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) + '%' : 'N/A',
            cpa: m.conversions > 0 ? 'R$ ' + (m.spend / m.conversions).toFixed(2) : 'N/A',
          }
        : null,
    }
  })

  return JSON.stringify({ campaigns: result, source: 'campaigns + campaign_metrics_daily (últimos 7 dias)' })
}

async function getPixelStats(
  args: Record<string, unknown>,
  ctx: ScreenContext
): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const days = typeof args.days === 'number' ? args.days : 7
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('pixel_events')
    .select('event_type')
    .eq('workspace_id', ctx.workspaceId)
    .gte('created_at', since)

  if (error) { console.error('[assistant/tools] getPixelStats error:', error.message); throw new Error('Erro ao buscar dados de pixel.') }

  const counts: Record<string, number> = {}
  for (const e of data ?? []) {
    counts[e.event_type] = (counts[e.event_type] ?? 0) + 1
  }

  return JSON.stringify({
    period_days: days,
    event_counts: counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    source: 'pixel_events',
  })
}

async function getCreativesOverview(ctx: ScreenContext): Promise<string> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('creatives')
    .select('id, name, type, headline, quality_score, status, created_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(15)

  if (error) { console.error('[assistant/tools] getCreativesOverview error:', error.message); throw new Error('Erro ao buscar dados de criativos.') }

  return JSON.stringify({
    creatives: data ?? [],
    source: 'creatives',
  })
}

function explainMetric(args: Record<string, unknown>): Promise<string> {
  const metric = String(args.metric ?? '').toUpperCase()
  const value = args.value !== undefined ? args.value : null

  const explanations: Record<string, string> = {
    CTR: 'CTR (Click-Through Rate) = cliques / impressões × 100. Mede o percentual de pessoas que clicaram no anúncio. CTR acima de 1% é considerado bom para display; acima de 3% é excelente para search.',
    CPA: 'CPA (Custo por Aquisição) = gasto total / número de conversões. Quanto menor, mais eficiente a campanha. Compare com o LTV do cliente para saber se é rentável.',
    ROAS: 'ROAS (Return on Ad Spend) = receita gerada / gasto. ROAS de 4 significa R$4 de retorno para cada R$1 investido. Breakeven típico: 3–4×.',
    CPM: 'CPM (Custo por Mil Impressões) = gasto / impressões × 1000. Métrica de alcance; útil para campanhas de awareness.',
    CPC: 'CPC (Custo por Clique) = gasto / cliques. Quanto você paga por cada visitante gerado pelo anúncio.',
    CVR: 'CVR (Conversion Rate) = conversões / cliques × 100. Mede eficiência da landing page em converter visitantes.',
  }

  const explanation = explanations[metric] ?? `${metric}: métrica de performance de anúncios digitais.`
  const valueNote = value !== null ? ` Valor atual: ${value}.` : ''

  return Promise.resolve(`${explanation}${valueNote}`)
}
