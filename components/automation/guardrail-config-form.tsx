'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import type { OptimizationGuardrail } from '@/types/database'

type Props = {
  initialGuardrail: Omit<OptimizationGuardrail, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
}

export function GuardrailConfigForm({ initialGuardrail }: Props) {
  const [config, setConfig] = useState(initialGuardrail)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/ai/optimize/guardrails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-[color:var(--color-border)] rounded-lg p-4 space-y-4">
      <h2 className="text-base font-semibold text-[color:var(--adflow-fg)]">
        Guardrails de Segurança
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-[color:var(--adflow-fg)] font-medium">Kill Switch</p>
            <p className="text-xs text-[color:var(--color-muted)]">
              Para todas as execuções autônomas imediatamente
            </p>
          </div>
          <Switch
            checked={config.kill_switch}
            onCheckedChange={(v) => setConfig((c) => ({ ...c, kill_switch: v }))}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-[color:var(--adflow-fg)] font-medium">Modo Autônomo</p>
            <p className="text-xs text-[color:var(--color-muted)]">
              Executa ações aprovadas automaticamente (sem confirmação manual)
            </p>
          </div>
          <Switch
            checked={config.autonomous_mode}
            onCheckedChange={(v) => setConfig((c) => ({ ...c, autonomous_mode: v }))}
          />
        </div>

        <div className="py-2">
          <label className="text-sm text-[color:var(--adflow-fg)] font-medium block mb-1">
            Variação máxima de budget (%)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={config.max_budget_change_pct}
            onChange={(e) =>
              setConfig((c) => ({ ...c, max_budget_change_pct: Number(e.target.value) }))
            }
            className="w-24 px-3 py-1.5 text-sm bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded text-[color:var(--adflow-fg)]"
          />
        </div>

        <div className="py-2">
          <label className="text-sm text-[color:var(--adflow-fg)] font-medium block mb-1">
            Máximo de ações por dia
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={config.max_daily_actions}
            onChange={(e) =>
              setConfig((c) => ({ ...c, max_daily_actions: Number(e.target.value) }))
            }
            className="w-24 px-3 py-1.5 text-sm bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded text-[color:var(--adflow-fg)]"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="bg-[color:var(--color-accent)] text-white hover:opacity-90"
      >
        {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Guardrails'}
      </Button>
    </div>
  )
}
