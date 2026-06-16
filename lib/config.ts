import { logger } from "@/lib/logger";

const REQUIRED_IN_PRODUCTION: string[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

const REQUIRED_FOR_BILLING: string[] = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_AGENCY_PRICE_ID",
];

export function validateEnvVars(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(", ")}\n` +
      `Check .env.local.example for the full list.`
    );
  }

  const missingBilling = REQUIRED_FOR_BILLING.filter((k) => !process.env[k]);
  if (missingBilling.length > 0) {
    logger.warn("Stripe env vars missing — billing features will be disabled", {
      missing: missingBilling,
    });
  }
}
