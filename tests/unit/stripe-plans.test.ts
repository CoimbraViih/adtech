import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlanByPriceId,
  campaignLimit,
  creativeLimit,
  pixelLimit,
  canAccessProgrammatic,
  canAccessAiCreatives,
  canAccessAutomation,
  canAccessWhiteLabel,
  isOverLimit,
  formatPlanPrice,
  formatLimit,
} from "@/lib/stripe/plans";

describe("PLANS config", () => {
  it("free plan has correct limits", () => {
    expect(PLANS.free.campaigns).toBe(3);
    expect(PLANS.free.creatives).toBe(10);
    expect(PLANS.free.pixels).toBe(1);
  });

  it("pro plan has correct limits", () => {
    expect(PLANS.pro.campaigns).toBe(25);
    expect(PLANS.pro.creatives).toBe(100);
    expect(PLANS.pro.pixels).toBe(5);
  });

  it("agency plan has unlimited (-1) campaigns", () => {
    expect(PLANS.agency.campaigns).toBe(-1);
    expect(PLANS.agency.creatives).toBe(-1);
    expect(PLANS.agency.pixels).toBe(-1);
  });
});

describe("campaignLimit", () => {
  it("returns numeric limit for free", () => expect(campaignLimit("free")).toBe(3));
  it("returns -1 for agency (unlimited)", () => expect(campaignLimit("agency")).toBe(-1));
});

describe("creativeLimit", () => {
  it("returns 100 for pro", () => expect(creativeLimit("pro")).toBe(100));
});

describe("pixelLimit", () => {
  it("returns 5 for pro", () => expect(pixelLimit("pro")).toBe(5));
});

describe("canAccessProgrammatic", () => {
  it("free: false", () => expect(canAccessProgrammatic("free")).toBe(false));
  it("pro: false", () => expect(canAccessProgrammatic("pro")).toBe(false));
  it("agency: true", () => expect(canAccessProgrammatic("agency")).toBe(true));
});

describe("canAccessAiCreatives", () => {
  it("free: false", () => expect(canAccessAiCreatives("free")).toBe(false));
  it("pro: true", () => expect(canAccessAiCreatives("pro")).toBe(true));
  it("agency: true", () => expect(canAccessAiCreatives("agency")).toBe(true));
});

describe("canAccessAutomation", () => {
  it("free: false", () => expect(canAccessAutomation("free")).toBe(false));
  it("pro: true", () => expect(canAccessAutomation("pro")).toBe(true));
});

describe("canAccessWhiteLabel", () => {
  it("free: false", () => expect(canAccessWhiteLabel("free")).toBe(false));
  it("pro: false", () => expect(canAccessWhiteLabel("pro")).toBe(false));
  it("agency: true", () => expect(canAccessWhiteLabel("agency")).toBe(true));
});

describe("isOverLimit", () => {
  it("returns false when under limit", () => expect(isOverLimit(2, 3)).toBe(false));
  it("returns true when at limit", () => expect(isOverLimit(3, 3)).toBe(true));
  it("returns true when over limit", () => expect(isOverLimit(5, 3)).toBe(true));
  it("returns false when limit is -1 (unlimited)", () => expect(isOverLimit(9999, -1)).toBe(false));
});

describe("getPlanByPriceId", () => {
  it("returns pro for pro price id", () => {
    expect(getPlanByPriceId("price_pro_test")).toBe("pro");
  });
  it("returns agency for agency price id", () => {
    expect(getPlanByPriceId("price_agency_test")).toBe("agency");
  });
  it("returns free for unknown price id", () => {
    expect(getPlanByPriceId("price_unknown")).toBe("free");
  });
});

describe("formatPlanPrice", () => {
  it("returns 'Grátis' for free", () => expect(formatPlanPrice("free")).toBe("Grátis"));
  it("returns BRL formatted price for pro", () => {
    const result = formatPlanPrice("pro");
    expect(result).toContain("500");
  });
});

describe("formatLimit", () => {
  it("returns 'Ilimitado' for -1", () => expect(formatLimit(-1)).toBe("Ilimitado"));
  it("returns string number for finite limit", () => expect(formatLimit(25)).toBe("25"));
});
