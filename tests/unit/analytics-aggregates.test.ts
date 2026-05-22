import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { getKpiSummary, getFunnelSteps, getChannelAttribution } from "@/lib/analytics/aggregates";
import { createServiceClient } from "@/lib/supabase/service";
import type { ConversionSession, DailyEventCount } from "@/types/database";

const mockDaily: DailyEventCount[] = [
  { workspace_id: "ws1", pixel_id: "px1", pixel_name: "Site", day: "2026-05-22T00:00:00Z", event_type: "page_view", event_count: 100, total_value: 0 },
  { workspace_id: "ws1", pixel_id: "px1", pixel_name: "Site", day: "2026-05-22T00:00:00Z", event_type: "purchase", event_count: 5, total_value: 500 },
  { workspace_id: "ws1", pixel_id: "px1", pixel_name: "Site", day: "2026-05-22T00:00:00Z", event_type: "lead", event_count: 20, total_value: 0 },
];

const mockSessions: ConversionSession[] = [
  { session_id: "s1", workspace_id: "ws1", pixel_id: "px1", session_start: "2026-05-22T09:00:00Z", session_end: "2026-05-22T09:30:00Z", first_touch_url: "https://example.com/?utm_source=google", last_touch_url: "https://example.com/checkout", total_events: 4, purchases: 1, conversions: 1, revenue: 100 },
  { session_id: "s2", workspace_id: "ws1", pixel_id: "px1", session_start: "2026-05-22T10:00:00Z", session_end: "2026-05-22T10:10:00Z", first_touch_url: "https://example.com/?utm_source=facebook", last_touch_url: "https://example.com/checkout", total_events: 3, purchases: 1, conversions: 1, revenue: 200 },
];

function mockSupabase(data: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({ data, error: null }));
  return { from: vi.fn().mockReturnValue(chain) };
}

describe("getKpiSummary", () => {
  it("calculates total_events, total_conversions and total_revenue", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(mockDaily));
    const kpi = await getKpiSummary("ws1", "2026-05-01", "2026-05-31");
    expect(kpi.total_events).toBe(125);
    expect(kpi.total_conversions).toBe(25);
    expect(kpi.total_revenue).toBe(500);
  });

  it("returns cpa of 0 when there are no conversions", async () => {
    const empty: DailyEventCount[] = [];
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(empty));
    const kpi = await getKpiSummary("ws1", "2026-05-01", "2026-05-31");
    expect(kpi.cpa).toBe(0);
  });
});

describe("getFunnelSteps", () => {
  it("returns ordered funnel steps with drop-off rates", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(mockDaily));
    const steps = await getFunnelSteps("ws1", "2026-05-01", "2026-05-31");
    expect(steps[0].event_type).toBe("page_view");
    expect(steps[0].drop_off_rate).toBe(0);
    // drop-off for purchase is relative to the immediately preceding step (lead: 20)
    // (20 - 5) / 20 = 0.75
    const purchaseStep = steps.find((s) => s.event_type === "purchase");
    expect(purchaseStep?.drop_off_rate).toBeCloseTo(0.75, 2);
  });
});

describe("getChannelAttribution", () => {
  it("returns channel attribution using the specified model", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(mockSessions));
    const channels = await getChannelAttribution("ws1", "2026-05-01", "2026-05-31", "last_click");
    expect(channels.length).toBeGreaterThan(0);
    const total = channels.reduce((s, c) => s + c.attribution_share, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
