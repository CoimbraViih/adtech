import { describe, it, expect } from "vitest";
import {
  normalizeCampaignMetrics,
  reconcileWithPixel,
} from "@/lib/analytics/cross-platform";

describe("normalizeCampaignMetrics", () => {
  it("mapeia campanhas para rows normalizadas", () => {
    const rows = normalizeCampaignMetrics("ws-1", "meta", "2026-06-04", [
      { externalId: "c1", spend: 1000, impressions: 50000, clicks: 500, conversions: 10, revenue: 5000 },
      { externalId: "c2", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].campaignExternalId).toBe("c1");
    expect(rows[0].spend).toBe(1000);
    expect(rows[0].pixelConversions).toBe(0);
    expect(rows[1].roas).toBeNull();
  });

  it("calcula roas quando spend > 0 e revenue > 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "meta", "2026-06-04", [
      { externalId: "x", spend: 100, impressions: 0, clicks: 0, conversions: 2, revenue: 400 },
    ]);
    expect(r.roas).toBeCloseTo(4);
  });

  it("define roas como null quando spend é 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "meta", "2026-06-04", [
      { externalId: "x", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    ]);
    expect(r.roas).toBeNull();
  });

  it("define roas como 0 quando revenue é 0 (sem retorno sobre o gasto)", () => {
    const [r] = normalizeCampaignMetrics("ws", "google", "2026-06-04", [
      { externalId: "x", spend: 100, impressions: 0, clicks: 0, conversions: 5, revenue: 0 },
    ]);
    expect(r.roas).toBe(0);
  });

  it("calcula cpa quando conversions > 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "google", "2026-06-04", [
      { externalId: "x", spend: 500, impressions: 0, clicks: 0, conversions: 5, revenue: 0 },
    ]);
    expect(r.cpa).toBeCloseTo(100);
  });

  it("define cpa como null quando conversions é 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "tiktok", "2026-06-04", [
      { externalId: "x", spend: 100, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    ]);
    expect(r.cpa).toBeNull();
  });

  it("preserva workspaceId, platform e date em todos os rows", () => {
    const rows = normalizeCampaignMetrics("ws-99", "linkedin", "2026-01-15", [
      { externalId: "x", spend: 50, impressions: 0, clicks: 0, conversions: 1, revenue: 200 },
    ]);
    expect(rows[0].workspaceId).toBe("ws-99");
    expect(rows[0].platform).toBe("linkedin");
    expect(rows[0].date).toBe("2026-01-15");
  });

  it("retorna array vazio quando campaigns é vazio", () => {
    const rows = normalizeCampaignMetrics("ws", "meta", "2026-06-04", []);
    expect(rows).toHaveLength(0);
  });
});

describe("reconcileWithPixel", () => {
  it("calcula divergencePct corretamente", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "meta", spend: 500, platformConversions: 10, pixelConversions: 3 },
    ]);
    expect(r.divergencePct).toBeCloseTo(0.7); // (10 - 3) / 10
  });

  it("retorna divergencePct null quando platformConversions é 0", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "meta", spend: 0, platformConversions: 0, pixelConversions: 0 },
    ]);
    expect(r.divergencePct).toBeNull();
  });

  it("retorna divergencePct 0 quando pixel bate plataforma", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "google", spend: 100, platformConversions: 5, pixelConversions: 5 },
    ]);
    expect(r.divergencePct).toBeCloseTo(0);
  });

  it("passa adiante todos os campos de entrada", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "abc", platform: "linkedin", spend: 200, platformConversions: 8, pixelConversions: 4 },
    ]);
    expect(r.campaignExternalId).toBe("abc");
    expect(r.platformConversions).toBe(8);
    expect(r.pixelConversions).toBe(4);
  });

  it("processa múltiplas rows independentemente", () => {
    const rows = reconcileWithPixel([
      { campaignExternalId: "a", platform: "meta", spend: 100, platformConversions: 10, pixelConversions: 2 },
      { campaignExternalId: "b", platform: "google", spend: 200, platformConversions: 0, pixelConversions: 0 },
    ]);
    expect(rows[0].divergencePct).toBeCloseTo(0.8);
    expect(rows[1].divergencePct).toBeNull();
  });

  it("divergencePct é negativo quando pixel supera plataforma", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "meta", spend: 100, platformConversions: 5, pixelConversions: 8 },
    ]);
    expect(r.divergencePct).toBeCloseTo(-0.6); // (5 - 8) / 5
  });
});
