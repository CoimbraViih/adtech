'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import type { CreativeVariant } from '@/types/database'

type VariantWithRate = CreativeVariant & { conversionRate: number }

type Props = {
  templateId: string
}

export function VariantTable({ templateId }: Props) {
  const [variants, setVariants] = useState<VariantWithRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate variants state
  const [showGenForm, setShowGenForm] = useState(false)
  const [catalogId, setCatalogId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const fetchVariants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dco/templates/${templateId}/variants`)
      const json = (await res.json()) as { variants?: VariantWithRate[]; error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Falha ao carregar variants.')
        return
      }
      setVariants(json.variants ?? [])
    } catch {
      setError('Erro de rede.')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    void fetchVariants()
  }, [fetchVariants])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch(`/api/dco/templates/${templateId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogId }),
      })
      const json = (await res.json()) as { generated?: number; error?: string }
      if (!res.ok) {
        setGenError(json.error ?? 'Falha ao gerar variants.')
        return
      }
      setCatalogId('')
      setShowGenForm(false)
      await fetchVariants()
    } catch {
      setGenError('Erro de rede.')
    } finally {
      setGenerating(false)
    }
  }

  // Compute conversion gain metric
  function conversionGain(): string {
    if (variants.length < 2) return 'N/A'
    const rates = variants.map((v) => v.conversionRate)
    const allZero = rates.every((r) => r === 0)
    if (allZero) return 'N/A'
    const best = Math.max(...rates)
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length
    return `+${((best - mean) * 100).toFixed(2)}%`
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--adflow-base)',
    border: '1px solid var(--adflow-border)',
    color: 'var(--adflow-fg)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  return (
    <div className="space-y-4">
      {/* Header metric + Generate button */}
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-xs uppercase tracking-wider font-medium"
            style={{ color: 'var(--adflow-fg-muted)' }}
          >
            Conversion gain per cycle:
          </span>{' '}
          <span
            className="text-sm font-semibold tabular-nums"
            style={{
              color:
                conversionGain() === 'N/A'
                  ? 'var(--adflow-fg-muted)'
                  : 'var(--adflow-success)',
            }}
          >
            {conversionGain()}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowGenForm((v) => !v)}
        >
          Generate Variants
        </Button>
      </div>

      {/* Generate form */}
      {showGenForm && (
        <form
          onSubmit={handleGenerate}
          className="p-3 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--adflow-border)', background: 'var(--adflow-base)' }}
        >
          <div>
            <label
              className="block text-xs font-medium mb-1 uppercase tracking-wider"
              style={{ color: 'var(--adflow-fg-muted)' }}
            >
              Catalog ID
            </label>
            <input
              type="text"
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              placeholder="Enter catalog UUID"
              required
              style={inputStyle}
            />
          </div>
          {genError && (
            <p className="text-xs" style={{ color: 'var(--adflow-danger)' }}>
              {genError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={generating}>
              {generating ? 'Generating…' : 'Generate'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowGenForm(false)}
              disabled={generating}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--adflow-fg-muted)' }}>
          Loading variants…
        </p>
      ) : error ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--adflow-danger)' }}>
          {error}
        </p>
      ) : variants.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--adflow-fg-muted)' }}>
          No variants yet. Generate from a product catalog.
        </p>
      ) : (
        <div
          className="rounded-xl border overflow-x-auto"
          style={{ borderColor: 'var(--adflow-border)', background: 'var(--adflow-surface)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-xs uppercase tracking-wider"
                style={{
                  borderColor: 'var(--adflow-border)',
                  color: 'var(--adflow-fg-muted)',
                }}
              >
                <th className="text-left px-4 py-3 font-medium">Product ID</th>
                <th className="text-left px-4 py-3 font-medium">Headline</th>
                <th className="text-right px-4 py-3 font-medium">Impressions</th>
                <th className="text-right px-4 py-3 font-medium">Conversions</th>
                <th className="text-right px-4 py-3 font-medium">Conv. Rate</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, idx) => (
                <tr
                  key={v.id}
                  className="border-b last:border-0"
                  style={{
                    borderColor: 'var(--adflow-border)',
                    color: 'var(--adflow-fg)',
                    background: idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : undefined,
                  }}
                >
                  <td
                    className="px-4 py-3 font-mono text-xs max-w-[120px] truncate"
                    title={v.product_id ?? '—'}
                  >
                    {v.product_id ? v.product_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td
                    className="px-4 py-3 max-w-[200px] truncate"
                    title={v.resolved_body.headline ?? ''}
                  >
                    {v.resolved_body.headline ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {v.impressions.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {v.conversions.toLocaleString('pt-BR')}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums font-medium"
                    style={{
                      color:
                        v.conversionRate > 0
                          ? 'var(--adflow-success)'
                          : 'var(--adflow-fg-muted)',
                    }}
                  >
                    {(v.conversionRate * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: v.is_active
                          ? 'rgba(16,185,129,0.12)'
                          : 'rgba(239,68,68,0.12)',
                        color: v.is_active
                          ? 'var(--adflow-success)'
                          : 'var(--adflow-danger)',
                      }}
                    >
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
