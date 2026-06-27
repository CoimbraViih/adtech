import type { EventRow } from '@/lib/events/query'

export type BigQueryConfig = {
  project_id: string
  dataset_id: string
  table_id: string
  credentials_json: string // service account JSON as string
}

export function isBigQueryConfig(config: Record<string, unknown>): config is BigQueryConfig {
  return (
    typeof config.project_id === 'string' &&
    typeof config.dataset_id === 'string' &&
    typeof config.table_id === 'string' &&
    typeof config.credentials_json === 'string'
  )
}

type ServiceAccount = {
  client_email: string
  private_key: string
}

/**
 * Creates a signed JWT for Google OAuth2 service-account flow.
 * Uses Web Crypto API (RS256) — no external libraries required.
 */
async function createServiceAccountJWT(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

  const signingInput = `${b64url(header)}.${b64url(payload)}`

  // Strip PEM headers/footers and decode the key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const keyBuffer = Buffer.from(pemBody, 'base64')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput),
  )

  const sigB64url = Buffer.from(signature)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${signingInput}.${sigB64url}`
}

/**
 * Exchanges a service-account JWT for a short-lived OAuth2 access token.
 */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createServiceAccountJWT(sa)

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`BigQuery auth failed: ${resp.status} ${body.slice(0, 200)}`)
  }

  const json = (await resp.json()) as { access_token: string }
  return json.access_token
}

export async function exportToBigQuery(
  config: BigQueryConfig,
  rows: EventRow[],
): Promise<{ rows_exported: number; output_path: string }> {
  if (rows.length === 0) {
    return { rows_exported: 0, output_path: '' }
  }

  const sa = JSON.parse(config.credentials_json) as ServiceAccount
  const token = await getAccessToken(sa)

  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(config.project_id)}/datasets/${encodeURIComponent(config.dataset_id)}/tables/${encodeURIComponent(config.table_id)}/insertAll`

  const body = {
    rows: rows.map((r) => ({ insertId: r.id, json: r })),
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`BigQuery export failed: ${resp.status} ${text.slice(0, 200)}`)
  }

  return {
    rows_exported: rows.length,
    output_path: `${config.project_id}.${config.dataset_id}.${config.table_id}`,
  }
}
