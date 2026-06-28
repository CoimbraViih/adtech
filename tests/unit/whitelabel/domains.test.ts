import { describe, it, expect, vi } from 'vitest'
import { generateCnameToken, verifyCnameToken } from '@/lib/whitelabel/domains'

describe('generateCnameToken', () => {
  it('returns a 32-character lowercase hex string', () => {
    const token = generateCnameToken()
    expect(token).toMatch(/^[0-9a-f]{32}$/)
  })

  it('returns a unique value on each call', () => {
    const t1 = generateCnameToken()
    const t2 = generateCnameToken()
    expect(t1).not.toBe(t2)
  })
})

describe('verifyCnameToken', () => {
  it('returns true when DNS TXT record contains expected token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Answer: [{ data: '"adflow-verify=mytoken123"' }],
      }),
    }))

    const result = await verifyCnameToken('ads.agency.com', 'mytoken123')
    expect(result).toBe(true)
    vi.unstubAllGlobals()
  })

  it('returns false when DNS TXT record does not match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Answer: [{ data: '"adflow-verify=differenttoken"' }],
      }),
    }))

    const result = await verifyCnameToken('ads.agency.com', 'mytoken123')
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })

  it('returns false when DNS lookup has no Answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))

    const result = await verifyCnameToken('ads.agency.com', 'mytoken123')
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })

  it('returns false when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const result = await verifyCnameToken('ads.agency.com', 'mytoken123')
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })
})
