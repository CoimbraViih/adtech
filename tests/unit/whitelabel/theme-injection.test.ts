import { describe, it, expect } from 'vitest'
import { buildThemeCssVars } from '@/lib/whitelabel/theme'
import type { WorkspaceBranding } from '@/types/database'

const base: WorkspaceBranding = {
  id: 'b-1',
  workspace_id: 'ws-1',
  logo_url: 'https://example.com/logo.png',
  primary_color: '#1A73E8',
  custom_domain: 'ads.agency.com',
  domain_verified: true,
  cname_token: 'tok-abc',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('buildThemeCssVars — theme injection', () => {
  it('injects --adflow-accent when branding has a custom color', () => {
    const css = buildThemeCssVars(base)
    expect(css).toBe('--adflow-accent: #1A73E8;')
  })

  it('returns empty string when primary_color matches AdFlow default', () => {
    const css = buildThemeCssVars({ ...base, primary_color: '#E8390E' })
    expect(css).toBe('')
  })

  it('returns empty string when branding is null', () => {
    expect(buildThemeCssVars(null)).toBe('')
  })
})
