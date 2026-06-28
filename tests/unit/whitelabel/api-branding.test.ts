import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/whitelabel/theme', () => ({
  getWorkspaceBranding: vi.fn(),
  upsertWorkspaceBranding: vi.fn(),
}))

vi.mock('@/lib/whitelabel/domains', () => ({
  initDomainVerification: vi.fn(),
  completeDomainVerification: vi.fn(),
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

  it('returns 401 when user is not authenticated', async () => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('not authenticated') }),
      },
    } as never)

    const { GET } = await import('@/app/api/whitelabel/branding/route')
    const req = new Request('http://localhost/api/whitelabel/branding?workspaceId=ws-1')
    const res = await GET(req as never)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})

describe('PUT /api/whitelabel/branding', () => {
  it('returns 400 when workspaceId is missing in body', async () => {
    const { PUT } = await import('@/app/api/whitelabel/branding/route')
    const req = new Request('http://localhost/api/whitelabel/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl: 'https://example.com/logo.png' }),
    })
    const res = await PUT(req as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})

describe('POST /api/whitelabel/verify', () => {
  it('returns 400 when workspaceId is missing', async () => {
    const { POST } = await import('@/app/api/whitelabel/verify/route')
    const req = new Request('http://localhost/api/whitelabel/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', domain: 'example.com' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when action is missing', async () => {
    const { POST } = await import('@/app/api/whitelabel/verify/route')
    const req = new Request('http://localhost/api/whitelabel/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'ws-1', domain: 'example.com' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
