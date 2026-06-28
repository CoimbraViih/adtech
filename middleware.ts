import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { resolveWhitelabelDomain } from '@/lib/whitelabel/resolve-domain'

const PUBLIC_PATHS = [
  '/',
  '/onboarding',
  '/callback',
  '/api/health',
  '/api/pixel',
  '/api/leads',
  '/api/audiences/optout',
]

const AUTH_ONLY_PATHS = ['/login', '/signup']

function isAdflowHost(host: string): boolean {
  const bare = host.split(':')[0]
  if (bare === 'localhost') return true
  if (bare.endsWith('.vercel.app')) return true
  // Add your production domain here if different
  if (bare === 'adflow.com.br' || bare === 'www.adflow.com.br') return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // Resolve white-label tenant when request comes from a custom domain
  let whitelabelWorkspaceId: string | null = null
  if (!isAdflowHost(host)) {
    const branding = await resolveWhitelabelDomain(host)
    if (branding) {
      whitelabelWorkspaceId = branding.workspace_id
    }
  }

  const { user, response } = await updateSession(request)
  const isAuthenticated = !!user

  // Propagate whitelabel workspace ID for Server Components downstream
  if (whitelabelWorkspaceId) {
    response.headers.set('x-whitelabel-workspace-id', whitelabelWorkspaceId)
  }

  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response
  }

  if (pathname.startsWith('/superadmin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    const safeNext =
      pathname.startsWith('/') && !pathname.startsWith('//')
        ? pathname
        : '/dashboard'
    loginUrl.searchParams.set('next', safeNext)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|adflow\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)',
  ],
}
