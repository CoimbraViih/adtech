'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { EventExplorerFilters } from '@/components/analytics/event-explorer-filters'
import { EventExplorerTable } from '@/components/analytics/event-explorer-table'
import type { EventsPage } from '@/lib/events/query'

type Filters = {
  start_date: string
  end_date: string
  event_type: string
  campaign_id: string
}

const PAGE_SIZE = 50

export default function EventExplorerClient() {
  const [filters, setFilters] = useState<Filters | null>(null)
  const [page, setPage] = useState(0)
  const [data, setData] = useState<EventsPage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchEvents(nextFilters: Filters, nextPage: number) {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams({
      start_date:  nextFilters.start_date,
      end_date:    nextFilters.end_date,
      event_type:  nextFilters.event_type,
      campaign_id: nextFilters.campaign_id,
      limit:       String(PAGE_SIZE),
      offset:      String(nextPage * PAGE_SIZE),
    })
    try {
      const res = await fetch(`/api/analytics/events?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setError(body.error ?? 'Erro ao carregar eventos.')
        setData(null)
      } else {
        const json = await res.json() as EventsPage
        setData(json)
      }
    } catch {
      setError('Erro de rede ao carregar eventos.')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  function handleFiltersChange(nextFilters: Filters) {
    setFilters(nextFilters)
    setPage(0)
    void fetchEvents(nextFilters, 0)
  }

  function handlePageChange(nextPage: number) {
    if (!filters) return
    setPage(nextPage)
    void fetchEvents(filters, nextPage)
  }

  function buildExportUrl(): string {
    if (!filters) return '#'
    const params = new URLSearchParams({
      start_date:  filters.start_date,
      end_date:    filters.end_date,
      event_type:  filters.event_type,
      campaign_id: filters.campaign_id,
    })
    return `/api/export/events?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <EventExplorerFilters onFiltersChange={handleFiltersChange} isLoading={isLoading} />

      {data !== null && (
        <div className="flex justify-end">
          <a
            href={buildExportUrl()}
            download
            className="inline-flex items-center gap-2 rounded px-4 py-1.5 text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        </div>
      )}

      {error && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
        >
          {error}
        </div>
      )}

      <EventExplorerTable
        data={data}
        isLoading={isLoading}
        page={page}
        onPageChange={handlePageChange}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
