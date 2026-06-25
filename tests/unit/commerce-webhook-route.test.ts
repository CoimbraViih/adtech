import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

// Mock Supabase service client
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}));

// Mock event ingest
vi.mock("@/lib/events/ingest", () => ({
  enqueueEvent: vi.fn().mockResolvedValue({ queued: true }),
}));

// Mock credential lookup
vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: vi.fn(
    (_orgId: string, _provider: string, field: string) => {
      if (field === "client_secret") return Promise.resolve("nuvem-secret");
      if (field === "app_token") return Promise.resolve("vtex-token");
      return Promise.resolve(null);
    }
  ),
}));

import { verifyNuvemshopHmac } from "@/lib/commerce/nuvemshop/webhooks";
import { verifyShopifyHmac } from "@/lib/commerce/shopify/webhooks";
import { verifyVtexHook } from "@/lib/commerce/vtex/webhooks";
import {
  parseNuvemshopOrder,
  type CanonicalOrder as _CanonicalOrder,
} from "@/lib/commerce/nuvemshop/webhooks";
import { parseShopifyOrder } from "@/lib/commerce/shopify/webhooks";
import { parseVtexOrder } from "@/lib/commerce/vtex/webhooks";

const NUVEM_SECRET = "nuvem-secret";
const SHOPIFY_SECRET = "shopify-secret";
const VTEX_TOKEN = "vtex-token";

// ---------------------------------------------------------------------------
// HMAC verification helpers — pure functions, no Next.js runtime needed
// ---------------------------------------------------------------------------

describe("webhook HMAC integration", () => {
  it("Nuvemshop valid HMAC passes", () => {
    const body = JSON.stringify({ id: 10, total: "200.00" });
    const sig = createHmac("sha256", NUVEM_SECRET).update(body).digest("hex");
    expect(verifyNuvemshopHmac(body, sig, NUVEM_SECRET)).toBe(true);
  });

  it("Shopify valid base64 HMAC passes", () => {
    const body = JSON.stringify({ id: 20 });
    const sig = createHmac("sha256", SHOPIFY_SECRET)
      .update(body, "utf8")
      .digest("base64");
    expect(verifyShopifyHmac(body, sig, SHOPIFY_SECRET)).toBe(true);
  });

  it("Nuvemshop replayed payload with wrong secret is rejected", () => {
    const body = JSON.stringify({ id: 10 });
    const sig = createHmac("sha256", "wrong").update(body).digest("hex");
    expect(verifyNuvemshopHmac(body, sig, NUVEM_SECRET)).toBe(false);
  });

  it("Shopify tampered body is rejected", () => {
    const body = JSON.stringify({ id: 99 });
    const sig = createHmac("sha256", SHOPIFY_SECRET)
      .update("different body", "utf8")
      .digest("base64");
    expect(verifyShopifyHmac(body, sig, SHOPIFY_SECRET)).toBe(false);
  });

  it("Nuvemshop missing signature is rejected", () => {
    const body = JSON.stringify({ id: 10 });
    expect(verifyNuvemshopHmac(body, "", NUVEM_SECRET)).toBe(false);
  });

  it("Shopify missing signature is rejected", () => {
    const body = JSON.stringify({ id: 10 });
    expect(verifyShopifyHmac(body, "", SHOPIFY_SECRET)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VTEX token-based verification
// ---------------------------------------------------------------------------

describe("VTEX hook verification", () => {
  it("matching token passes", () => {
    expect(verifyVtexHook("{}", VTEX_TOKEN, VTEX_TOKEN)).toBe(true);
  });

  it("mismatched token is rejected", () => {
    expect(verifyVtexHook("{}", VTEX_TOKEN, "wrong-token")).toBe(false);
  });

  it("empty header token is rejected", () => {
    expect(verifyVtexHook("{}", VTEX_TOKEN, "")).toBe(false);
  });

  it("empty app token is rejected", () => {
    expect(verifyVtexHook("{}", "", VTEX_TOKEN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Order parsing — canonical shape
// ---------------------------------------------------------------------------

describe("parseNuvemshopOrder", () => {
  it("maps id, total, currency, products", () => {
    const raw = {
      id: 101,
      total: "350.00",
      currency: "BRL",
      contact_email: "user@example.com",
      created_at: "2026-06-25T10:00:00Z",
      products: [
        { product_id: 42, name: "Shoe", quantity: 2, price: "175.00" },
      ],
    };
    const order = parseNuvemshopOrder(raw);
    expect(order.externalOrderId).toBe("101");
    expect(order.totalValue).toBeCloseTo(350);
    expect(order.currency).toBe("BRL");
    expect(order.customerEmail).toBe("user@example.com");
    expect(order.lineItems).toHaveLength(1);
    expect(order.lineItems[0].quantity).toBe(2);
  });
});

describe("parseShopifyOrder", () => {
  it("maps id, total_price, currency, line_items", () => {
    const raw = {
      id: 200,
      total_price: "99.90",
      currency: "USD",
      email: "buyer@example.com",
      created_at: "2026-06-25T11:00:00Z",
      line_items: [
        { product_id: 7, title: "Widget", quantity: 1, price: "99.90" },
      ],
    };
    const order = parseShopifyOrder(raw);
    expect(order.externalOrderId).toBe("200");
    expect(order.totalValue).toBeCloseTo(99.9);
    expect(order.currency).toBe("USD");
    expect(order.lineItems[0].title).toBe("Widget");
  });
});

describe("parseVtexOrder", () => {
  it("converts cents to decimal and maps orderId", () => {
    const raw = {
      orderId: "VTEX-99",
      value: 25000, // R$250 in cents
      currencyCode: "BRL",
      creationDate: "2026-06-25T12:00:00Z",
      clientProfileData: { email: "vtex@example.com" },
      items: [
        { productId: "P1", name: "Product", quantity: 1, price: 25000 },
      ],
    };
    const order = parseVtexOrder(raw);
    expect(order.externalOrderId).toBe("VTEX-99");
    expect(order.totalValue).toBeCloseTo(250);
    expect(order.customerEmail).toBe("vtex@example.com");
    expect(order.lineItems[0].unitPrice).toBeCloseTo(250);
  });
});

// ---------------------------------------------------------------------------
// Edge cases for verify functions
// ---------------------------------------------------------------------------

describe("verify functions with extreme inputs", () => {
  it("Nuvemshop handles unicode body correctly", () => {
    const body = JSON.stringify({ name: "Tênis" });
    const sig = createHmac("sha256", NUVEM_SECRET).update(body).digest("hex");
    expect(verifyNuvemshopHmac(body, sig, NUVEM_SECRET)).toBe(true);
  });

  it("Shopify handles empty JSON body", () => {
    const body = "{}";
    const sig = createHmac("sha256", SHOPIFY_SECRET)
      .update(body, "utf8")
      .digest("base64");
    expect(verifyShopifyHmac(body, sig, SHOPIFY_SECRET)).toBe(true);
  });

  it("Nuvemshop wrong length signature is rejected without throwing", () => {
    const body = JSON.stringify({ id: 1 });
    // Deliberately short hex string
    expect(verifyNuvemshopHmac(body, "abc123", NUVEM_SECRET)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// beforeEach cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});
