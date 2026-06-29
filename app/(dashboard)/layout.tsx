import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { WhitelabelTheme, getWhitelabelLogoUrl } from '@/components/whitelabel/whitelabel-theme'
import { AssistantProvider } from '@/components/assistant/assistant-context'
import { AssistantPanel } from '@/components/assistant/assistant-panel'
import { AssistantTrigger } from '@/components/assistant/assistant-trigger'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getOrgAndWorkspace(): Promise<{ orgId: string; workspaceId: string } | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) return null

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('organization_id', member.organization_id)
    .limit(1)
    .single()

  return { orgId: member.organization_id, workspaceId: workspace?.id ?? '' }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [whitelabelLogoUrl, orgCtx] = await Promise.all([
    getWhitelabelLogoUrl(),
    getOrgAndWorkspace(),
  ])

  const orgId = orgCtx?.orgId ?? ''
  const workspaceId = orgCtx?.workspaceId ?? ''

  return (
    <AssistantProvider orgId={orgId} workspaceId={workspaceId}>
      <div className="flex h-screen overflow-hidden bg-[color:var(--adflow-base)]">
        <WhitelabelTheme />
        {/* Desktop sidebar — hidden on mobile */}
        <Sidebar logoUrl={whitelabelLogoUrl} />

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <AssistantPanel />
      <AssistantTrigger />
    </AssistantProvider>
  )
}
