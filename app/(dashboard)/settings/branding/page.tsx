import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/supabase/server'
import { canAccessWhiteLabel } from '@/lib/stripe/plans'
import { getWorkspaceBranding } from '@/lib/whitelabel/theme'
import { BrandingForm } from '@/components/whitelabel/branding-form'

export const metadata = { title: 'Branding — AdFlow' }

export default async function BrandingPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  if (!canAccessWhiteLabel(session.organization.plan)) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)] mb-2">White-label Portal</h1>
        <p className="text-[color:var(--adflow-fg-muted)] mb-4 text-sm">
          Configure sua própria marca, domínio e cores para seus clientes.
          Disponível no plano <strong className="text-[color:var(--adflow-fg)]">Agency</strong>.
        </p>
        <a
          href="/settings/billing"
          className="inline-flex px-4 py-2 rounded bg-[color:var(--adflow-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Fazer upgrade para Agency
        </a>
      </div>
    )
  }

  const workspaceId = session.workspace.id
  const branding = await getWorkspaceBranding(workspaceId)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)] mb-1">White-label Portal</h1>
      <p className="text-[color:var(--adflow-fg-muted)] text-sm mb-6">
        Configure a identidade visual que seus clientes verão ao acessar o painel.
      </p>
      <BrandingForm workspaceId={workspaceId} initialBranding={branding} />
    </div>
  )
}
