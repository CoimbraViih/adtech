import { describe, it, expect, vi } from "vitest";
import { syncCommerceProvider } from "@/lib/commerce/sync";

const maybeSingleResult = {
  data: { id: "cat-uuid-1", workspace_id: "ws-1" },
  error: null,
};

const selectChain = {
  eq: () => selectChain,
  maybeSingle: () => maybeSingleResult,
};

const updateChain = {
  eq: () => updateChain,
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => selectChain,
      update: () => updateChain,
    }),
  }),
}));

vi.mock("@/lib/commerce/nuvemshop/catalog", () => ({
  syncNuvemshopCatalog: vi.fn().mockResolvedValue({ upserted: 10 }),
}));

vi.mock("@/lib/commerce/shopify/catalog", () => ({
  syncShopifyCatalog: vi.fn().mockResolvedValue({ upserted: 5 }),
}));

vi.mock("@/lib/commerce/vtex/catalog", () => ({
  syncVtexCatalog: vi.fn().mockResolvedValue({ upserted: 8 }),
}));

describe("syncCommerceProvider", () => {
  it("delegates to nuvemshop catalog sync", async () => {
    const result = await syncCommerceProvider("org-1", "nuvemshop");
    expect(result.upserted).toBe(10);
  });

  it("delegates to shopify catalog sync", async () => {
    const result = await syncCommerceProvider("org-1", "shopify");
    expect(result.upserted).toBe(5);
  });

  it("delegates to vtex catalog sync", async () => {
    const result = await syncCommerceProvider("org-1", "vtex");
    expect(result.upserted).toBe(8);
  });

  it("throws for unknown provider", async () => {
    await expect(syncCommerceProvider("org-1", "unknown" as never)).rejects.toThrow("Unknown");
  });
});
