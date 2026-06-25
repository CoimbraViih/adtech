import { describe, it, expect } from "vitest";
import { isCanonicalOrder } from "@/lib/commerce/types";

describe("isCanonicalOrder", () => {
  it("returns true for valid order", () => {
    expect(isCanonicalOrder({
      externalOrderId: "123",
      totalValue: 99.9,
      currency: "BRL",
      lineItems: [],
      placedAt: new Date().toISOString(),
    })).toBe(true);
  });

  it("returns false when totalValue is missing", () => {
    expect(isCanonicalOrder({
      externalOrderId: "123",
      currency: "BRL",
      lineItems: [],
      placedAt: new Date().toISOString(),
    })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isCanonicalOrder(null)).toBe(false);
  });
});
