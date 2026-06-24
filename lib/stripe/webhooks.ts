import type { OrgPlan, SubscriptionStatus } from "@/types/database";

/**
 * Resolves an OrgPlan from a Stripe price ID.
 * Kept here (not in plans.ts) because subscription-based plans are legacy;
 * plans.ts now only contains fee-calculator re-exports.
 */
function getPlanByPriceId(priceId: string): OrgPlan {
  if (!priceId) return "free";
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID ?? "price_pro_test";
  const agencyPriceId = process.env.STRIPE_AGENCY_PRICE_ID ?? "price_agency_test";
  if (priceId === proPriceId) return "pro";
  if (priceId === agencyPriceId) return "agency";
  return "free";
}

// ── Input/Output types ────────────────────────────────────────────────────────

export type SubscriptionUpsertPayload = {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: OrgPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export type SubscriptionDeletePayload = {
  organizationId: string;
  stripeSubscriptionId: string;
  action: "downgrade_to_free";
};

export type PaymentFailedPayload = {
  organizationId: string;
  stripeCustomerId: string;
  amountDue: number;
  severity: "warning";
};

// ── Handlers ──────────────────────────────────────────────────────────────────

export function handleCheckoutCompleted(input: {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}): SubscriptionUpsertPayload {
  return {
    organizationId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    plan: getPlanByPriceId(input.stripePriceId),
    status: "active",
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: false,
  };
}

export function handleSubscriptionUpdated(
  payload: SubscriptionUpsertPayload
): SubscriptionUpsertPayload {
  return payload;
}

export function handleSubscriptionDeleted(input: {
  organizationId: string;
  stripeSubscriptionId: string;
}): SubscriptionDeletePayload {
  return {
    organizationId: input.organizationId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    action: "downgrade_to_free",
  };
}

export function handlePaymentFailed(input: {
  organizationId: string;
  stripeCustomerId: string;
  amountDue: number;
}): PaymentFailedPayload {
  return {
    organizationId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId,
    amountDue: input.amountDue,
    severity: "warning",
  };
}
