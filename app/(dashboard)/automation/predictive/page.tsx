import { requireServerSession } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PredictiveActionsTable } from '@/components/automation/predictive-actions-table'
import { GuardrailConfigForm } from '@/components/automation/guardrail-config-form'
import type { OptimizationAction, OptimizationGuardrail } from '@/types/database'

async function getActions(baseUrl: string): Promise<OptimizationAction[]> {
  try {
    const res = await fetch(`${baseUrl}/api/ai/optimize/actions`, { cache: 'no-store' })
    if (!res.ok) return []
    const body = await res.json() as { actions: OptimizationAction[] }
    return body.actions
  } catch {
    return []
  }
}

async function getGuardrail(baseUrl: string): Promise<OptimizationGuardrail | null> {
  try {
    const res = await fetch(`${baseUrl}/api/ai/optimize/guardrails`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = await res.json() as { guardrail: OptimizationGuardrail }
    return body.guardrail
  } catch {
    return null
  }
}

export default async function PredictivePage() {
  let session
  try {
    session = await requireServerSession()
  } catch {
    redirect('/login')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const [actions, guardrail] = await Promise.all([
    getActions(baseUrl),
    getGuardrail(baseUrl),
  ])

  const defaultGuardrail: Omit<OptimizationGuardrail, 'id' | 'workspace_id' | 'created_at' | 'updated_at'> = {
    kill_switch: false,
    max_budget_change_pct: 20,
    max_daily_actions: 5,
    blacklisted_campaign_ids: [],
    autonomous_mode: false,
  }

  // Suppress unused variable warning — session is used for auth gate
  void session

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
          Otimização Preditiva
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-0.5">
          IA analisa pacing e ROAS das campanhas e sugere ações com aprovação humana
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PredictiveActionsTable initialActions={actions} />
        </div>
        <div>
          <GuardrailConfigForm
            initialGuardrail={guardrail ?? defaultGuardrail}
          />
        </div>
      </div>
    </div>
  )
}
