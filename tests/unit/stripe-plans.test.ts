import { describe, it, expect } from "vitest";
import {
  calculateFee,
  TIERS,
  FLOOR_BRL,
  formatFeeBRL,
  isOverLimit,
  MANAGED_SPEND_PRODUCT_NAME,
} from "@/lib/stripe/plans";

// ── Re-exports from fee-calculator ───────────────────────────────────────────

describe("TIERS", () => {
  it("has three tiers", () => {
    expect(TIERS).toHaveLength(3);
  });

  it("first tier rate is 10%", () => {
    expect(TIERS[0].rate).toBeCloseTo(0.10);
    expect(TIERS[0].upTo).toBe(2000);
  });

  it("second tier rate is 5%", () => {
    expect(TIERS[1].rate).toBeCloseTo(0.05);
    expect(TIERS[1].upTo).toBe(5000);
  });

  it("third tier rate is 3% (unbounded)", () => {
    expect(TIERS[2].rate).toBeCloseTo(0.03);
    expect(TIERS[2].upTo).toBe(Infinity);
  });
});

describe("FLOOR_BRL", () => {
  it("is R$197", () => {
    expect(FLOOR_BRL).toBe(197);
  });
});

describe("calculateFee", () => {
  it("returns 0 for zero spend", () => {
    expect(calculateFee(0)).toBe(0);
  });

  it("returns 0 for negative spend", () => {
    expect(calculateFee(-100)).toBe(0);
  });

  it("applies floor for tiny spend", () => {
    // R$100 → 10% = R$10, but floor is R$197
    expect(calculateFee(100)).toBe(FLOOR_BRL);
  });

  it("applies 10% on first R$2000", () => {
    // R$2000 → 10% = R$200, above floor
    expect(calculateFee(2000)).toBeCloseTo(200);
  });

  it("applies tiered rates across brackets", () => {
    // R$5000: 2000*10% + 3000*5% = 200 + 150 = 350
    expect(calculateFee(5000)).toBeCloseTo(350);
  });

  it("applies 3% on spend above R$5000", () => {
    // R$10000: 2000*10% + 3000*5% + 5000*3% = 200 + 150 + 150 = 500
    expect(calculateFee(10000)).toBeCloseTo(500);
  });
});

describe("formatFeeBRL", () => {
  it("formats as pt-BR currency", () => {
    const result = formatFeeBRL(197);
    expect(result).toMatch(/197/);
    expect(result).toMatch(/R\$/);
  });
});

describe("MANAGED_SPEND_PRODUCT_NAME", () => {
  it("is the correct product name", () => {
    expect(MANAGED_SPEND_PRODUCT_NAME).toBe("Taxa AdFlow — Gasto Gerenciado");
  });
});

// ── isOverLimit ───────────────────────────────────────────────────────────────

describe("isOverLimit", () => {
  it("returns false when under limit", () => expect(isOverLimit(2, 3)).toBe(false));
  it("returns true when at limit", () => expect(isOverLimit(3, 3)).toBe(true));
  it("returns true when over limit", () => expect(isOverLimit(5, 3)).toBe(true));
  it("returns false when limit is -1 (unlimited)", () => expect(isOverLimit(9999, -1)).toBe(false));
});
