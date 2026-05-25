import { getPlanByPriceId } from "@/lib/stripe/plans";
import type { OrgPlan, SubscriptionStatus } from "@/types/database";

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
