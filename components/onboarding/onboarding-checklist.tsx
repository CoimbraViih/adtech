'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Step = {
  id: string
  label: string
  description: string
  href: string
  cta: string
}

const STEPS: Step[] = [
  {
    id: 'connect_integration',
    label: 'Conectar plataforma de anúncios',
    description: 'Vincule Meta, Google, TikTok ou LinkedIn para sincronizar campanhas.',
    href: '/settings/integrations',
    cta: 'Conectar agora',
  },
  {
    id: 'create_campaign',
    label: 'Criar primeira campanha',
    description: 'Crie uma campanha e defina orçamento, período e segmentação.',
    href: '/campaigns/new',
    cta: 'Criar campanha',
  },
  {
    id: 'install_pixel',
    label: 'Instalar o pixel AdFlow',
    description: 'Instale o script de rastreamento no seu site para capturar conversões.',
    href: '/pixel',
    cta: 'Ver instruções',
  },
  {
    id: 'create_creative',
    label: 'Gerar criativo com IA',
    description: 'Use a IA para gerar headlines, descrições e banners para seus anúncios.',
    href: '/creatives/new',
    cta: 'Gerar criativo',
  },
  {
    id: 'configure_automation',
    label: 'Configurar automação',
    description: 'Ative alertas e otimização preditiva para campanhas no piloto automático.',
    href: '/automation',
    cta: 'Configurar',
  },
]

type OnboardingStep = {
  step: string
  completed_at?: string | null
}

type OnboardingResponse = {
  steps?: OnboardingStep[]
}

type Props = {
  orgId: string
}

export function OnboardingChecklist({ orgId }: Props) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/assistant/onboarding')
      .then((r) => r.json())
      .then((data: OnboardingResponse) => {
        setCompletedSteps(new Set((data.steps ?? []).map((s) => s.step)))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  async function markComplete(stepId: string) {
    setCompletedSteps((prev) => new Set([...prev, stepId]))
    await fetch('/api/assistant/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: stepId, orgId }),
    })
  }

  if (!loaded || dismissed) return null

  const completedCount = STEPS.filter((s) => completedSteps.has(s.id)).length
  if (completedCount === STEPS.length) return null

  return (
    <div className="mb-6 rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-[color:var(--adflow-fg)]">
            Primeiros passos — {completedCount}/{STEPS.length} concluídos
          </h3>
          <div className="mt-1 h-1.5 w-48 rounded-full bg-[color:var(--adflow-border)]">
            <div
              className="h-1.5 rounded-full bg-[color:var(--adflow-accent)] transition-all"
              style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar checklist"
          className="text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = completedSteps.has(step.id)
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                done ? 'opacity-50' : 'hover:bg-[color:var(--adflow-border)]/50'
              )}
            >
              <button
                onClick={() => { if (!done) void markComplete(step.id) }}
                aria-label={done ? 'Concluído' : `Marcar "${step.label}" como concluído`}
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  done
                    ? 'border-[color:var(--adflow-success)] bg-[color:var(--adflow-success)]'
                    : 'border-[color:var(--adflow-border)] hover:border-[color:var(--adflow-accent)]'
                )}
              >
                {done && <Check className="w-3 h-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    done
                      ? 'line-through text-[color:var(--adflow-fg-muted)]'
                      : 'text-[color:var(--adflow-fg)]'
                  )}
                >
                  {step.label}
                </p>
                {!done && (
                  <p className="text-xs text-[color:var(--adflow-fg-muted)] truncate">
                    {step.description}
                  </p>
                )}
              </div>

              {!done && (
                <Link
                  href={step.href}
                  className="flex items-center gap-1 text-xs text-[color:var(--adflow-accent)] hover:underline shrink-0"
                >
                  {step.cta}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
