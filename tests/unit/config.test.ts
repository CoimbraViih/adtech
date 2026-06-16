import { describe, it, expect, beforeEach, vi } from "vitest";

describe("validateEnvVars", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("does not throw in development even with missing vars", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).not.toThrow();
  });

  it("does not throw in test environment", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).not.toThrow();
  });

  it("throws when required vars are missing in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).toThrow("Missing required environment variables in production");
  });

  it("does not throw when all required vars are present in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("CRON_SECRET", "secret");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://adflow.app");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { validateEnvVars } = await import("@/lib/config");
    expect(() => validateEnvVars()).not.toThrow();
  });
});
