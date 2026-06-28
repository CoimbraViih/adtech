import { headers } from 'next/headers'
import { getWorkspaceBranding, buildThemeCssVars } from '@/lib/whitelabel/theme'

export async function WhitelabelTheme() {
  const headersList = await headers()
  const workspaceId = headersList.get('x-whitelabel-workspace-id')
  if (!workspaceId) return null

  const branding = await getWorkspaceBranding(workspaceId)
  const cssVars = buildThemeCssVars(branding)
  if (!cssVars) return null

  return (
    <style
      // Controlled CSS variable injection — value is validated as a hex color by DB CHECK constraint
      dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }}
    />
  )
}

export async function getWhitelabelLogoUrl(): Promise<string | null> {
  const headersList = await headers()
  const workspaceId = headersList.get('x-whitelabel-workspace-id')
  if (!workspaceId) return null

  const branding = await getWorkspaceBranding(workspaceId)
  return branding?.logo_url ?? null
}
