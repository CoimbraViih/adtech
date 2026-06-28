import crypto from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export function generateCnameToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

export async function verifyCnameToken(domain: string, expectedToken: string): Promise<boolean> {
  const url = `https://dns.google/resolve?name=_adflow-verify.${encodeURIComponent(domain)}&type=TXT`

  try {
    const res = await fetch(url)
    if (!res.ok) return false

    const json = (await res.json()) as { Answer?: Array<{ data: string }> }
    const answers = json.Answer ?? []

    return answers.some((a) =>
      a.data.replace(/"/g, '').includes(`adflow-verify=${expectedToken}`)
    )
  } catch {
    return false
  }
}

export async function initDomainVerification(workspaceId: string, domain: string): Promise<string> {
  const token = generateCnameToken()
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('workspace_branding')
    .upsert(
      {
        workspace_id: workspaceId,
        custom_domain: domain,
        cname_token: token,
        domain_verified: false,
      },
      { onConflict: 'workspace_id' }
    )

  if (error) throw new Error(`Failed to init domain verification: ${error.message}`)
  return token
}

export async function completeDomainVerification(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: branding, error: fetchError } = await supabase
    .from('workspace_branding')
    .select('custom_domain, cname_token')
    .eq('workspace_id', workspaceId)
    .single()

  if (fetchError || !branding) {
    return { success: false, error: 'Configuração de branding não encontrada' }
  }

  if (!branding.custom_domain || !branding.cname_token) {
    return { success: false, error: 'Domínio ou token não configurado' }
  }

  const verified = await verifyCnameToken(
    branding.custom_domain as string,
    branding.cname_token as string
  )

  if (!verified) {
    return {
      success: false,
      error: 'Registro DNS não encontrado. Adicione o registro TXT e tente novamente.',
    }
  }

  const { error: updateError } = await supabase
    .from('workspace_branding')
    .update({ domain_verified: true })
    .eq('workspace_id', workspaceId)

  if (updateError) return { success: false, error: 'Falha ao marcar domínio como verificado' }
  return { success: true }
}
