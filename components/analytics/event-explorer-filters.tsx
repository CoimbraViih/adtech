'use client'

import { useState } from 'react'

type Filters = {
  start_date: string
  end_date: string
  event_type: string
  campaign_id: string
}

type Props = {
  onFiltersChange: (filters: Filters) => void
  isLoading: boolean
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function thirtyDaysAgoStr(): string {
  return new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
}

export function EventExplorerFilters({ onFiltersChange, isLoading }: Props) {
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr)
  const [endDate, setEndDate]     = useState<string>(todayStr)
  const [eventType, setEventType] = useState<string>('')
  const [campaignId, setCampaignId] = useState<string>('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  function handleApply() {
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
    const diffDays = diffMs / 86400_000
    if (diffDays > 90) {
      setRangeError('O intervalo máximo é de 90 dias.')
      return
    }
    if (diffDays < 0) {
      setRangeError('A data de início deve ser anterior à data de fim.')
      return
    }
    setRangeError(null)
    onFiltersChange({ start_date: startDate, end_date: endDate, event_type: eventType, campaign_id: campaignId })
  }

  return (
    <div
      className="rounded-md border p-4 space-y-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Data início
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: 'var(--color-border)', color: 'inherit' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Data fim
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: 'var(--color-border)', color: 'inherit' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Tipo de evento
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: 'var(--color-border)', color: 'inherit', background: 'var(--color-surface)' }}
          >
            <option value="">Todos</option>
            <option value="pageview">pageview</option>
            <option value="purchase">purchase</option>
            <option value="lead">lead</option>
            <option value="add_to_cart">add_to_cart</option>
            <option value="checkout">checkout</option>
            <option value="custom">custom</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            ID da campanha
          </label>
          <input
            type="text"
            placeholder="ID da campanha (opcional)"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: 'var(--color-border)', color: 'inherit' }}
          />
        </div>

        <button
          onClick={handleApply}
          disabled={isLoading}
          className="rounded px-4 py-1.5 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {isLoading && (
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin"
              aria-hidden="true"
            />
          )}
          Aplicar
        </button>
      </div>

      {rangeError && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {rangeError}
        </p>
      )}
    </div>
  )
}
