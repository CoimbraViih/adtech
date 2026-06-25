import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyNuvemshopHmac, parseNuvemshopOrder } from "@/lib/commerce/nuvemshop/webhooks";

const SECRET = "test-secret-abc";

function makeHmac(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("verifyNuvemshopHmac", () => {
  it("returns true for valid signature", () => {
    const body = JSON.stringify({ id: 1, total: "150.00" });
    const sig = makeHmac(body);
    expect(verifyNuvemshopHmac(body, sig, SECRET)).toBe(true);
  });

  it("returns false for tampered body", () => {
    const body = JSON.stringify({ id: 1, total: "150.00" });
    const sig = makeHmac(body);
    expect(verifyNuvemshopHmac('{"id":2}', sig, SECRET)).toBe(false);
  });

  it("returns false for empty signature", () => {
    expect(verifyNuvemshopHmac("body", "", SECRET)).toBe(false);
  });
});

describe("parseNuvemshopOrder", () => {
  it("maps order fields to CanonicalOrder", () => {
    const raw = {
      id: 42,
      number: 1001,
      total: "199.90",
      currency: "BRL",
      created_at: "2026-06-24T12:00:00-03:00",
      contact_email: "cliente@email.com",
      products: [
        {
          product_id: "prod-1",
          name: "Camiseta",
          quantity: 2,
          price: "79.95",
        },
      ],
    };

    const order = parseNuvemshopOrder(raw as Record<string, unknown>);

    expect(order.externalOrderId).toBe("42");
    expect(order.totalValue).toBeCloseTo(199.90);
    expect(order.currency).toBe("BRL");
    expect(order.customerEmail).toBe("cliente@email.com");
    expect(order.lineItems).toHaveLength(1);
    expect(order.lineItems[0].externalProductId).toBe("prod-1");
    expect(order.lineItems[0].quantity).toBe(2);
  });
});
