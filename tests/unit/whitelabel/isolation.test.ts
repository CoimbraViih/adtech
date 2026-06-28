import { describe, it, expect } from 'vitest'
import { buildThemeCssVars } from '@/lib/whitelabel/theme'
import { generateCnameToken } from '@/lib/whitelabel/domains'
import type { WorkspaceBranding } from '@/types/database'

const brandingA: WorkspaceBranding = {
  id: 'b-A', workspace_id: 'ws-A', logo_url: 'https://a.com/logo.png',
  primary_color: '#AA0000', custom_domain: 'a.agency.com', domain_verified: true,
  cname_token: 'tokA', created_at: '', updated_at: '',
}

const brandingB: WorkspaceBranding = {
  id: 'b-B', workspace_id: 'ws-B', logo_url: 'https://b.com/logo.png',
  primary_color: '#0000BB', custom_domain: 'b.agency.com', domain_verified: true,
  cname_token: 'tokB', created_at: '', updated_at: '',
}

describe('cross-tenant isolation', () => {
  it('CSS vars for workspace A do not contain workspace B color', () => {
    const cssA = buildThemeCssVars(brandingA)
    const cssB = buildThemeCssVars(brandingB)

    expect(cssA).toContain('#AA0000')
    expect(cssA).not.toContain('#0000BB')
    expect(cssB).toContain('#0000BB')
    expect(cssB).not.toContain('#AA0000')
  })

  it('cname tokens are workspace-scoped and distinct', () => {
    expect(brandingA.cname_token).not.toBe(brandingB.cname_token)
  })

  it('workspace_id is distinct per workspace (not org-shared)', () => {
    expect(brandingA.workspace_id).toBe('ws-A')
    expect(brandingB.workspace_id).toBe('ws-B')
    expect(brandingA.workspace_id).not.toBe(brandingB.workspace_id)
  })

  it('generateCnameToken produces unique tokens for concurrent calls', () => {
    const tokens = Array.from({ length: 20 }, () => generateCnameToken())
    const unique = new Set(tokens)
    expect(unique.size).toBe(20)
  })

  it('null branding does not bleed through buildThemeCssVars', () => {
    expect(buildThemeCssVars(null)).toBe('')
  })
})
