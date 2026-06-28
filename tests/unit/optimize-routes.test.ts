import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  requireServerSession: vi.fn().mockResolvedValue({
    workspace: { id: 'ws1' },
    session: { user: { id: 'u1' } },
    user: { id: 'u1' },
    organization: { id: 'org1' },
  }),
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('@/lib/ai/predict/engine', () => ({
  runPredictiveEngine: vi.fn().mockResolvedValue([{ id: 'a1' }]),
}))
vi.mock('@/lib/ai/actions/executor', () => ({
  executeAction: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/ai/actions/guardrails', () => ({
  getGuardrails: vi.fn().mockResolvedValue({ kill_switch: false }),
}))

import { POST as suggestPOST } from '@/app/api/ai/optimize/suggest/route'

describe('POST /api/ai/optimize/suggest', () => {
  it('retorna lista de ações propostas', async () => {
    const req = new Request('http://localhost/api/ai/optimize/suggest', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await suggestPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.actions)).toBe(true)
  })
})
