import { describe, it, expect } from "vitest";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";

describe("integrations/providers", () => {
  it("exports 12 providers", () => {
    expect(Object.keys(PROVIDERS)).toHaveLength(12);
  });

  const providerKeys = [
    "meta", "google", "tiktok", "linkedin",
    "openai", "anthropic", "stability", "runway", "elevenlabs",
    "resend", "whatsapp", "rtb",
  ];

  providerKeys.forEach((key) => {
    it(`provider "${key}" has required fields`, () => {
      const p = PROVIDERS[key];
      expect(p).toBeDefined();
      expect(p.label).toBeTruthy();
      expect(p.category).toMatch(/^(ads|ai|communication|programmatic)$/);
      expect(p.fields.length).toBeGreaterThan(0);
      expect(typeof p.testConnection).toBe("function");
    });

    it(`provider "${key}" fields have keys and labels`, () => {
      const p = PROVIDERS[key];
      for (const field of p.fields) {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(typeof field.secret).toBe("boolean");
      }
    });
  });

  it("PROVIDER_CATEGORIES has 4 categories with correct labels", () => {
    expect(PROVIDER_CATEGORIES).toHaveLength(4);
    const keys = PROVIDER_CATEGORIES.map((c) => c.key);
    expect(keys).toContain("ads");
    expect(keys).toContain("ai");
    expect(keys).toContain("communication");
    expect(keys).toContain("programmatic");
  });

  it("rtb testConnection returns ok:true for non-empty token", async () => {
    const result = await PROVIDERS.rtb.testConnection({ ssp_token: "my-secret-token" });
    expect(result.ok).toBe(true);
  });

  it("rtb testConnection returns ok:false for empty token", async () => {
    const result = await PROVIDERS.rtb.testConnection({ ssp_token: "" });
    expect(result.ok).toBe(false);
  });
});
