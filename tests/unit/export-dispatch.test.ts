import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExportDestination } from '@/types/database'
import type { EventRow } from '@/lib/events/query'

// Mock the connectors
vi.mock('@/lib/export/bigquery', () => ({
  isBigQueryConfig: (c: Record<string, unknown>) =>
    typeof c.project_id === 'string' &&
    typeof c.dataset_id === 'string' &&
    typeof c.table_id === 'string' &&
    typeof c.credentials_json === 'string',
  exportToBigQuery: vi.fn().mockResolvedValue({ rows_exported: 2, output_path: 'proj.ds.tbl' }),
}))

vi.mock('@/lib/export/snowflake', () => ({
  isSnowflakeConfig: (c: Record<string, unknown>) =>
    typeof c.account === 'string' &&
    typeof c.username === 'string' &&
    typeof c.password === 'string' &&
    typeof c.warehouse === 'string' &&
    typeof c.database === 'string' &&
    typeof c.schema === 'string' &&
    typeof c.table === 'string',
  exportToSnowflake: vi.fn().mockResolvedValue({ rows_exported: 2, output_path: 'DB.SCHEMA.TABLE' }),
}))

vi.mock('@/lib/export/s3', () => ({
  isS3Config: (c: Record<string, unknown>) =>
    typeof c.bucket === 'string' &&
    typeof c.region === 'string' &&
    typeof c.prefix === 'string' &&
    typeof c.access_key_id === 'string' &&
    typeof c.secret_access_key === 'string',
  exportToS3: vi.fn().mockResolvedValue({ rows_exported: 2, output_path: 's3://bucket/prefix/file.csv' }),
}))

const makeDestination = (
  type: ExportDestination['destination_type'],
  config: Record<string, unknown>,
): ExportDestination => ({
  id: 'dest-1',
  organization_id: 'org-1',
  workspace_id: 'ws-1',
  name: 'Test',
  destination_type: type,
  config,
  schedule: 'daily',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

const sampleRows: EventRow[] = [
  {
    id: 'evt-1',
    event_type: 'pageview',
    url: 'https://example.com',
    referrer: null,
    campaign_id: null,
    value: null,
    currency: null,
    consent_state: 'granted',
    event_time: '2026-06-27T00:00:00Z',
  },
  {
    id: 'evt-2',
    event_type: 'conversion',
    url: 'https://example.com/thanks',
    referrer: 'https://google.com',
    campaign_id: 'camp-1',
    value: 99.9,
    currency: 'BRL',
    consent_state: 'granted',
    event_time: '2026-06-27T01:00:00Z',
  },
]

describe('runExport (dispatch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes to BigQuery connector for destination_type bigquery', async () => {
    const { runExport } = await import('@/lib/export/dispatch')
    const { exportToBigQuery } = await import('@/lib/export/bigquery')

    const dest = makeDestination('bigquery', {
      project_id: 'my-project',
      dataset_id: 'my_dataset',
      table_id: 'events',
      credentials_json: '{}',
    })

    const result = await runExport(dest, sampleRows, 'events-2026-06-27.csv')

    expect(exportToBigQuery).toHaveBeenCalledOnce()
    expect(result.rows_exported).toBe(2)
    expect(result.output_path).toBe('proj.ds.tbl')
  })

  it('routes to Snowflake connector for destination_type snowflake', async () => {
    const { runExport } = await import('@/lib/export/dispatch')
    const { exportToSnowflake } = await import('@/lib/export/snowflake')

    const dest = makeDestination('snowflake', {
      account: 'xy12345.us-east-1',
      username: 'admin',
      password: 'secret',
      warehouse: 'COMPUTE_WH',
      database: 'ADFLOW_DB',
      schema: 'PUBLIC',
      table: 'EVENTS',
    })

    const result = await runExport(dest, sampleRows, 'events-2026-06-27.csv')

    expect(exportToSnowflake).toHaveBeenCalledOnce()
    expect(result.rows_exported).toBe(2)
  })

  it('routes to S3 connector for destination_type s3', async () => {
    const { runExport } = await import('@/lib/export/dispatch')
    const { exportToS3 } = await import('@/lib/export/s3')

    const dest = makeDestination('s3', {
      bucket: 'my-bucket',
      region: 'us-east-1',
      prefix: 'adflow-exports/',
      access_key_id: 'AKID',
      secret_access_key: 'secret',
    })

    const result = await runExport(dest, sampleRows, 'events-2026-06-27.csv')

    expect(exportToS3).toHaveBeenCalledOnce()
    expect(result.rows_exported).toBe(2)
  })

  it('throws for csv_download destination_type', async () => {
    const { runExport } = await import('@/lib/export/dispatch')

    const dest = makeDestination('csv_download', {})

    await expect(runExport(dest, sampleRows, 'events.csv')).rejects.toThrow(
      'csv_download destinations do not support scheduled export',
    )
  })

  it('throws when BigQuery config is invalid', async () => {
    const { runExport } = await import('@/lib/export/dispatch')

    const dest = makeDestination('bigquery', {
      project_id: 'my-project',
      // missing dataset_id, table_id, credentials_json
    })

    await expect(runExport(dest, sampleRows, 'events.csv')).rejects.toThrow(
      'Invalid config for destination bigquery',
    )
  })

  it('isBigQueryConfig validates correctly', async () => {
    const { isBigQueryConfig } = await import('@/lib/export/bigquery')

    expect(isBigQueryConfig({
      project_id: 'p',
      dataset_id: 'd',
      table_id: 't',
      credentials_json: '{}',
    })).toBe(true)

    expect(isBigQueryConfig({ project_id: 'p' })).toBe(false)
    expect(isBigQueryConfig({})).toBe(false)
    expect(isBigQueryConfig({
      project_id: 123,
      dataset_id: 'd',
      table_id: 't',
      credentials_json: '{}',
    })).toBe(false)
  })
})
