import { describe, it, expect } from "vitest";
import { parsePixelEvent } from "@/lib/pixel/validate";

describe("parsePixelEvent", () => {
  it("accepts a minimal valid payload", () => {
    const result = parsePixelEvent({ event_type: "page_view" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_type).toBe("page_view");
    }
  });

  it("accepts a full purchase payload", () => {
    const result = parsePixelEvent({
      event_type: "purchase",
      url: "https://example.com/checkout",
      referrer: "https://google.com",
      session_id: "sess_abc",
      value: 99.9,
      currency: "BRL",
      properties: { order_id: "ord_1" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(99.9);
      expect(result.data.currency).toBe("BRL");
    }
  });

  it("accepts event_type 'custom' with event_name", () => {
    const result = parsePixelEvent({ event_type: "custom", event_name: "trial_start" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event_type", () => {
    const result = parsePixelEvent({ event_type: "unknown_event" });
    expect(result.success).toBe(false);
  });

  it("rejects when event_type is missing", () => {
    const result = parsePixelEvent({});
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = parsePixelEvent({ event_type: "purchase", value: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects currency not 3 characters", () => {
    const result = parsePixelEvent({ event_type: "purchase", currency: "BR" });
    expect(result.success).toBe(false);
  });
});
