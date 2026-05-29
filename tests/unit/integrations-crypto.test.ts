import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("integrations/crypto", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
    vi.resetModules();
  });

  it("round-trips a JSON string", async () => {
    const { encrypt, decrypt } = await import("@/lib/integrations/crypto");
    const original = JSON.stringify({ api_key: "sk-test-123", extra: "value" });
    const blob = encrypt(original);
    expect(decrypt(blob)).toBe(original);
  });

  it("produces different ciphertext for the same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/integrations/crypto");
    const input = "same-input";
    const blob1 = encrypt(input);
    const blob2 = encrypt(input);
    expect(blob1).not.toBe(blob2);
  });

  it("blob has format iv:authTag:ciphertext", async () => {
    const { encrypt } = await import("@/lib/integrations/crypto");
    const blob = encrypt("test");
    const parts = blob.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(24);
    expect(parts[1]).toHaveLength(32);
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/integrations/crypto");
    const blob = encrypt("secret");
    const parts = blob.split(":");
    const tampered = `${parts[0]}:${parts[1]}:ffffffff`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt } = await import("@/lib/integrations/crypto");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    const { encrypt } = await import("@/lib/integrations/crypto");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });
});
