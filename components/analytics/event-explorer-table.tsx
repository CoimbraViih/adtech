'use client'

import type { EventsPage } from '@/lib/events/query'

type Props = {
  data: EventsPage | null
  isLoading: boolean
  page: number
  onPageChange: (page: number) => void
  pageSize: number
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  pageview:    'var(--color-data)',
  purchase:    'var(--color-success)',
  lead:        'var(--color-warning)',
  add_to_cart: '#8B5CF6',
  checkout:    '#EC4899',
  custom:      'var(--color-muted)',
}

function EventTypeBadge({ type }: { type: string }) {
  const color = EVENT_TYPE_COLORS[type] ?? 'var(--color-muted)'
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium"
      style={{ background: `${color}22`, color }}
    >
      {type}
    </span>
  )
}

function ConsentBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; color: string }> = {
    granted: { label: 'granted', color: 'var(--color-success)' },
    denied:  { label: 'denied',  color: 'var(--color-danger)' },
  }
  const entry = map[state] ?? { label: state, color: 'var(--color-muted)' }
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-mono"
      style={{ background: `${entry.color}22`, color: entry.color }}
    >
      {entry.label}
    </span>
  )
}

function formatEventTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatValue(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const COLUMNS = ['Tipo', 'URL', 'Campanha', 'Valor', 'Consentimento', 'Horário']

export function EventExplorerTable({ data, isLoading, page, onPageChange, pageSize }: Props) {
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const isLastPage = data ? !data.has_more : true

  if (isLoading) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"
          aria-label="Carregando..."
        />
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Nenhum evento encontrado para os filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-md border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table className="w-full text-sm">
          <thead
            className="border-b"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left font-medium text-xs"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                key={row.id}
                className="border-b last:border-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <td className="px-4 py-2.5">
                  <EventTypeBadge type={row.event_type} />
                </td>
                <td
                  className="px-4 py-2.5 font-mono text-xs max-w-[200px] truncate"
                  title={row.url ?? undefined}
                  style={{ color: 'var(--color-muted)' }}
                >
                  {row.url ? (row.url.length > 40 ? row.url.slice(0, 40) + '…' : row.url) : '—'}
                </td>
                <td
                  className="px-4 py-2.5 font-mono text-xs"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {row.campaign_id ?? '—'}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-right">
                  {formatValue(row.value)}
                </td>
                <td className="px-4 py-2.5">
                  <ConsentBadge state={row.consent_state} />
                </td>
                <td
                  className="px-4 py-2.5 font-mono text-xs tabular-nums whitespace-nowrap"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {formatEventTime(row.event_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Página {page + 1} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            className="rounded border px-3 py-1 text-xs disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Anterior
          </button>
          <button
            disabled={isLastPage}
            onClick={() => onPageChange(page + 1)}
            className="rounded border px-3 py-1 text-xs disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  )
}
