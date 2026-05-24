import { describe, it, expectTypeOf } from "vitest";
import type { AlertRule, AlertNotification, AlertCondition, AlertStatus } from "@/types/database";

describe("automation types", () => {
  it("AlertCondition covers all enum values", () => {
    const conditions: AlertCondition[] = [
      "roas_below",
      "cpa_above",
      "spend_above",
      "ctr_below",
      "conversions_below",
    ];
    expectTypeOf(conditions).toMatchTypeOf<AlertCondition[]>();
  });

  it("AlertRule has required fields", () => {
    expectTypeOf<AlertRule>().toHaveProperty("id");
    expectTypeOf<AlertRule>().toHaveProperty("workspace_id");
    expectTypeOf<AlertRule>().toHaveProperty("condition");
    expectTypeOf<AlertRule>().toHaveProperty("threshold");
    expectTypeOf<AlertRule>().toHaveProperty("status");
    expectTypeOf<AlertRule>().toHaveProperty("cooldown_minutes");
  });

  it("AlertNotification has read flag", () => {
    expectTypeOf<AlertNotification>().toHaveProperty("read");
    expectTypeOf<AlertNotification["read"]>().toEqualTypeOf<boolean>();
  });
});
