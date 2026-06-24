/**
 * AdFlow M22 — Stripe plans (cleaned up)
 *
 * The fixed-tier subscription model (Free/Pro/Agency) has been replaced by
 * a pure usage-based fee model. This file now re-exports the fee calculator
 * utilities so the rest of the app can import from a single place.
 */

export {
  calculateFee,
  TIERS,
  FLOOR_BRL,
  formatFeeBRL,
} from "@/lib/billing/fee-calculator";

/** Stripe product name used when creating one-time invoices via the cron. */
export const MANAGED_SPEND_PRODUCT_NAME = "Taxa AdFlow — Gasto Gerenciado";

/** Returns true when current usage is AT or ABOVE the limit. -1 means unlimited. */
export function isOverLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}
