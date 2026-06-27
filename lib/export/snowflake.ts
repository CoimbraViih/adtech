import type { EventRow } from '@/lib/events/query'

export type SnowflakeConfig = {
  account: string    // e.g. "xy12345.us-east-1"
  username: string
  password: string
  warehouse: string
  database: string
  schema: string
  table: string
}

export function isSnowflakeConfig(config: Record<string, unknown>): config is SnowflakeConfig {
  return (
    typeof config.account === 'string' &&
    typeof config.username === 'string' &&
    typeof config.password === 'string' &&
    typeof config.warehouse === 'string' &&
    typeof config.database === 'string' &&
    typeof config.schema === 'string' &&
    typeof config.table === 'string'
  )
}

const BATCH_SIZE = 500

function escapeSnowflakeValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  // Escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`
}

function buildInsertSQL(config: SnowflakeConfig, batch: EventRow[]): string {
  const fqTable = `${config.database}.${config.schema}.${config.table}`
  const cols = '(id, event_type, url, referrer, campaign_id, value, currency, consent_state, event_time)'
  const values = batch
    .map(
      (r) =>
        `(${[
          escapeSnowflakeValue(r.id),
          escapeSnowflakeValue(r.event_type),
          escapeSnowflakeValue(r.url),
          escapeSnowflakeValue(r.referrer),
          escapeSnowflakeValue(r.campaign_id),
          escapeSnowflakeValue(r.value),
          escapeSnowflakeValue(r.currency),
          escapeSnowflakeValue(r.consent_state),
          escapeSnowflakeValue(r.event_time),
        ].join(', ')})`,
    )
    .join(',\n')

  return `INSERT INTO ${fqTable} ${cols} VALUES\n${values}`
}

export async function exportToSnowflake(
  config: SnowflakeConfig,
  rows: EventRow[],
): Promise<{ rows_exported: number; output_path: string }> {
  if (rows.length === 0) {
    return { rows_exported: 0, output_path: `${config.database}.${config.schema}.${config.table}` }
  }

  const endpoint = `https://${config.account}.snowflakecomputing.com/api/v2/statements`
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64')

  // Process in batches of up to BATCH_SIZE
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const sql = buildInsertSQL(config, batch)

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Snowflake-Authorization-Token-Type': 'BASIC',
      },
      body: JSON.stringify({
        statement: sql,
        warehouse: config.warehouse,
        database: config.database,
        schema: config.schema,
      }),
    })

    if (!resp.ok) {
      throw new Error(`Snowflake export failed: ${resp.status}`)
    }
  }

  return {
    rows_exported: rows.length,
    output_path: `${config.database}.${config.schema}.${config.table}`,
  }
}
