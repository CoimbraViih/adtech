'use client'

import { useState, useEffect } from 'react'
import type { ExportDestination, ExportRun } from '@/types/database'
import { ExportDestinationCard } from '@/components/settings/export-destination-card'
import { ExportDestinationForm } from '@/components/settings/export-destination-form'

type DestinationWithRuns = {
  destination: ExportDestination
  runs: ExportRun[]
}

export default function ExportsSettingsClient() {
  const [items, setItems] = useState<DestinationWithRuns[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    void loadDestinations()
  }, [])

  async function loadDestinations() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/export/schedules')
      const data = (await res.json()) as { destinations?: ExportDestination[]; error?: string }
      if (!res.ok || !data.destinations) {
        setError(data.error ?? 'Falha ao carregar destinos')
        return
      }

      // Fetch runs for each destination in parallel
      const withRuns = await Promise.all(
        data.destinations.map(async (dest): Promise<DestinationWithRuns> => {
          try {
            const runsRes = await fetch(`/api/export/runs?destination_id=${dest.id}`)
            const runsData = (await runsRes.json()) as { runs?: ExportRun[] }
            return { destination: dest, runs: runsData.runs ?? [] }
          } catch {
            return { destination: dest, runs: [] }
          }
        }),
      )

      setItems(withRuns)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(destination: ExportDestination) {
    setItems((prev) => [{ destination, runs: [] }, ...prev])
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/export/schedules/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setItems((prev) => prev.filter((item) => item.destination.id !== id))
      }
    } catch (err) {
      console.error('[ExportsSettingsClient] delete failed:', err)
    }
  }

  async function handleToggleActive(id: string, is_active: boolean) {
    try {
      const res = await fetch(`/api/export/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
      const data = (await res.json()) as { destination?: ExportDestination }
      if (res.ok && data.destination) {
        setItems((prev) =>
          prev.map((item) =>
            item.destination.id === id
              ? { ...item, destination: data.destination! }
              : item,
          ),
        )
      }
    } catch (err) {
      console.error('[ExportsSettingsClient] toggle failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-muted)' }}>
        <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        Carregando destinos…
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
        {error}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {items.length === 0 ? 'Nenhum destino configurado.' : `${items.length} destino${items.length !== 1 ? 's' : ''} configurado${items.length !== 1 ? 's' : ''}.`}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            + Adicionar destino
          </button>
        )}
      </div>

      {showForm && (
        <ExportDestinationForm
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <ExportDestinationCard
            key={item.destination.id}
            destination={item.destination}
            runs={item.runs}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>
    </div>
  )
}
