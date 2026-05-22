/**
 * Supabase browser client (singleton).
 * TODO(M1-backend): uncomment real implementation below and delete the stub.
 *
 * Real implementation:
 *   import { createBrowserClient } from "@supabase/ssr";
 *   import type { Database } from "@/types/supabase"; // gerado pelo CLI
 *
 *   let client: ReturnType<typeof createBrowserClient<Database>> | null = null;
 *
 *   export function getSupabaseBrowserClient() {
 *     if (!client) {
 *       client = createBrowserClient<Database>(
 *         process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 *       );
 *     }
 *     return client;
 *   }
 */

// ── Stub ──────────────────────────────────────────────────────────────────────

export type FakeAuthResult =
  | { data: { user: { id: string; email: string } }; error: null }
  | { data: null; error: { message: string } };

/**
 * Minimal fake surface that mirrors the Supabase auth API shape.
 * All methods return promises so call-sites are already async-ready.
 */
export const supabaseBrowserStub = {
  auth: {
    /** Magic-link: always succeeds in fake mode */
    signInWithOtp: async (opts: {
      email: string;
      options?: { emailRedirectTo?: string };
    }): Promise<FakeAuthResult> => {
      console.info("[fake-supabase] signInWithOtp →", opts.email);
      await delay(400);
      return { data: { user: { id: "fake-id", email: opts.email } }, error: null };
    },

    /** Google OAuth: always succeeds */
    signInWithOAuth: async (opts: {
      provider: "google";
      options?: { redirectTo?: string };
    }): Promise<{ data: unknown; error: null }> => {
      console.info("[fake-supabase] signInWithOAuth →", opts.provider);
      await delay(400);
      // Real Supabase redirects the browser here — stub just resolves
      return { data: {}, error: null };
    },

    /** Sign out: clears nothing in stub (middleware handles cookie) */
    signOut: async (): Promise<{ error: null }> => {
      console.info("[fake-supabase] signOut");
      await delay(200);
      return { error: null };
    },
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
