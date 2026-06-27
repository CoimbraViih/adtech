import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── shared session mock ────────────────────────────────────────────────────────

const mockSession = {
  user: { id: 'user-1', email: 'test@example.com', display_name: null, avatar_url: null },
  organization: { id: 'org-1', name: 'Test Org', plan: 'pro', stripe_customer_id: null, created_at: '', updated_at: '' },
  workspace: { id: 'ws-1', organization_id: 'org-1', name: 'Default', description: null, created_at: '', updated_at: '' },
  role: 'owner' as const,
}

vi.mock('@/lib/supabase/server', () => ({
  requireServerSession: vi.fn().mockResolvedValue(mockSession),
}))

// ── Supabase service mock ──────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ── POST /api/dco/templates — 201 on valid body ───────────────────────────────

describe('POST /api/dco/templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 201 and created template on valid body', async () => {
    const created = {
      id: 'tpl-1',
      organization_id: 'org-1',
      workspace_id: 'ws-1',
      name: 'My Template',
      format: 'copy',
      template_body: { headline: '{{title}} - {{price}}' },
      placeholders: ['title', 'price'],
      is_active: true,
      created_at: '',
      updated_at: '',
    }

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    })

    const { POST } = await import('@/app/api/dco/templates/route')
    const req = makeRequest('POST', 'http://localhost/api/dco/templates', {
      name: 'My Template',
      format: 'copy',
      template_body: { headline: '{{title}} - {{price}}' },
    })
    const res = await POST(req)
    const json = (await res.json()) as { template: { id: string; organization_id: string } }

    expect(res.status).toBe(201)
    expect(json.template.id).toBe('tpl-1')
    expect(json.template.organization_id).toBe('org-1')
  })

  it('returns 401 when requireServerSession throws', async () => {
    const { requireServerSession } = await import('@/lib/supabase/server')
    vi.mocked(requireServerSession).mockRejectedValueOnce(new Error('UNAUTHENTICATED'))

    const { POST } = await import('@/app/api/dco/templates/route')
    const req = makeRequest('POST', 'http://localhost/api/dco/templates', {
      name: 'X',
      format: 'copy',
      template_body: {},
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = (await res.json()) as { error: string }
    expect(json.error).toMatch(/autorizado/i)
  })

  it('returns 422 when name is missing', async () => {
    const { POST } = await import('@/app/api/dco/templates/route')
    const req = makeRequest('POST', 'http://localhost/api/dco/templates', {
      format: 'copy',
      template_body: { headline: 'Hello' },
    })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const json = (await res.json()) as { error: string }
    expect(json.error).toMatch(/name/i)
  })

  it('returns 422 when format is invalid', async () => {
    const { POST } = await import('@/app/api/dco/templates/route')
    const req = makeRequest('POST', 'http://localhost/api/dco/templates', {
      name: 'Test',
      format: 'invalid_format',
      template_body: { headline: 'Hello' },
    })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const json = (await res.json()) as { error: string }
    expect(json.error).toMatch(/format/i)
  })
})

// ── GET /api/dco/templates — 200 with array ───────────────────────────────────

describe('GET /api/dco/templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with array of templates', async () => {
    const templates = [
      {
        id: 'tpl-1',
        organization_id: 'org-1',
        workspace_id: 'ws-1',
        name: 'Template A',
        format: 'copy',
        template_body: {},
        placeholders: [],
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'tpl-2',
        organization_id: 'org-1',
        workspace_id: 'ws-1',
        name: 'Template B',
        format: 'banner',
        template_body: {},
        placeholders: [],
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: templates, error: null }),
          }),
        }),
      }),
    })

    const { GET } = await import('@/app/api/dco/templates/route')
    const res = await GET(makeRequest('GET', 'http://localhost/api/dco/templates'))
    const json = (await res.json()) as { templates: unknown[] }

    expect(res.status).toBe(200)
    expect(Array.isArray(json.templates)).toBe(true)
    expect(json.templates).toHaveLength(2)
  })
})

// ── GET /api/dco/templates/[id] — 404 when not found ─────────────────────────

describe('GET /api/dco/templates/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when template is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const { GET } = await import('@/app/api/dco/templates/[id]/route')
    const req = makeRequest('GET', 'http://localhost/api/dco/templates/nonexistent')
    const params = Promise.resolve({ id: 'nonexistent' })

    const res = await GET(req, { params })
    expect(res.status).toBe(404)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBeTruthy()
  })
})

// ── POST /api/dco/rotate — 404 when no active variants ───────────────────────

describe('POST /api/dco/rotate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when no active variants exist for the template', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })

    const { POST } = await import('@/app/api/dco/rotate/route')
    const req = makeRequest('POST', 'http://localhost/api/dco/rotate', {
      templateId: 'tpl-no-variants',
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBeTruthy()
  })

  it('returns 401 when not authenticated', async () => {
    const { requireServerSession } = await import('@/lib/supabase/server')
    vi.mocked(requireServerSession).mockRejectedValueOnce(new Error('UNAUTHENTICATED'))

    const { POST } = await import('@/app/api/dco/rotate/route')
    const req = makeRequest('POST', 'http://localhost/api/dco/rotate', {
      templateId: 'tpl-1',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = (await res.json()) as { error: string }
    expect(json.error).toMatch(/autorizado/i)
  })
})
