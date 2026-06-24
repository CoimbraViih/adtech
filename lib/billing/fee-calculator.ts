/**
 * AdFlow M22 — Fee Calculator
 *
 * Marginal fee tiers on managed spend (BRL).
 * No monthly subscription — pure pay-as-you-go.
 */

export const TIERS = [
  { upTo: 2000, rate: 0.10, label: "10%" },
  { upTo: 5000, rate: 0.05, label: "5%" },
  { upTo: Infinity, rate: 0.03, label: "3%" },
] as const;

/** Minimum fee in BRL when any spend > 0 */
export const FLOOR_BRL = 197;

/**
 * Calculates the AdFlow platform fee for a given managed spend in BRL.
 *
 * Rules:
 * - spend = 0 → fee = 0 (never charge zero-spend accounts)
 * - Tier 1: 10% on R$0–R$2.000
 * - Tier 2:  5% on R$2.001–R$5.000
 * - Tier 3:  3% on R$5.000+
 * - Floor: Math.max(FLOOR_BRL, fee) when spend > 0
 */
export function calculateFee(spendBRL: number): number {
  if (spendBRL <= 0) return 0;

  let fee = 0;
  let remaining = spendBRL;
  let previousLimit = 0;

  for (const tier of TIERS) {
    const tierCap = tier.upTo === Infinity ? Infinity : tier.upTo;
    const tierWidth = tierCap === Infinity ? Infinity : tierCap - previousLimit;
    const taxable = tierCap === Infinity ? remaining : Math.min(remaining, tierWidth);

    if (taxable <= 0) break;

    fee += taxable * tier.rate;
    remaining -= taxable;
    previousLimit = tierCap === Infinity ? previousLimit : tierCap;

    if (remaining <= 0) break;
  }

  return Math.max(FLOOR_BRL, fee);
}

/**
 * Formats a BRL amount as a currency string.
 * e.g. formatFeeBRL(197) → "R$ 197,00"
 */
export function formatFeeBRL(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}
