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

// ── GET /api/export/schedules ─────────────────────────────────────────────────

describe('GET /api/export/schedules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns destinations filtered by workspace_id', async () => {
    const destinations = [
      { id: 'dest-1', workspace_id: 'ws-1', name: 'S3 Export', destination_type: 's3', config: {}, schedule: null, is_active: true, organization_id: 'org-1', created_at: '', updated_at: '' },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: destinations, error: null }),
        }),
      }),
    })

    const { GET } = await import('@/app/api/export/schedules/route')
    const res = await GET(makeRequest('GET', 'http://localhost/api/export/schedules'))
    const json = (await res.json()) as { destinations: unknown[] }

    expect(res.status).toBe(200)
    expect(json.destinations).toHaveLength(1)
    expect(json.destinations[0]).toMatchObject({ id: 'dest-1' })
  })
})

// ── POST /api/export/schedules ────────────────────────────────────────────────

describe('POST /api/export/schedules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates destination with org_id and ws_id from session, never from body', async () => {
    const created = {
      id: 'dest-new',
      organization_id: 'org-1',
      workspace_id: 'ws-1',
      name: 'My S3',
      destination_type: 's3',
      config: { bucket: 'b' },
      schedule: 'daily',
      is_active: true,
      created_at: '',
      updated_at: '',
    }

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: created, error: null }),
      }),
    })

    mockFrom.mockReturnValue({ insert: insertMock })

    const { POST } = await import('@/app/api/export/schedules/route')
    const req = makeRequest('POST', 'http://localhost/api/export/schedules', {
      name: 'My S3',
      destination_type: 's3',
      config: { bucket: 'b' },
      schedule: 'daily',
      // Attacker tries to inject a different org — must be ignored
      organization_id: 'evil-org',
      workspace_id: 'evil-ws',
    })

    const res = await POST(req)
    const json = (await res.json()) as { destination: { organization_id: string; workspace_id: string } }

    expect(res.status).toBe(201)
    // org and workspace must come from session, not request body
    expect(json.destination.organization_id).toBe('org-1')
    expect(json.destination.workspace_id).toBe('ws-1')

    // Verify insert was called with session ids
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-1', workspace_id: 'ws-1' }),
    )
  })

  it('rejects invalid destination_type with 400', async () => {
    const { POST } = await import('@/app/api/export/schedules/route')
    const req = makeRequest('POST', 'http://localhost/api/export/schedules', {
      name: 'Bad',
      destination_type: 'invalid_type',
      config: {},
    })

    const res = await POST(req)
    const json = (await res.json()) as { error: string }

    expect(res.status).toBe(400)
    expect(json.error).toBeTruthy()
  })
})

// ── PATCH /api/export/schedules/[id] ─────────────────────────────────────────

describe('PATCH /api/export/schedules/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('denies viewer role with 403', async () => {
    const { requireServerSession } = await import('@/lib/supabase/server')
    vi.mocked(requireServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: 'viewer',
    })

    const { PATCH } = await import('@/app/api/export/schedules/[id]/route')
    const req = makeRequest('PATCH', 'http://localhost/api/export/schedules/dest-1', {
      is_active: false,
    })
    const params = Promise.resolve({ id: 'dest-1' })

    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
  })
})

// ── DELETE /api/export/schedules/[id] — IDOR guard ───────────────────────────

describe('DELETE /api/export/schedules/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when destination belongs to a different org (IDOR guard)', async () => {
    // maybeSingle returns null — destination not found for this org
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const { DELETE } = await import('@/app/api/export/schedules/[id]/route')
    const req = makeRequest('DELETE', 'http://localhost/api/export/schedules/evil-dest')
    const params = Promise.resolve({ id: 'evil-dest' })

    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
  })
})
