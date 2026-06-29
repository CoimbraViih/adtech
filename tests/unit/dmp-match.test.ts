import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/rtb/mock-data", () => ({
  MOCK_AUDIENCES: [
    {
      id: "aud_1",
      workspace_id: "ws_1",
      name: "Audience 1",
      type: "behavioral",
      description: null,
      rules: [{ event_type: "page_view", operator: "gte", value: 1, lookback_days: 30 }],
      lookalike_source_id: null,
      size_estimate: 5000,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    },
    {
      id: "aud_2",
      workspace_id: "ws_1",
      name: "Audience 2",
      type: "lookalike",
      description: null,
      rules: [],
      lookalike_source_id: null,
      size_estimate: 3000,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    },
  ],
}));

import { matchUserToSegments, evaluateAudienceRules, hashUserId } from "@/lib/rtb/dmp";
import type { Audience } from "@/types/database";

const baseAudience: Audience = {
  id: "aud_1",
  workspace_id: "ws_1",
  name: "Test Audience",
  type: "behavioral",
  description: null,
  rules: [{ event_type: "page_view", operator: "gte", value: 1, lookback_days: 30 }],
  lookalike_source_id: null,
  size_estimate: 5000,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

describe("matchUserToSegments", () => {
  it("returns empty array when userIdHash is empty string", async () => {
    const result = await matchUserToSegments("", "ws_1");
    expect(result).toEqual([]);
  });

  it("returns array of string IDs when userIdHash is non-empty", async () => {
    const result = await matchUserToSegments("abc123hash", "ws_1");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("all returned values are strings", async () => {
    const result = await matchUserToSegments("somehash", "ws_1");
    for (const id of result) {
      expect(typeof id).toBe("string");
    }
  });
});

describe("evaluateAudienceRules", () => {
  it("returns a number >= 0", async () => {
    const result = await evaluateAudienceRules(baseAudience, "ws_1");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic — same args return same value", async () => {
    const result1 = await evaluateAudienceRules(baseAudience, "ws_1");
    const result2 = await evaluateAudienceRules(baseAudience, "ws_1");
    expect(result1).toBe(result2);
  });
});

describe("hashUserId", () => {
  it("returns a string", () => {
    const result = hashUserId("user_abc");
    expect(typeof result).toBe("string");
  });

  it("returns empty string or handles empty input gracefully", () => {
    const result = hashUserId("");
    expect(typeof result).toBe("string");
  });

  it("two different inputs return different hashes", () => {
    const hash1 = hashUserId("user_1");
    const hash2 = hashUserId("user_2");
    expect(hash1).not.toBe(hash2);
  });

  it("same input always returns same hash (deterministic)", () => {
    const hash1 = hashUserId("some_user_id");
    const hash2 = hashUserId("some_user_id");
    expect(hash1).toBe(hash2);
  });

  it("produz hash SHA-256 de 64 chars hex", () => {
    const h = hashUserId("sess_abc");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("string vazia → string vazia (sem crash)", () => {
    expect(hashUserId("")).toBe("");
  });
});
