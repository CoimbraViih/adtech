/**
 * Supabase session-refresh helper for Next.js middleware.
 *
 * TODO(M1-backend): replace body with:
 *   import { createServerClient } from "@supabase/ssr";
 *   import { NextResponse } from "next/server";
 *   import type { NextRequest } from "next/server";
 *   import type { Database } from "@/types/supabase";
 *
 *   export async function updateSession(request: NextRequest) {
 *     let supabaseResponse = NextResponse.next({ request });
 *
 *     const supabase = createServerClient<Database>(
 *       process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *       {
 *         cookies: {
 *           getAll: () => request.cookies.getAll(),
 *           setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
 *             supabaseResponse.cookies.set(name, value, options)
 *           ),
 *         },
 *       }
 *     );
 *
 *     // IMPORTANT: always getUser(), never getSession()
 *     const { data: { user } } = await supabase.auth.getUser();
 *     return { user, response: supabaseResponse };
 *   }
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";

/**
 * Reads the fake session cookie and returns user + a passthrough response.
 * The middleware.ts file calls this on every matched route.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = raw ? decodeSession(raw) : null;
  const user = session?.user ?? null;
  return { user, response };
}
