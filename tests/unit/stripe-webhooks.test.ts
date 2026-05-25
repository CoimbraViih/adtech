import { describe, it, expect } from "vitest";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from "@/lib/stripe/webhooks";
import type { SubscriptionUpsertPayload } from "@/lib/stripe/webhooks";

const basePayload: SubscriptionUpsertPayload = {
  organizationId: "org-123",
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test",
  plan: "pro",
  status: "active",
  currentPeriodStart: "2026-05-01T00:00:00Z",
  currentPeriodEnd: "2026-06-01T00:00:00Z",
  cancelAtPeriodEnd: false,
};

describe("handleCheckoutCompleted", () => {
  it("returns upsert payload with plan resolved from priceId", () => {
    const result = handleCheckoutCompleted({
      organizationId: "org-123",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: "price_pro_test",
      currentPeriodStart: "2026-05-01T00:00:00Z",
      currentPeriodEnd: "2026-06-01T00:00:00Z",
    });
    expect(result.plan).toBe("pro");
    expect(result.status).toBe("active");
    expect(result.organizationId).toBe("org-123");
    expect(result.cancelAtPeriodEnd).toBe(false);
  });

  it("resolves agency plan from agency priceId", () => {
    const result = handleCheckoutCompleted({
      organizationId: "org-456",
      stripeCustomerId: "cus_test2",
      stripeSubscriptionId: "sub_test2",
      stripePriceId: "price_agency_test",
      currentPeriodStart: "2026-05-01T00:00:00Z",
      currentPeriodEnd: "2026-06-01T00:00:00Z",
    });
    expect(result.plan).toBe("agency");
  });

  it("defaults to free for unknown priceId", () => {
    const result = handleCheckoutCompleted({
      organizationId: "org-789",
      stripeCustomerId: "cus_test3",
      stripeSubscriptionId: "sub_test3",
      stripePriceId: "price_unknown_xyz",
      currentPeriodStart: "2026-05-01T00:00:00Z",
      currentPeriodEnd: "2026-06-01T00:00:00Z",
    });
    expect(result.plan).toBe("free");
  });
});

describe("handleSubscriptionUpdated", () => {
  it("returns the payload unchanged", () => {
    const result = handleSubscriptionUpdated(basePayload);
    expect(result.plan).toBe("pro");
    expect(result.status).toBe("active");
    expect(result.organizationId).toBe("org-123");
  });

  it("preserves cancelAtPeriodEnd: true", () => {
    const result = handleSubscriptionUpdated({ ...basePayload, cancelAtPeriodEnd: true });
    expect(result.cancelAtPeriodEnd).toBe(true);
  });

  it("preserves past_due status", () => {
    const result = handleSubscriptionUpdated({ ...basePayload, status: "past_due" });
    expect(result.status).toBe("past_due");
  });
});

describe("handleSubscriptionDeleted", () => {
  it("returns payload with action downgrade_to_free", () => {
    const result = handleSubscriptionDeleted({
      organizationId: "org-123",
      stripeSubscriptionId: "sub_test",
    });
    expect(result.organizationId).toBe("org-123");
    expect(result.action).toBe("downgrade_to_free");
    expect(result.stripeSubscriptionId).toBe("sub_test");
  });
});

describe("handlePaymentFailed", () => {
  it("returns notification payload with warning severity", () => {
    const result = handlePaymentFailed({
      organizationId: "org-123",
      stripeCustomerId: "cus_test",
      amountDue: 50000,
    });
    expect(result.organizationId).toBe("org-123");
    expect(result.severity).toBe("warning");
    expect(result.amountDue).toBe(50000);
  });
});
