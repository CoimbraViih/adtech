import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExportDestination } from '@/types/database'

// ── Supabase service mock ──────────────────────────────────────────────────────

const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockSupabaseFrom }),
}))

// ── Events query mock ──────────────────────────────────────────────────────────

vi.mock('@/lib/events/query', () => ({
  getEventsByWorkspace: vi.fn().mockResolvedValue({
    rows: [{ id: 'evt-1', event_type: 'pageview', url: null, referrer: null, campaign_id: null, value: null, currency: null, consent_state: 'granted', event_time: '2026-06-27T00:00:00Z' }],
    total: 1,
    has_more: false,
  }),
}))

// ── runExport mock ─────────────────────────────────────────────────────────────

vi.mock('@/lib/export/dispatch', () => ({
  runExport: vi.fn().mockResolvedValue({ rows_exported: 5, output_path: 's3://bucket/file.csv' }),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

const makeDestination = (overrides: Partial<ExportDestination> = {}): ExportDestination => ({
  id: 'dest-1',
  organization_id: 'org-1',
  workspace_id: 'ws-1',
  name: 'Test S3 Export',
  destination_type: 's3',
  config: { bucket: 'my-bucket', region: 'us-east-1', prefix: 'exports/', access_key_id: 'AKID', secret_access_key: 'secret' },
  schedule: 'daily',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

function setupMocks(destinations: ExportDestination[]) {
  const insertRunMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'run-1' }, error: null }),
    }),
  })
  const updateRunMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'export_destinations') {
      return {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: destinations.filter(d => d.destination_type !== 'csv_download'),
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'export_runs') {
      return { insert: insertRunMock, update: updateRunMock }
    }
    return {}
  })

  return { insertRunMock, updateRunMock }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runScheduledExports — integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips csv_download destinations (they are on-demand only)', async () => {
    const destinations = [
      makeDestination({ id: 'dest-csv', destination_type: 'csv_download', schedule: 'daily' }),
      makeDestination({ id: 'dest-s3', destination_type: 's3', schedule: 'daily' }),
    ]

    // Expect only the s3 destination to be processed (csv_download is filtered out by scheduler)
    const { insertRunMock } = setupMocks(destinations)

    const { runExport } = await import('@/lib/export/dispatch')

    const { runScheduledExports } = await import('@/lib/export/scheduler')
    const result = await runScheduledExports()

    // Verify: scheduler filters csv_download, so only s3 is processed
    expect(result.processed).toBe(1)
    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(0)

    // Verify runExport was called exactly once (for s3 destination, not csv_download)
    const runExportCalls = vi.mocked(runExport).mock.calls
    expect(runExportCalls).toHaveLength(1)

    // Verify the call was made with the s3 destination (id: 'dest-s3')
    const s3DestArg = runExportCalls[0]?.[0] as ExportDestination | undefined
    expect(s3DestArg?.id).toBe('dest-s3')
    expect(s3DestArg?.destination_type).toBe('s3')
  })

  it('sets started_at on export_runs insert', async () => {
    const destinations = [makeDestination()]
    const { insertRunMock } = setupMocks(destinations)

    const { runScheduledExports } = await import('@/lib/export/scheduler')
    await runScheduledExports()

    // Verify insert was called with started_at set
    expect(insertRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'running',
        started_at: expect.any(String),
      }),
    )

    // Verify started_at is a valid ISO date string
    const insertCall = vi.mocked(insertRunMock).mock.calls[0]?.[0] as { started_at: string }
    expect(() => new Date(insertCall.started_at).toISOString()).not.toThrow()
  })

  it('returns correct counts with mixed success and failure destinations', async () => {
    const { runExport } = await import('@/lib/export/dispatch')

    const destinations = [
      makeDestination({ id: 'dest-ok', destination_type: 's3' }),
      makeDestination({ id: 'dest-fail', destination_type: 'snowflake' }),
      makeDestination({ id: 'dest-ok2', destination_type: 'bigquery' }),
    ]

    // First and third succeed, second fails
    vi.mocked(runExport)
      .mockResolvedValueOnce({ rows_exported: 10, output_path: 's3://bucket/ok.csv' })
      .mockRejectedValueOnce(new Error('Snowflake connection failed'))
      .mockResolvedValueOnce({ rows_exported: 20, output_path: 'bq://table' })

    const insertRunMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'run-x' }, error: null }),
      }),
    })
    const updateRunMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'export_destinations') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: destinations.filter(d => d.destination_type !== 'csv_download'),
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'export_runs') return { insert: insertRunMock, update: updateRunMock }
      return {}
    })

    const { runScheduledExports } = await import('@/lib/export/scheduler')
    const result = await runScheduledExports()

    expect(result.processed).toBe(3)
    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(1)
  })
})
