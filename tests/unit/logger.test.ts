import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("logs info as JSON with correct shape", async () => {
    process.env.NODE_ENV = "development";
    const { logger } = await import("@/lib/logger");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message", { userId: "123" });
    expect(spy).toHaveBeenCalledOnce();
    const call = JSON.parse(spy.mock.calls[0][0] as string);
    expect(call.level).toBe("info");
    expect(call.message).toBe("test message");
    expect(call.userId).toBe("123");
    expect(typeof call.timestamp).toBe("string");
  });

  it("routes error to console.error", async () => {
    process.env.NODE_ENV = "development";
    const { logger } = await import("@/lib/logger");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("something broke", { code: 500 });
    expect(spy).toHaveBeenCalledOnce();
    const call = JSON.parse(spy.mock.calls[0][0] as string);
    expect(call.level).toBe("error");
  });

  it("routes warn to console.warn", async () => {
    process.env.NODE_ENV = "development";
    const { logger } = await import("@/lib/logger");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warning", { detail: "test" });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("suppresses debug in production", async () => {
    process.env.NODE_ENV = "production";
    const { logger } = await import("@/lib/logger");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.debug("debug msg");
    expect(spy).not.toHaveBeenCalled();
  });
});
