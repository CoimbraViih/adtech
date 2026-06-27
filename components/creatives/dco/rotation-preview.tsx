'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CreativeVariant } from '@/types/database'

type Props = {
  templateId: string
}

type RotationResult = {
  variant: CreativeVariant
}

const PREVIEW_FIELDS = [
  { key: 'headline', label: 'Headline' },
  { key: 'description', label: 'Description' },
  { key: 'cta', label: 'CTA' },
  { key: 'url', label: 'URL' },
  { key: 'imageUrl', label: 'Image URL' },
] as const

export function RotationPreview({ templateId }: Props) {
  const [variant, setVariant] = useState<CreativeVariant | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePreview() {
    setLoading(true)
    setError(null)
    setVariant(null)
    try {
      const res = await fetch('/api/dco/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      const json = (await res.json()) as RotationResult & { error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Falha ao rotacionar variant.')
        return
      }
      setVariant(json.variant)
    } catch {
      setError('Erro de rede.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={handlePreview} disabled={loading} size="sm">
          {loading ? 'Selecting…' : 'Preview Rotation'}
        </Button>
        {variant && (
          <span
            className="text-xs"
            style={{ color: 'var(--adflow-fg-muted)' }}
          >
            Powered by epsilon-greedy bandit (ε=0.1)
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--adflow-danger)' }}>
          {error}
        </p>
      )}

      {variant && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            borderColor: 'var(--adflow-border)',
            background: 'var(--adflow-surface)',
          }}
        >
          <p
            className="text-xs uppercase tracking-wider font-medium"
            style={{ color: 'var(--adflow-fg-muted)' }}
          >
            Selected Variant
          </p>

          <div className="space-y-2">
            {PREVIEW_FIELDS.map(({ key, label }) => {
              const value = variant.resolved_body[key]
              if (!value) return null
              return (
                <div key={key} className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span
                    className="font-medium"
                    style={{ color: 'var(--adflow-fg-muted)' }}
                  >
                    {label}
                  </span>
                  <span
                    className="break-all"
                    style={{ color: 'var(--adflow-fg)' }}
                  >
                    {value}
                  </span>
                </div>
              )
            })}
          </div>

          <div
            className="pt-2 border-t text-xs"
            style={{
              borderColor: 'var(--adflow-border)',
              color: 'var(--adflow-fg-muted)',
            }}
          >
            Variant ID: <span className="font-mono">{variant.id}</span>
            {' · '}
            Impressions: {variant.impressions.toLocaleString('pt-BR')}
            {' · '}
            Conversions: {variant.conversions.toLocaleString('pt-BR')}
          </div>
        </div>
      )}
    </div>
  )
}
