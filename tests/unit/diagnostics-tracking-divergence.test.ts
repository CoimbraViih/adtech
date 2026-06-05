import { describe, it, expect } from "vitest";
import { trackingDivergence } from "@/lib/ai/diagnostics/skills/tracking-divergence";
import type { CampaignContext } from "@/lib/ai/diagnostics/types";

function makeCtx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    workspaceId: "ws-1",
    organizationId: "org-1",
    entityType: "campaign",
    entityId: "camp-1",
    campaignId: "camp-1",
    name: "Test Campaign",
    platform: "meta",
    objective: "sales",
    spend: 500,
    impressions: 20000,
    clicks: 200,
    conversions: 10,
    revenue: 2000,
    ctr: 0.01,
    cpa: 50,
    roas: 4,
    frequency: null,
    cvr: 0.05,
    ctrDelta7d: null,
    benchmarks: {},
    pixelConversions: 3,   // < 50% of 10 → trigger
    divergencePct: 0.7,
    ...overrides,
  };
}

describe("trackingDivergence skill", () => {
  it("dispara quando pixel_conversions < 50% das conversões da plataforma", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx());
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("warning");
  });

  it("não dispara quando pixelConversions é null", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ pixelConversions: null }))).toBeNull();
  });

  it("não dispara quando conversões da plataforma é 0", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ conversions: 0 }))).toBeNull();
  });

  it("não dispara quando spend está abaixo do threshold (R$100)", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ spend: 50 }))).toBeNull();
  });

  it("não dispara quando cobertura do pixel >= 50% (5 de 10)", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ pixelConversions: 5, divergencePct: 0.5 }))).toBeNull();
  });

  it("não dispara quando cobertura do pixel é exatamente 50%", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ pixelConversions: 5, conversions: 10, divergencePct: 0.5 }))).toBeNull();
  });

  it("dispara quando spend está exatamente no threshold (R$100)", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx({ spend: 100, conversions: 10, pixelConversions: 3, divergencePct: 0.7 }));
    expect(finding).not.toBeNull();
  });

  it("inclui metrics_snapshot com campos obrigatórios", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx());
    expect(finding?.metricsSnapshot).toMatchObject({
      platform_conversions: 10,
      pixel_conversions: 3,
    });
    expect(typeof finding?.metricsSnapshot.coverage_pct).toBe("number");
  });

  it("evidence menciona a cobertura em porcentagem", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx({ conversions: 10, pixelConversions: 2, divergencePct: 0.8 }));
    expect(finding?.evidence).toContain("20%"); // 1 - 0.8 = 20%
  });
});
