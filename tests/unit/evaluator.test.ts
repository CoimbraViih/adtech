import { describe, it, expect } from "vitest";
import { evaluateRule, buildNotificationMessage } from "@/lib/automation/evaluator";
import type { AlertRule, CampaignMetricSnapshot } from "@/types/database";

const baseRule: AlertRule = {
  id: "rule-1",
  workspace_id: "ws-1",
  campaign_id: null,
  name: "ROAS Alert",
  condition: "roas_below",
  threshold: 2.0,
  status: "active",
  cooldown_minutes: 60,
  last_triggered_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const baseMetric: CampaignMetricSnapshot = {
  campaign_id: "camp-1",
  workspace_id: "ws-1",
  campaign_name: "Black Friday",
  roas: 1.5,
  cpa: 50,
  spend: 1000,
  ctr: 0.02,
  conversions: 20,
};

describe("evaluateRule", () => {
  it("triggers roas_below when roas < threshold", () => {
    expect(evaluateRule(baseRule, baseMetric)).toBe(true);
  });

  it("does not trigger roas_below when roas >= threshold", () => {
    expect(evaluateRule(baseRule, { ...baseMetric, roas: 2.5 })).toBe(false);
  });

  it("does not trigger when roas is null", () => {
    expect(evaluateRule(baseRule, { ...baseMetric, roas: null })).toBe(false);
  });

  it("triggers cpa_above when cpa > threshold", () => {
    const rule = { ...baseRule, condition: "cpa_above" as const, threshold: 30 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("does not trigger cpa_above when cpa <= threshold", () => {
    const rule = { ...baseRule, condition: "cpa_above" as const, threshold: 60 };
    expect(evaluateRule(rule, baseMetric)).toBe(false);
  });

  it("triggers spend_above when spend > threshold", () => {
    const rule = { ...baseRule, condition: "spend_above" as const, threshold: 500 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("triggers ctr_below when ctr < threshold", () => {
    const rule = { ...baseRule, condition: "ctr_below" as const, threshold: 0.05 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("triggers conversions_below when conversions < threshold", () => {
    const rule = { ...baseRule, condition: "conversions_below" as const, threshold: 50 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("respects cooldown — does not trigger if last_triggered_at is recent", () => {
    const recentTrigger = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const rule = { ...baseRule, cooldown_minutes: 60, last_triggered_at: recentTrigger };
    expect(evaluateRule(rule, baseMetric)).toBe(false);
  });

  it("triggers when cooldown has expired", () => {
    const oldTrigger = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    const rule = { ...baseRule, cooldown_minutes: 60, last_triggered_at: oldTrigger };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("does not trigger when rule is paused", () => {
    expect(evaluateRule({ ...baseRule, status: "paused" }, baseMetric)).toBe(false);
  });
});

describe("buildNotificationMessage", () => {
  it("returns title and body for roas_below", () => {
    const result = buildNotificationMessage(baseRule, baseMetric, 1.5);
    expect(result.title).toContain("ROAS");
    expect(result.body).toContain("Black Friday");
    expect(result.body).toContain("1.5");
  });
});
