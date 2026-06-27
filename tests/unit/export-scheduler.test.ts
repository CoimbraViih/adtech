import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExportDestination } from '@/types/database'

// Mock Supabase service client
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockEqChained = vi.fn()

const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock getEventsByWorkspace
vi.mock('@/lib/events/query', () => ({
  getEventsByWorkspace: vi.fn().mockResolvedValue({
    rows: [
      {
        id: 'evt-1',
        event_type: 'pageview',
        url: null,
        referrer: null,
        campaign_id: null,
        value: null,
        currency: null,
        consent_state: 'granted',
        event_time: '2026-06-27T00:00:00Z',
      },
    ],
    total: 1,
    has_more: false,
  }),
}))

// Mock runExport
vi.mock('@/lib/export/dispatch', () => ({
  runExport: vi.fn().mockResolvedValue({ rows_exported: 1, output_path: 's3://bucket/file.csv' }),
}))

const makeDestination = (overrides: Partial<ExportDestination> = {}): ExportDestination => ({
  id: 'dest-1',
  organization_id: 'org-1',
  workspace_id: 'ws-1',
  name: 'Test S3 Export',
  destination_type: 's3',
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    prefix: 'exports/',
    access_key_id: 'AKID',
    secret_access_key: 'secret',
  },
  schedule: 'daily',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('runScheduledExports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes all active scheduled destinations and returns counts', async () => {
    const destinations: ExportDestination[] = [makeDestination(), makeDestination({ id: 'dest-2' })]

    // Setup mock chain for export_destinations select
    const selectMock = vi.fn().mockReturnValue({
      not: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: destinations, error: null }),
      }),
    })

    // Setup mock chain for export_runs insert
    const insertRunMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'run-1' }, error: null }),
      }),
    })

    // Setup mock chain for export_runs update
    const updateRunMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'export_destinations') return { select: selectMock }
      if (table === 'export_runs') return { insert: insertRunMock, update: updateRunMock }
      return {}
    })

    const { runScheduledExports } = await import('@/lib/export/scheduler')
    const result = await runScheduledExports()

    expect(result.processed).toBe(2)
    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(0)
  })

  it('marks run as done on success with rows_exported and output_path', async () => {
    const destinations = [makeDestination()]

    const selectMock = vi.fn().mockReturnValue({
      not: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: destinations, error: null }),
      }),
    })

    const insertRunMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'run-99' }, error: null }),
      }),
    })

    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateRunMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'export_destinations') return { select: selectMock }
      if (table === 'export_runs') return { insert: insertRunMock, update: updateRunMock }
      return {}
    })

    const { runScheduledExports } = await import('@/lib/export/scheduler')
    await runScheduledExports()

    // Verify update was called with done status
    expect(updateRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done', rows_exported: 1, output_path: 's3://bucket/file.csv' }),
    )
  })

  it('marks run as failed on error and does not propagate exception', async () => {
    const { runExport } = await import('@/lib/export/dispatch')
    vi.mocked(runExport).mockRejectedValueOnce(new Error('S3 upload failed'))

    const destinations = [makeDestination()]

    const selectMock = vi.fn().mockReturnValue({
      not: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: destinations, error: null }),
      }),
    })

    const insertRunMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'run-fail' }, error: null }),
      }),
    })

    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateRunMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'export_destinations') return { select: selectMock }
      if (table === 'export_runs') return { insert: insertRunMock, update: updateRunMock }
      return {}
    })

    const { runScheduledExports } = await import('@/lib/export/scheduler')

    // Should NOT throw
    const result = await runScheduledExports()

    expect(result.processed).toBe(1)
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(1)

    // Verify update called with failed status
    expect(updateRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'S3 upload failed' }),
    )
  })
})
