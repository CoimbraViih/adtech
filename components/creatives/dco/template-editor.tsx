'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { extractPlaceholders } from '@/lib/creatives/dco/templates'
import type { CreativeTemplate, CreativeTemplateFormat } from '@/types/database'

type Props = {
  template?: CreativeTemplate
  onSave: (template: CreativeTemplate) => void
  onCancel: () => void
}

const FORMATS: CreativeTemplateFormat[] = ['copy', 'banner', 'video']

const BODY_FIELDS = ['headline', 'description', 'imageUrl', 'cta', 'url'] as const
type BodyField = (typeof BODY_FIELDS)[number]

const FIELD_HINTS: Record<BodyField, string> = {
  headline: 'Use {{title}}, {{price}}, {{description}}',
  description: 'Use {{title}}, {{price}}, {{imageUrl}}, {{url}}, {{description}}',
  imageUrl: 'Use {{imageUrl}}',
  cta: 'Use {{title}}, {{price}}',
  url: 'Use {{url}}',
}

export function TemplateEditor({ template, onSave, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? '')
  const [format, setFormat] = useState<CreativeTemplateFormat>(template?.format ?? 'copy')
  const [body, setBody] = useState<Record<BodyField, string>>({
    headline: template?.template_body?.headline ?? '',
    description: template?.template_body?.description ?? '',
    imageUrl: template?.template_body?.imageUrl ?? '',
    cta: template?.template_body?.cta ?? '',
    url: template?.template_body?.url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeholders = extractPlaceholders(body)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const url = template
        ? `/api/dco/templates/${template.id}`
        : '/api/dco/templates'
      const method = template ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          format,
          template_body: body,
        }),
      })

      const json = (await res.json()) as { template?: CreativeTemplate; error?: string }

      if (!res.ok) {
        setError(json.error ?? 'Erro ao salvar template.')
        return
      }

      if (json.template) {
        onSave(json.template)
      }
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--adflow-fg-muted)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label style={labelStyle}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer Sale Copy"
          required
          style={inputStyle}
        />
      </div>

      {/* Format */}
      <div>
        <label style={labelStyle}>Format</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as CreativeTemplateFormat)}
          style={inputStyle}
        >
          {FORMATS.map((f) => (
            <option key={f} value={f} style={{ background: 'var(--adflow-base)' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Template body fields */}
      <div className="space-y-4">
        <span style={labelStyle}>Template Body</span>
        {BODY_FIELDS.map((field) => (
          <div key={field}>
            <label style={{ ...labelStyle, textTransform: 'none', fontSize: '0.8rem' }}>
              {field}
            </label>
            <input
              type="text"
              value={body[field]}
              onChange={(e) =>
                setBody((prev) => ({ ...prev, [field]: e.target.value }))
              }
              placeholder={`{{${field}}}`}
              style={inputStyle}
            />
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--adflow-fg-muted)' }}
            >
              {FIELD_HINTS[field]}
            </p>
          </div>
        ))}
      </div>

      {/* Live placeholder preview */}
      {placeholders.length > 0 && (
        <div>
          <span style={labelStyle}>Detected Placeholders</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {placeholders.map((p) => (
              <span
                key={p}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono"
                style={{
                  background: 'color-mix(in srgb, var(--color-data) 12%, transparent)',
                  color: 'var(--adflow-data)',
                  border: '1px solid color-mix(in srgb, var(--color-data) 25%, transparent)',
                }}
              >
                {`{{${p}}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: 'var(--adflow-danger)' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Template'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
