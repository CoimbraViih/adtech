'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OptimizationAction, OptimizationActionType } from '@/types/database'

const ACTION_LABELS: Record<OptimizationActionType, string> = {
  pause: 'Pausar',
  resume: 'Ativar',
  budget_increase: 'Aumentar Budget',
  budget_decrease: 'Reduzir Budget',
}

const STATUS_COLORS: Record<string, string> = {
  suggested: 'bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)]',
  approved: 'bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]',
  rejected: 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]',
  executed: 'bg-[color:var(--color-data)]/10 text-[color:var(--color-data)]',
  failed: 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]',
  outcome_measured: 'bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]',
}

type Props = {
  initialActions: OptimizationAction[]
}

export function PredictiveActionsTable({ initialActions }: Props) {
  const [actions, setActions] = useState(initialActions)
  const [loading, setLoading] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  async function handleApprove(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/optimize/actions/${id}/approve`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        alert(body.error ?? 'Erro ao aprovar ação')
        return
      }
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'executed' as const } : a)),
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleReject(id: string) {
    setLoading(true)
    try {
      await fetch(`/api/ai/optimize/actions/${id}/reject`, { method: 'POST' })
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'rejected' as const } : a)),
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleSuggest() {
    setSuggesting(true)
    try {
      await fetch('/api/ai/optimize/suggest', { method: 'POST' })
      const res = await fetch('/api/ai/optimize/actions')
      if (res.ok) {
        const body = await res.json() as { actions: OptimizationAction[] }
        setActions(body.actions)
      }
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[color:var(--adflow-fg)]">
          Ações Sugeridas pela IA
        </h2>
        <Button
          size="sm"
          onClick={handleSuggest}
          disabled={suggesting}
          className="bg-[color:var(--color-accent)] text-white hover:opacity-90"
        >
          {suggesting ? 'Analisando...' : 'Analisar Agora'}
        </Button>
      </div>

      {actions.length === 0 ? (
        <p className="text-sm text-[color:var(--color-muted)] py-8 text-center">
          Nenhuma ação sugerida. Clique em &quot;Analisar Agora&quot; para gerar sugestões.
        </p>
      ) : (
        <div className="border border-[color:var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-surface)]">
              <tr>
                <th className="text-left px-4 py-2 text-[color:var(--color-muted)] font-medium">Campanha</th>
                <th className="text-left px-4 py-2 text-[color:var(--color-muted)] font-medium">Ação</th>
                <th className="text-left px-4 py-2 text-[color:var(--color-muted)] font-medium">Motivo</th>
                <th className="text-left px-4 py-2 text-[color:var(--color-muted)] font-medium">Status</th>
                <th className="text-left px-4 py-2 text-[color:var(--color-muted)] font-medium">Budget</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr
                  key={action.id}
                  className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)]/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[color:var(--adflow-fg)]">
                    {action.campaign_external_id}
                    <span className="ml-1 text-[color:var(--color-muted)]">/{action.platform}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-[color:var(--color-data)]/10 text-[color:var(--color-data)] border-0">
                      {ACTION_LABELS[action.action_type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-[color:var(--color-muted)] text-xs line-clamp-2">
                      {action.rationale}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[action.status] ?? ''}`}
                    >
                      {action.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--adflow-fg)]">
                    {action.budget_before != null && (
                      <span>
                        R${action.budget_before} → R${action.budget_after ?? '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {action.status === 'suggested' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={loading}
                          onClick={() => handleApprove(action.id)}
                          className="h-7 bg-[color:var(--color-success)] text-white hover:opacity-90 text-xs"
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleReject(action.id)}
                          className="h-7 border-[color:var(--color-border)] text-xs"
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
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
