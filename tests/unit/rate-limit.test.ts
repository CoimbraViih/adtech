import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/security/rate-limit";

describe("createRateLimiter", () => {
  it("allows first request", () => {
    const check = createRateLimiter("test-rl-1", 3, 60_000);
    expect(check("ip1")).toBe(false);
  });

  it("allows up to the limit", () => {
    const check = createRateLimiter("test-rl-2", 3, 60_000);
    expect(check("ip2")).toBe(false); // 1
    expect(check("ip2")).toBe(false); // 2
    expect(check("ip2")).toBe(false); // 3 — still allowed
  });

  it("blocks when limit is exceeded", () => {
    const check = createRateLimiter("test-rl-3", 2, 60_000);
    check("ip3"); // 1
    check("ip3"); // 2 — at limit
    expect(check("ip3")).toBe(true); // 3 — blocked
  });

  it("isolates counters by ID", () => {
    const check = createRateLimiter("test-rl-4", 1, 60_000);
    check("ipA"); // ipA at limit
    expect(check("ipA")).toBe(true);
    expect(check("ipB")).toBe(false); // ipB fresh
  });

  it("resets after window expires", async () => {
    const check = createRateLimiter("test-rl-5", 1, 50); // 50ms window
    check("ipC"); // at limit
    expect(check("ipC")).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(check("ipC")).toBe(false); // window reset
  });

  it("isolates counters between named limiters", () => {
    const a = createRateLimiter("ns-a", 1, 60_000);
    const b = createRateLimiter("ns-b", 1, 60_000);
    a("shared-id"); // exhaust namespace a
    expect(a("shared-id")).toBe(true); // blocked in a
    expect(b("shared-id")).toBe(false); // not blocked in b
  });
});
