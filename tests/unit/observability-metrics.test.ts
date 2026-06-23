import { describe, it, expect, vi, beforeEach } from "vitest";

const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
  consoleSpy.mockClear();
});

import { logPixelMetric } from "@/lib/observability/metrics";

describe("logPixelMetric", () => {
  it("faz console.log com JSON válido", () => {
    logPixelMetric({
      pixelId: "px_1",
      organizationId: "org_1",
      outcome: "accepted",
      latencyMs: 45,
      eventType: "page_view",
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const raw = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({
      level: "INFO",
      event: "pixel_ingest",
      pixelId: "px_1",
      organizationId: "org_1",
      outcome: "accepted",
      latencyMs: 45,
      eventType: "page_view",
    });
    expect(typeof parsed.ts).toBe("string");
  });

  it("inclui eventType undefined quando não fornecido", () => {
    logPixelMetric({
      pixelId: "px_2",
      organizationId: null,
      outcome: "rejected_not_found",
      latencyMs: 10,
    });

    const raw = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.outcome).toBe("rejected_not_found");
    expect(parsed.organizationId).toBeNull();
  });

  it("todos os valores de PixelOutcome são aceitos sem erro de tipo", () => {
    const outcomes = [
      "accepted",
      "rejected_validation",
      "rejected_payload_too_large",
      "rejected_rate_limit",
      "rejected_not_found",
      "rejected_cors",
      "error_persistence",
    ] as const;

    for (const outcome of outcomes) {
      expect(() =>
        logPixelMetric({ pixelId: "px_3", organizationId: null, outcome, latencyMs: 1 })
      ).not.toThrow();
    }
  });
});
