import { describe, it, expect } from 'vitest'
import { buildThemeCssVars } from '@/lib/whitelabel/theme'
import type { WorkspaceBranding } from '@/types/database'

const base: WorkspaceBranding = {
  id: 'b-1',
  workspace_id: 'ws-1',
  logo_url: 'https://example.com/logo.png',
  primary_color: '#FF0000',
  custom_domain: 'ads.agency.com',
  domain_verified: true,
  cname_token: 'tok-abc',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('buildThemeCssVars', () => {
  it('returns --adflow-accent override when primary_color differs from default', () => {
    const css = buildThemeCssVars(base)
    expect(css).toBe('--adflow-accent: #FF0000;')
  })

  it('returns empty string when branding is null', () => {
    expect(buildThemeCssVars(null)).toBe('')
  })

  it('returns empty string when primary_color matches AdFlow default #E8390E', () => {
    const css = buildThemeCssVars({ ...base, primary_color: '#E8390E' })
    expect(css).toBe('')
  })

  it('is case-sensitive — #e8390e does not suppress the override', () => {
    const css = buildThemeCssVars({ ...base, primary_color: '#e8390e' })
    expect(css).toBe('--adflow-accent: #e8390e;')
  })
})
