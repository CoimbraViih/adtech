/**
 * Real Supabase session-refresh middleware — M10 swap-in.
 *
 * To activate: rename this file to middleware.ts (replacing the current stub).
 * The updateSession() signature is identical — middleware.ts uses it unchanged.
 *
 * After activation:
 *   - JWT is validated server-side via supabase.auth.getUser()
 *   - Refresh tokens are rotated automatically via cookie mutation
 *   - The unsigned adflow_session cookie is no longer consulted
 *
 * Superadmin check in middleware.ts must be updated to read:
 *   user?.app_metadata?.is_superadmin === true
 * instead of session?.role === "superadmin".
 * Set is_superadmin via Supabase dashboard: Auth → Users → Edit → app_metadata.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Apply cookies to both the request (for downstream reads) and the response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: always getUser(), never getSession() — validates JWT server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response: supabaseResponse };
}
