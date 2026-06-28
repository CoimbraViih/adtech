import { describe, it, expect, vi } from 'vitest'

describe('resolveWhitelabelDomain', () => {
  it('returns branding data for a known verified domain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([{
        workspace_id: 'ws-123',
        logo_url: 'https://example.com/logo.png',
        primary_color: '#AA1100',
      }]),
    }))

    const { resolveWhitelabelDomain } = await import('@/lib/whitelabel/resolve-domain')
    const result = await resolveWhitelabelDomain('ads.agency.com')

    expect(result).not.toBeNull()
    expect(result?.workspace_id).toBe('ws-123')
    expect(result?.primary_color).toBe('#AA1100')

    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns null when domain is not registered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([]),
    }))

    const { resolveWhitelabelDomain } = await import('@/lib/whitelabel/resolve-domain')
    const result = await resolveWhitelabelDomain('unknown.com')
    expect(result).toBeNull()

    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const { resolveWhitelabelDomain } = await import('@/lib/whitelabel/resolve-domain')
    const result = await resolveWhitelabelDomain('ads.agency.com')
    expect(result).toBeNull()

    vi.unstubAllGlobals()
    vi.resetModules()
  })
})
