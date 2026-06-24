import { describe, it, expect } from "vitest";
import {
  calculateFee,
  formatFeeBRL,
  FLOOR_BRL,
  TIERS,
} from "@/lib/billing/fee-calculator";

describe("FLOOR_BRL", () => {
  it("is 197", () => {
    expect(FLOOR_BRL).toBe(197);
  });
});

describe("TIERS", () => {
  it("has 3 tiers", () => {
    expect(TIERS).toHaveLength(3);
  });

  it("first tier covers 0–2000 at 10%", () => {
    expect(TIERS[0].upTo).toBe(2000);
    expect(TIERS[0].rate).toBe(0.10);
  });

  it("second tier covers 2001–5000 at 5%", () => {
    expect(TIERS[1].upTo).toBe(5000);
    expect(TIERS[1].rate).toBe(0.05);
  });

  it("third tier covers 5000+ at 3%", () => {
    expect(TIERS[2].upTo).toBe(Infinity);
    expect(TIERS[2].rate).toBe(0.03);
  });
});

describe("calculateFee", () => {
  it("returns 0 for zero spend", () => {
    expect(calculateFee(0)).toBe(0);
  });

  it("applies floor when raw fee is below FLOOR_BRL (spend 100 → raw 10 → 197)", () => {
    expect(calculateFee(100)).toBe(197);
  });

  it("does not apply floor when raw fee equals FLOOR_BRL exactly", () => {
    // 1970 * 0.10 = 197 exactly — floor does not reduce it
    expect(calculateFee(1970)).toBe(197);
  });

  it("does not apply floor when raw fee exceeds FLOOR_BRL (spend 2000 → 200)", () => {
    expect(calculateFee(2000)).toBe(200);
  });

  it("calculates fee across tier 1 and tier 2 (spend 3000 → 250)", () => {
    // 2000 * 0.10 = 200, 1000 * 0.05 = 50 → 250
    expect(calculateFee(3000)).toBe(250);
  });

  it("calculates fee at tier 1–2 boundary (spend 5000 → 350)", () => {
    // 2000 * 0.10 = 200, 3000 * 0.05 = 150 → 350
    expect(calculateFee(5000)).toBe(350);
  });

  it("calculates fee across all three tiers (spend 6000 → 380)", () => {
    // 2000 * 0.10 = 200, 3000 * 0.05 = 150, 1000 * 0.03 = 30 → 380
    expect(calculateFee(6000)).toBe(380);
  });

  it("applies marginal rate to large spend (spend 10000 → 200+150+150=500)", () => {
    // 2000 * 0.10 = 200, 3000 * 0.05 = 150, 5000 * 0.03 = 150 → 500
    expect(calculateFee(10000)).toBe(500);
  });

  it("returns 0 for negative spend (treated as zero)", () => {
    expect(calculateFee(-500)).toBe(0);
  });
});

describe("formatFeeBRL", () => {
  it("formats zero as R$0", () => {
    const formatted = formatFeeBRL(0);
    expect(formatted).toMatch(/R\$/);
    expect(formatted).toMatch(/0/);
  });

  it("formats 197 as a BRL string containing 197", () => {
    const formatted = formatFeeBRL(197);
    expect(formatted).toMatch(/R\$/);
    expect(formatted).toMatch(/197/);
  });

  it("formats 380 as a BRL string containing 380", () => {
    const formatted = formatFeeBRL(380);
    expect(formatted).toMatch(/R\$/);
    expect(formatted).toMatch(/380/);
  });

  it("uses pt-BR locale (comma as decimal separator)", () => {
    // In pt-BR: 197.50 → "R$ 197,50"
    const formatted = formatFeeBRL(197.5);
    expect(formatted).toMatch(/,/);
  });
});
