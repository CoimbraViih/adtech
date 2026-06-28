import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { WorkspaceBranding, WorkspaceBrandingUpdate } from '@/types/database'

const ADFLOW_DEFAULT_ACCENT = '#E8390E'

export async function getWorkspaceBranding(workspaceId: string): Promise<WorkspaceBranding | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('workspace_branding')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return null
  return data as WorkspaceBranding
}

export async function upsertWorkspaceBranding(
  workspaceId: string,
  data: WorkspaceBrandingUpdate
): Promise<WorkspaceBranding> {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase
    .from('workspace_branding')
    .upsert({ workspace_id: workspaceId, ...data }, { onConflict: 'workspace_id' })
    .select()
    .single()

  if (error || !row) throw new Error('Failed to upsert workspace branding')
  return row as WorkspaceBranding
}

export function buildThemeCssVars(branding: WorkspaceBranding | null): string {
  if (!branding) return ''
  if (branding.primary_color === ADFLOW_DEFAULT_ACCENT) return ''
  return `--adflow-accent: ${branding.primary_color};`
}
