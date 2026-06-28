import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getWorkspaceBranding, upsertWorkspaceBranding } from '@/lib/whitelabel/theme'
import { canAccessWhiteLabel } from '@/lib/stripe/plans'
import type { OrgPlan } from '@/types/database'
import type { WorkspaceBrandingUpdate } from '@/types/database'

type WorkspaceMemberRow = {
  role: string
  workspaces: {
    organizations: {
      plan: OrgPlan
    }
  }
}

async function requireWhitelabelAccess(workspaceId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Unauthorized', status: 401 as const }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, workspaces(organizations(plan))')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Forbidden', status: 403 as const }

  const row = member as unknown as WorkspaceMemberRow

  if (!['owner', 'admin'].includes(row.role)) {
    return { error: 'Forbidden', status: 403 as const }
  }

  const plan = row.workspaces?.organizations?.plan

  if (!plan || !canAccessWhiteLabel(plan)) {
    return { error: 'White-label requer plano Agency', status: 403 as const }
  }

  return { member: row }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId é obrigatório' }, { status: 400 })
  }

  const access = await requireWhitelabelAccess(workspaceId)
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const branding = await getWorkspaceBranding(workspaceId)
  return NextResponse.json({ branding })
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    workspaceId: string
    logoUrl?: string | null
    primaryColor?: string
    customDomain?: string | null
  }

  const { workspaceId } = body
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId é obrigatório' }, { status: 400 })
  }

  const access = await requireWhitelabelAccess(workspaceId)
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const update: WorkspaceBrandingUpdate = {}
  if (body.logoUrl !== undefined) update.logo_url = body.logoUrl ?? null
  if (body.primaryColor !== undefined) update.primary_color = body.primaryColor
  if (body.customDomain !== undefined) {
    update.custom_domain = body.customDomain ?? null
    // Reset verification when domain changes
    update.domain_verified = false
    update.cname_token = null
  }

  try {
    const branding = await upsertWorkspaceBranding(workspaceId, update)
    return NextResponse.json({ branding })
  } catch {
    return NextResponse.json({ error: 'Falha ao atualizar branding' }, { status: 500 })
  }
}
