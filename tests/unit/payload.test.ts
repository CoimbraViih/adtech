import { describe, it, expect } from "vitest";
import { payloadExceedsLimit } from "@/lib/security/payload";

describe("payloadExceedsLimit", () => {
  it("returns false when header is absent", () => {
    expect(payloadExceedsLimit(null, 10_000)).toBe(false);
  });

  it("returns false when payload is within limit", () => {
    expect(payloadExceedsLimit("5000", 10_000)).toBe(false);
  });

  it("returns false at exact limit", () => {
    expect(payloadExceedsLimit("10000", 10_000)).toBe(false);
  });

  it("returns true when payload exceeds limit", () => {
    expect(payloadExceedsLimit("10001", 10_000)).toBe(true);
  });

  it("returns false for non-numeric header", () => {
    expect(payloadExceedsLimit("NaN", 10_000)).toBe(false);
  });
});
