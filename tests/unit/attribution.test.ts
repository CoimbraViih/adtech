import { describe, it, expect } from "vitest";
import {
  applyLastClick,
  applyLinear,
  applyTimeDecay,
} from "@/lib/analytics/attribution";
import type { ConversionSession } from "@/types/database";

function makeSession(overrides: Partial<ConversionSession> = {}): ConversionSession {
  return {
    session_id: "s1",
    workspace_id: "ws1",
    pixel_id: "px1",
    session_start: "2026-05-22T09:00:00Z",
    session_end: "2026-05-22T10:00:00Z",
    first_touch_url: "https://example.com/?utm_source=google",
    last_touch_url: "https://example.com/checkout",
    total_events: 5,
    purchases: 1,
    conversions: 1,
    revenue: 100,
    ...overrides,
  };
}

describe("applyLastClick", () => {
  it("attributes all revenue to the last-touch channel", () => {
    const sessions = [
      makeSession({ last_touch_url: "https://example.com/?utm_source=google", revenue: 100 }),
      makeSession({ session_id: "s2", last_touch_url: "https://example.com/?utm_source=facebook", revenue: 50 }),
    ];
    const result = applyLastClick(sessions);
    const google = result.find((r) => r.channel === "google");
    const facebook = result.find((r) => r.channel === "facebook");
    expect(google?.revenue).toBe(100);
    expect(facebook?.revenue).toBe(50);
  });

  it("attribution shares sum to 1", () => {
    const sessions = [
      makeSession({ last_touch_url: "https://example.com/?utm_source=google", revenue: 100 }),
      makeSession({ session_id: "s2", last_touch_url: "https://example.com/?utm_source=facebook", revenue: 100 }),
    ];
    const result = applyLastClick(sessions);
    const total = result.reduce((s, r) => s + r.attribution_share, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("handles null url as 'direct'", () => {
    const sessions = [makeSession({ last_touch_url: null, revenue: 200 })];
    const result = applyLastClick(sessions);
    expect(result[0].channel).toBe("direct");
    expect(result[0].revenue).toBe(200);
  });
});

describe("applyLinear", () => {
  it("splits revenue equally between first and last touch when they differ", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=facebook",
        revenue: 100,
      }),
    ];
    const result = applyLinear(sessions);
    const google = result.find((r) => r.channel === "google");
    const facebook = result.find((r) => r.channel === "facebook");
    expect(google?.revenue).toBeCloseTo(50, 5);
    expect(facebook?.revenue).toBeCloseTo(50, 5);
  });

  it("does not double-count when first and last touch are the same channel", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=google",
        revenue: 100,
      }),
    ];
    const result = applyLinear(sessions);
    const google = result.find((r) => r.channel === "google");
    expect(google?.revenue).toBeCloseTo(100, 5);
  });
});

describe("applyTimeDecay", () => {
  it("gives more credit to last touch than first touch", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=facebook",
        revenue: 100,
      }),
    ];
    const result = applyTimeDecay(sessions);
    const google = result.find((r) => r.channel === "google");
    const facebook = result.find((r) => r.channel === "facebook");
    expect((facebook?.revenue ?? 0)).toBeGreaterThan((google?.revenue ?? 0));
  });

  it("attribution shares sum to 1", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=facebook",
        revenue: 100,
      }),
    ];
    const result = applyTimeDecay(sessions);
    const total = result.reduce((s, r) => s + r.attribution_share, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
