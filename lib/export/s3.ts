import type { EventRow } from '@/lib/events/query'
import { eventsToCSV } from './csv'

export type S3Config = {
  bucket: string
  region: string
  prefix: string          // e.g. "adflow-exports/"
  access_key_id: string
  secret_access_key: string
}

export function isS3Config(config: Record<string, unknown>): config is S3Config {
  return (
    typeof config.bucket === 'string' &&
    typeof config.region === 'string' &&
    typeof config.prefix === 'string' &&
    typeof config.access_key_id === 'string' &&
    typeof config.secret_access_key === 'string'
  )
}

// ─── AWS Signature V4 helpers ────────────────────────────────────────────────

async function hmacSHA256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
}

function formatDatetime(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\..+/, '') + 'Z' // YYYYMMDDTHHmmssZ
}

/**
 * Minimal AWS Signature V4 signer for S3 PUT object requests.
 * Returns signed headers to attach to the fetch call.
 */
async function signS3Request(
  config: S3Config,
  method: string,
  url: URL,
  body: string,
): Promise<Record<string, string>> {
  const now = new Date()
  const datestamp = formatDate(now)
  const amzDatetime = formatDatetime(now)

  const payloadHash = await sha256Hex(body)

  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-date': amzDatetime,
    'x-amz-content-sha256': payloadHash,
    'content-type': 'text/csv',
  }

  // Canonical headers — must be sorted
  const sortedHeaderKeys = Object.keys(headers).sort()
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join('')
  const signedHeaders = sortedHeaderKeys.join(';')

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.slice(1), // query string without leading '?'
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const region = config.region
  const service = 's3'
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`
  const canonicalRequestHash = await sha256Hex(canonicalRequest)

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDatetime,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  // Derive signing key
  const kDate = await hmacSHA256(
    new TextEncoder().encode(`AWS4${config.secret_access_key}`).buffer as ArrayBuffer,
    datestamp,
  )
  const kRegion = await hmacSHA256(kDate, region)
  const kService = await hmacSHA256(kRegion, service)
  const kSigning = await hmacSHA256(kService, 'aws4_request')

  const signature = toHex(await hmacSHA256(kSigning, stringToSign))

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.access_key_id}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ')

  return {
    ...headers,
    Authorization: authorization,
  }
}

// ─── Public export function ──────────────────────────────────────────────────

export async function exportToS3(
  config: S3Config,
  rows: EventRow[],
  filename: string,
): Promise<{ rows_exported: number; output_path: string }> {
  const csv = eventsToCSV(rows)
  const key = `${config.prefix}${filename}`
  const url = new URL(`https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`)

  const signedHeaders = await signS3Request(config, 'PUT', url, csv)

  const resp = await fetch(url.toString(), {
    method: 'PUT',
    headers: signedHeaders,
    body: csv,
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`S3 export failed: ${resp.status} ${text.slice(0, 200)}`)
  }

  return {
    rows_exported: rows.length,
    output_path: `s3://${config.bucket}/${key}`,
  }
}
