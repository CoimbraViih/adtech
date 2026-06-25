import { describe, it, expect } from "vitest";
import { verifyVtexHook, parseVtexOrder } from "@/lib/commerce/vtex/webhooks";

describe("verifyVtexHook", () => {
  it("returns true when headerToken matches stored appToken", () => {
    expect(verifyVtexHook("{}", "secret-token", "secret-token")).toBe(true);
  });

  it("returns false when tokens differ", () => {
    expect(verifyVtexHook("{}", "real-token", "wrong-token")).toBe(false);
  });

  it("returns false for empty header token", () => {
    expect(verifyVtexHook("{}", "secret", "")).toBe(false);
  });
});

describe("parseVtexOrder", () => {
  it("maps VTEX order to CanonicalOrder", () => {
    const raw = {
      orderId: "VTX-1001-01",
      value: 49900,          // VTEX returns in centavos
      currencyCode: "BRL",
      creationDate: "2026-06-24T18:00:00.000Z",
      clientProfileData: { email: "vtex@test.com" },
      items: [
        {
          productId: "vtex-prod-1",
          name: "Calça Jogger",
          quantity: 2,
          price: 24950,
          currencyCode: "BRL",
        },
      ],
    };

    const order = parseVtexOrder(raw as Record<string, unknown>);

    expect(order.externalOrderId).toBe("VTX-1001-01");
    expect(order.totalValue).toBeCloseTo(499.0);
    expect(order.customerEmail).toBe("vtex@test.com");
    expect(order.lineItems).toHaveLength(1);
    expect(order.lineItems[0].unitPrice).toBeCloseTo(249.5);
  });
});
