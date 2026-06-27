import type { EventRow } from '../events/query'

const CSV_HEADERS = [
  'id', 'event_type', 'url', 'referrer',
  'campaign_id', 'value', 'currency', 'consent_state', 'event_time',
]

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function eventsToCSV(rows: EventRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')]
  for (const row of rows) {
    lines.push([
      escapeCell(row.id),
      escapeCell(row.event_type),
      escapeCell(row.url),
      escapeCell(row.referrer),
      escapeCell(row.campaign_id),
      escapeCell(row.value),
      escapeCell(row.currency),
      escapeCell(row.consent_state),
      escapeCell(row.event_time),
    ].join(','))
  }
  return lines.join('\n')
}
