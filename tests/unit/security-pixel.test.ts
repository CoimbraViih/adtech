import { describe, it, expect } from "vitest";
import { maskIp } from "@/lib/security/ip";
import { payloadExceedsLimit } from "@/lib/security/payload";
import { createRateLimiter } from "@/lib/security/rate-limit";

describe("Pixel endpoint security layers", () => {
  describe("IP masking", () => {
    it("stores masked IP for IPv4 event", () => {
      expect(maskIp("177.23.45.67")).toBe("177.23.45.0");
    });

    it("returns null for null IP", () => {
      expect(maskIp(null)).toBe(null);
    });
  });

  describe("Payload cap", () => {
    it("rejects payload over 10 KB", () => {
      expect(payloadExceedsLimit(String(10 * 1024 + 1), 10 * 1024)).toBe(true);
    });

    it("allows payload at exactly 10 KB", () => {
      expect(payloadExceedsLimit(String(10 * 1024), 10 * 1024)).toBe(false);
    });
  });

  describe("Rate limiting", () => {
    it("blocks after 1000 requests per IP in 60s window", () => {
      const check = createRateLimiter("pixel-ip-test-t3", 1000, 60_000);
      for (let i = 0; i < 1000; i++) check("test-ip");
      expect(check("test-ip")).toBe(true);
    });

    it("blocks after 10000 requests per pixel_id in 60s window", () => {
      const check = createRateLimiter("pixel-id-test-t3", 10_000, 60_000);
      for (let i = 0; i < 10_000; i++) check("test-pixel");
      expect(check("test-pixel")).toBe(true);
    });
  });
});
