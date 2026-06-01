// lib/security/env-check.ts

const SENSITIVE_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "META_ACCESS_TOKEN",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "RTB_SSP_TOKEN",
];

/**
 * Throws at startup if any sensitive secret is exposed as a NEXT_PUBLIC_ var.
 * Call once from a server-only module (e.g., lib/supabase/service.ts).
 */
export function assertSecretsNotPublic(): void {
  for (const key of SENSITIVE_KEYS) {
    const publicKey = `NEXT_PUBLIC_${key}`;
    if (process.env[publicKey]) {
      throw new Error(
        `SECURITY: Secret "${key}" is exposed as "${publicKey}". ` +
          `Remove NEXT_PUBLIC_ prefix immediately.`
      );
    }
  }
}
