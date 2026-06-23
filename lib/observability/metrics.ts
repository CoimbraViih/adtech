export type PixelOutcome =
  | "accepted"
  | "rejected_validation"
  | "rejected_payload_too_large"
  | "rejected_rate_limit"
  | "rejected_not_found"
  | "rejected_cors"
  | "error_persistence";

export type PixelMetricEvent = {
  pixelId: string;
  organizationId: string | null;
  outcome: PixelOutcome;
  latencyMs: number;
  eventType?: string;
};

export function logPixelMetric(event: PixelMetricEvent): void {
  console.log(
    JSON.stringify({
      level: "INFO",
      event: "pixel_ingest",
      ...event,
      ts: new Date().toISOString(),
    })
  );
}
