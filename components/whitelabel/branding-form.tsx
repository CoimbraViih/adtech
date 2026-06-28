'use client'

import { useState } from 'react'
import type { WorkspaceBranding } from '@/types/database'
import { DomainVerifier } from '@/components/whitelabel/domain-verifier'

type Props = {
  workspaceId: string
  initialBranding: WorkspaceBranding | null
}

export function BrandingForm({ workspaceId, initialBranding }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialBranding?.logo_url ?? '')
  const [primaryColor, setPrimaryColor] = useState(initialBranding?.primary_color ?? '#E8390E')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/whitelabel/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        logoUrl: logoUrl.trim() || null,
        primaryColor,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const json = await res.json()
      setMessage({ type: 'error', text: json.error ?? 'Erro ao salvar' })
      return
    }

    setMessage({ type: 'success', text: 'Salvo com sucesso!' })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="space-y-5">
      {/* Logo */}
      <section className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4">
        <h2 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-3">Logo</h2>
        <label className="block text-xs text-[color:var(--adflow-fg-muted)] mb-1">
          URL da logo (PNG, SVG ou WebP recomendado)
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://seusite.com/logo.png"
          className="w-full bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder-[color:var(--adflow-fg-muted)] focus:outline-none focus:border-[color:var(--adflow-accent)]"
        />
        {logoUrl.trim() && (
          <div className="mt-3 p-3 bg-[color:var(--adflow-base)] rounded border border-[color:var(--adflow-border)] inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Preview" className="h-8 object-contain" />
          </div>
        )}
      </section>

      {/* Color */}
      <section className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4">
        <h2 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-3">Cor principal</h2>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            pattern="^#[0-9A-Fa-f]{6}$"
            maxLength={7}
            className="w-28 bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-3 py-2 text-sm text-[color:var(--adflow-fg)] font-mono focus:outline-none focus:border-[color:var(--adflow-accent)]"
          />
          <div
            className="w-10 h-10 rounded border border-[color:var(--adflow-border)]"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="text-xs text-[color:var(--adflow-fg-muted)]">Preview da cor nos botões de ação</span>
        </div>
      </section>

      {/* Domain */}
      <DomainVerifier workspaceId={workspaceId} initialBranding={initialBranding} />

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-[color:var(--adflow-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === 'success'
                ? 'text-[color:var(--adflow-success)]'
                : 'text-[color:var(--adflow-danger)]'
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
