type DomainBranding = {
  workspace_id: string
  logo_url: string | null
  primary_color: string
}

export async function resolveWhitelabelDomain(domain: string): Promise<DomainBranding | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) return null

  const url =
    `${supabaseUrl}/rest/v1/workspace_branding` +
    `?custom_domain=eq.${encodeURIComponent(domain)}` +
    `&domain_verified=eq.true` +
    `&select=workspace_id,logo_url,primary_color`

  try {
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      // Cache for 60s — custom domains rarely change
      next: { revalidate: 60 },
    })

    if (!res.ok) return null
    const rows = (await res.json()) as DomainBranding[]
    return rows[0] ?? null
  } catch {
    return null
  }
}
