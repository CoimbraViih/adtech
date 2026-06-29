import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { executeTool, ASSISTANT_TOOLS } from '@/lib/ai/assistant/tools'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ScreenContext } from '@/lib/ai/assistant/types'

const ctx: ScreenContext = {
  page: '/campaigns',
  workspaceId: 'ws-1',
  organizationId: 'org-1',
}

describe('ASSISTANT_TOOLS', () => {
  it('exports at least 4 tools', () => {
    expect(ASSISTANT_TOOLS.length).toBeGreaterThanOrEqual(4)
  })

  it('all tools have a name and description', () => {
    for (const tool of ASSISTANT_TOOLS) {
      expect(tool.function.name).toBeTruthy()
      expect(tool.function.description).toBeTruthy()
    }
  })
})

describe('executeTool — getCampaignSummary', () => {
  beforeEach(() => {
    const metricsChain = {
      select: () => metricsChain,
      in: () => metricsChain,
      gte: () => Promise.resolve({ data: [], error: null }),
    }
    const campaignsChain = {
      select: () => campaignsChain,
      eq: () => campaignsChain,
      order: () => campaignsChain,
      limit: () => Promise.resolve({
        data: [
          { id: 'c1', name: 'Campanha Verão', status: 'active', platform: 'meta', daily_budget: 100 }
        ],
        error: null,
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: (table: string) => {
        if (table === 'campaign_metrics_daily') return metricsChain
        return campaignsChain
      },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)
  })

  it('returns JSON string with campaigns', async () => {
    const result = await executeTool('getCampaignSummary', {}, ctx)
    const parsed = JSON.parse(result)
    expect(parsed.campaigns).toHaveLength(1)
    expect(parsed.campaigns[0].name).toBe('Campanha Verão')
  })
})

describe('executeTool — explainMetric', () => {
  it('returns explanation for CTR', async () => {
    const result = await executeTool('explainMetric', { metric: 'CTR', value: 2.5 }, ctx)
    expect(result).toContain('CTR')
    expect(result).toContain('2.5')
  })

  it('throws on unknown tool', async () => {
    await expect(executeTool('unknownTool', {}, ctx)).rejects.toThrow()
  })
})
