import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyShopifyHmac, parseShopifyOrder } from "@/lib/commerce/shopify/webhooks";

const SECRET = "shopify-test-secret";

function makeHmac(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("base64");
}

describe("verifyShopifyHmac", () => {
  it("returns true for valid base64 signature", () => {
    const body = JSON.stringify({ id: 999 });
    const sig = makeHmac(body);
    expect(verifyShopifyHmac(body, sig, SECRET)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const body = JSON.stringify({ id: 999 });
    expect(verifyShopifyHmac(body, "invalidsig", SECRET)).toBe(false);
  });
});

describe("parseShopifyOrder", () => {
  it("maps Shopify order to CanonicalOrder", () => {
    const raw = {
      id: 5001,
      total_price: "350.00",
      currency: "BRL",
      created_at: "2026-06-24T15:00:00-03:00",
      email: "buyer@test.com",
      line_items: [
        {
          product_id: "prod-abc",
          title: "Tênis Runner",
          quantity: 1,
          price: "350.00",
        },
      ],
    };

    const order = parseShopifyOrder(raw as Record<string, unknown>);

    expect(order.externalOrderId).toBe("5001");
    expect(order.totalValue).toBeCloseTo(350.0);
    expect(order.currency).toBe("BRL");
    expect(order.customerEmail).toBe("buyer@test.com");
    expect(order.lineItems).toHaveLength(1);
    expect(order.lineItems[0].title).toBe("Tênis Runner");
  });
});
