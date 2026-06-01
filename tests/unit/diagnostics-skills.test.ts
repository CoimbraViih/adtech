import { describe, it, expect } from "vitest";
import type { CampaignContext } from "@/lib/ai/diagnostics/types";
import { lowCtr } from "@/lib/ai/diagnostics/skills/low-ctr";
import { highCpa } from "@/lib/ai/diagnostics/skills/high-cpa";
import { creativeFatigue } from "@/lib/ai/diagnostics/skills/creative-fatigue";
import { spendNoConversion } from "@/lib/ai/diagnostics/skills/spend-no-conversion";
import { clickNoConvert } from "@/lib/ai/diagnostics/skills/click-no-convert";
import { learningPhase } from "@/lib/ai/diagnostics/skills/learning-phase";

function baseCtx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    workspaceId: "ws-1",
    organizationId: "org-1",
    entityType: "campaign",
    entityId: "c-1",
    campaignId: "c-1",
    name: "Test Campaign",
    platform: "meta",
    objective: "sales",
    spend: 500,
    impressions: 5000,
    clicks: 200,
    conversions: 10,
    revenue: 1500,
    ctr: 0.04,
    cpa: 50,
    roas: 3.0,
    frequency: 2.0,
    cvr: 0.05,
    ctrDelta7d: 0,
    benchmarks: {
      ctr:       { target: 0.01,  comparator: "gte" },
      cpa:       { target: 50,    comparator: "lte" },
      roas:      { target: 2.0,   comparator: "gte" },
      frequency: { target: 3.5,   comparator: "lte" },
    },
    ...overrides,
  };
}

describe("low-ctr skill", () => {
  it("triggers when CTR is below benchmark with enough impressions", () => {
    const ctx = baseCtx({ ctr: 0.005, impressions: 2000 });
    expect(lowCtr.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when CTR meets benchmark", () => {
    const ctx = baseCtx({ ctr: 0.02, impressions: 2000 });
    expect(lowCtr.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when impressions volume is too low", () => {
    const ctx = baseCtx({ ctr: 0.001, impressions: 500 });
    expect(lowCtr.shouldTrigger(ctx)).toBeNull();
  });
});

describe("high-cpa skill", () => {
  it("triggers when CPA exceeds benchmark and there are conversions", () => {
    const ctx = baseCtx({ cpa: 120, conversions: 5 });
    expect(highCpa.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when CPA is within benchmark", () => {
    const ctx = baseCtx({ cpa: 30, conversions: 5 });
    expect(highCpa.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when there are no conversions", () => {
    const ctx = baseCtx({ cpa: 999, conversions: 0 });
    expect(highCpa.shouldTrigger(ctx)).toBeNull();
  });
});

describe("creative-fatigue skill", () => {
  it("triggers when frequency is high AND CTR dropped >= 20%", () => {
    const ctx = baseCtx({ frequency: 5.0, ctrDelta7d: -0.25 });
    expect(creativeFatigue.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when frequency is high but CTR is stable", () => {
    const ctx = baseCtx({ frequency: 5.0, ctrDelta7d: -0.05 });
    expect(creativeFatigue.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when frequency is within benchmark", () => {
    const ctx = baseCtx({ frequency: 2.0, ctrDelta7d: -0.30 });
    expect(creativeFatigue.shouldTrigger(ctx)).toBeNull();
  });
});

describe("spend-no-conversion skill", () => {
  it("triggers as critical when spend >= 3x CPA target and zero conversions", () => {
    const ctx = baseCtx({ spend: 200, conversions: 0 });
    const finding = spendNoConversion.shouldTrigger(ctx);
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("critical");
  });

  it("does not trigger when spend is below the threshold", () => {
    const ctx = baseCtx({ spend: 50, conversions: 0 });
    expect(spendNoConversion.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when there are conversions", () => {
    const ctx = baseCtx({ spend: 500, conversions: 3 });
    expect(spendNoConversion.shouldTrigger(ctx)).toBeNull();
  });
});

describe("click-no-convert skill", () => {
  it("triggers when CTR is healthy but CVR is below 0.5% with volume", () => {
    const ctx = baseCtx({ ctr: 0.04, cvr: 0.002, clicks: 200 });
    expect(clickNoConvert.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when CVR is acceptable", () => {
    const ctx = baseCtx({ ctr: 0.04, cvr: 0.02, clicks: 200 });
    expect(clickNoConvert.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when click volume is too low", () => {
    const ctx = baseCtx({ ctr: 0.04, cvr: 0.001, clicks: 50 });
    expect(clickNoConvert.shouldTrigger(ctx)).toBeNull();
  });
});

describe("learning-phase skill", () => {
  it("triggers as info when conversions < 50", () => {
    const ctx = baseCtx({ conversions: 10 });
    const finding = learningPhase.shouldTrigger(ctx);
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("info");
  });

  it("does not trigger once 50+ conversions accumulated", () => {
    const ctx = baseCtx({ conversions: 60 });
    expect(learningPhase.shouldTrigger(ctx)).toBeNull();
  });
});
