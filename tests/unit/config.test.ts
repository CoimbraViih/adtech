import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("validateEnvVars", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("does not throw in development even with missing vars", async () => {
    process.env.NODE_ENV = "development";
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).not.toThrow();
  });

  it("does not throw in test environment", async () => {
    process.env.NODE_ENV = "test";
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).not.toThrow();
  });

  it("throws when required vars are missing in production", async () => {
    process.env.NODE_ENV = "production";
    // Remove the required vars
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).toThrow("Missing required environment variables in production");
  });

  it("does not throw when all required vars are present in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.CRON_SECRET = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://adflow.app";
    const { validateEnvVars } = await import("@/lib/config");
    // Will warn about missing Stripe vars but not throw
    expect(() => validateEnvVars()).not.toThrow();
  });
});
