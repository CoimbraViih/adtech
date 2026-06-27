'use client'

import { useState } from 'react'
import type { ExportDestination, ExportRun, ExportRunStatus } from '@/types/database'

type Props = {
  destination: ExportDestination
  runs: ExportRun[]
  onDelete: (id: string) => void
  onToggleActive: (id: string, is_active: boolean) => void
}

const TYPE_LABELS: Record<string, string> = {
  bigquery:     'BigQuery',
  snowflake:    'Snowflake',
  s3:           'S3',
  csv_download: 'CSV Download',
}

const STATUS_COLORS: Record<ExportRunStatus, { bg: string; text: string; label: string }> = {
  done:    { bg: 'var(--color-success)', text: 'var(--color-success)', label: 'Concluído' },
  failed:  { bg: 'var(--color-danger)',  text: 'var(--color-danger)',  label: 'Falhou' },
  running: { bg: 'var(--color-warning)', text: 'var(--color-warning)', label: 'Executando' },
  pending: { bg: 'var(--color-muted)',   text: 'var(--color-muted)',   label: 'Pendente' },
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function RunStatusBadge({ status }: { status: ExportRunStatus }) {
  const s = STATUS_COLORS[status]
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ background: `${s.bg}22`, color: s.text }}
    >
      {s.label}
    </span>
  )
}

export function ExportDestinationCard({ destination, runs, onDelete, onToggleActive }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const recentRuns = runs.slice(0, 3)

  async function handleToggle() {
    setToggling(true)
    try {
      onToggleActive(destination.id, !destination.is_active)
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      onDelete(destination.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{destination.name}</span>
            <span
              className="shrink-0 text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--color-border)',
                color: 'var(--color-muted)',
              }}
            >
              {TYPE_LABELS[destination.destination_type] ?? destination.destination_type}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {destination.schedule ? `Agendamento: ${destination.schedule}` : 'Sem agendamento'}
          </p>
        </div>

        {/* Active toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="shrink-0 text-xs px-2 py-0.5 rounded-full disabled:opacity-50 transition-colors"
          style={
            destination.is_active
              ? { background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' }
              : { background: 'var(--color-border)', color: 'var(--color-muted)' }
          }
        >
          {destination.is_active ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      {/* Run history */}
      {recentRuns.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Últimas execuções
          </p>
          {recentRuns.map((run) => (
            <div key={run.id} className="flex items-center gap-3 text-xs">
              <RunStatusBadge status={run.status} />
              <span style={{ color: 'var(--color-muted)' }}>
                {run.rows_exported !== null ? `${run.rows_exported} linhas` : '—'}
              </span>
              <span className="ml-auto font-mono" style={{ color: 'var(--color-muted)' }}>
                {formatDateTime(run.completed_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {recentRuns.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Nenhuma execução ainda.
        </p>
      )}

      {/* Delete section */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {!confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs px-2 py-1 rounded border hover:border-red-500 hover:text-red-400 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            Excluir
          </button>
        )}
        {confirmDelete && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
              Confirmar exclusão?
            </span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2 py-1 rounded bg-red-600 text-white disabled:opacity-50"
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
