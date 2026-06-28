'use client'

import { useState } from 'react'
import type { WorkspaceBranding } from '@/types/database'

type Props = {
  workspaceId: string
  initialBranding: WorkspaceBranding | null
}

type Step = 'idle' | 'pending' | 'verified'

export function DomainVerifier({ workspaceId, initialBranding }: Props) {
  const initialStep: Step = initialBranding?.domain_verified
    ? 'verified'
    : initialBranding?.cname_token
    ? 'pending'
    : 'idle'

  const [domain, setDomain] = useState(initialBranding?.custom_domain ?? '')
  const [token, setToken] = useState(initialBranding?.cname_token ?? '')
  const [step, setStep] = useState<Step>(initialStep)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInit() {
    if (!domain.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/whitelabel/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, action: 'init', domain: domain.trim() }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Erro ao iniciar verificação')
      return
    }

    const json = await res.json()
    setToken(json.token)
    setStep('pending')
  }

  async function handleComplete() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/whitelabel/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, action: 'complete' }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Verificação falhou')
      return
    }

    setStep('verified')
  }

  return (
    <section className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4">
      <h2 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-3">Domínio personalizado</h2>

      {step === 'verified' && (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-[color:var(--adflow-success)]">
            <span className="w-2 h-2 rounded-full bg-[color:var(--adflow-success)] inline-block" />
            {domain} — verificado
          </span>
          <button
            onClick={() => { setStep('idle'); setToken('') }}
            className="text-xs text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
          >
            Trocar domínio
          </button>
        </div>
      )}

      {step === 'pending' && (
        <div className="space-y-3">
          <p className="text-xs text-[color:var(--adflow-fg-muted)]">
            Adicione o registro TXT abaixo no DNS do domínio <strong className="text-[color:var(--adflow-fg)]">{domain}</strong> e clique em Verificar.
          </p>
          <div className="bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded p-3 font-mono text-xs space-y-2">
            <div>
              <span className="text-[color:var(--adflow-fg-muted)]">Tipo: </span>
              <span className="text-[color:var(--adflow-fg)]">TXT</span>
            </div>
            <div>
              <span className="text-[color:var(--adflow-fg-muted)]">Nome: </span>
              <span className="text-[color:var(--adflow-fg)]">_adflow-verify.{domain}</span>
            </div>
            <div>
              <span className="text-[color:var(--adflow-fg-muted)]">Valor: </span>
              <span className="text-[color:var(--adflow-fg)]">adflow-verify={token}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleComplete}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-[color:var(--adflow-accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar DNS'}
            </button>
            <button
              onClick={() => setStep('idle')}
              className="text-xs text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>}
        </div>
      )}

      {step === 'idle' && (
        <div className="space-y-2">
          <label className="block text-xs text-[color:var(--adflow-fg-muted)]">
            Domínio (ex: ads.suaagencia.com.br)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="ads.suaagencia.com.br"
              className="flex-1 bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder-[color:var(--adflow-fg-muted)] focus:outline-none focus:border-[color:var(--adflow-accent)]"
            />
            <button
              onClick={handleInit}
              disabled={loading || !domain.trim()}
              className="px-3 py-2 rounded bg-[color:var(--adflow-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '...' : 'Configurar'}
            </button>
          </div>
          {error && <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>}
        </div>
      )}
    </section>
  )
}
