import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/whitelabel/theme', () => ({
  getWorkspaceBranding: vi.fn(),
  upsertWorkspaceBranding: vi.fn(),
}))

describe('GET /api/whitelabel/branding', () => {
  it('returns 400 when workspaceId query param is missing', async () => {
    const { GET } = await import('@/app/api/whitelabel/branding/route')
    const req = new Request('http://localhost/api/whitelabel/branding')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
