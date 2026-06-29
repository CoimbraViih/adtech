import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { matchUserToSegments, evaluateAudienceRules, hashUserId } from "@/lib/rtb/dmp";
import { createServiceClient } from "@/lib/supabase/service";
import type { Audience } from "@/types/database";

// ---------------------------------------------------------------------------
// MockChain type
// ---------------------------------------------------------------------------
type MockChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: unknown;
};

function makeChain(): MockChain {
  const chain: MockChain = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    not: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    ilike: vi.fn(),
    or: vi.fn(),
    maybeSingle: vi.fn(),
    then: undefined,
  };
  chain.select.mockReturnThis();
  chain.eq.mockReturnThis();
  chain.in.mockReturnThis();
  chain.not.mockReturnThis();
  chain.gt.mockReturnThis();
  chain.gte.mockReturnThis();
  chain.ilike.mockReturnThis();
  chain.or.mockReturnThis();
  return chain;
}

// ---------------------------------------------------------------------------
// matchUserToSegments mock factory
// Three queries: dmp_optouts (maybeSingle), audiences (awaitable), audience_segments (awaitable)
// ---------------------------------------------------------------------------
function makeSegmentMock(
  optedOut: boolean,
  segmentAudienceIds: string[],
  workspaceAudienceIds = ["aud_1", "aud_2"]
) {
  const optoutChain = makeChain();
  optoutChain.maybeSingle.mockResolvedValue({
    data: optedOut ? { user_hash: "hashed" } : null,
    error: null,
  });

  const audiencesChain = makeChain();
  (audiencesChain as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void
  ) =>
    Promise.resolve(
      resolve({
        data: workspaceAudienceIds.map((id) => ({ id })),
        error: null,
      })
    );

  const segmentsChain = makeChain();
  (segmentsChain as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void
  ) =>
    Promise.resolve(
      resolve({
        data: segmentAudienceIds.map((id) => ({ audience_id: id })),
        error: null,
      })
    );

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "dmp_optouts") return optoutChain;
    if (table === "audiences") return audiencesChain;
    return segmentsChain; // audience_segments
  });

  return { from };
}

// ---------------------------------------------------------------------------
// evaluateAudienceRules mock factory
// getUsersMatchingRule queries: pixels (awaitable), pixel_events (awaitable)
// ---------------------------------------------------------------------------
function makeEvaluateMock(
  pixelIds: string[],
  eventUserHashes: string[]
) {
  const pixelsChain = makeChain();
  (pixelsChain as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void
  ) =>
    Promise.resolve(
      resolve({
        data: pixelIds.map((id) => ({ id })),
        error: null,
      })
    );

  const eventsChain = makeChain();
  (eventsChain as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void
  ) =>
    Promise.resolve(
      resolve({
        data: eventUserHashes.map((h) => ({ user_id_hash: h })),
        error: null,
      })
    );

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "pixels") return pixelsChain;
    return eventsChain; // pixel_events
  });

  return { from };
}

// ---------------------------------------------------------------------------
// Tests: matchUserToSegments
// ---------------------------------------------------------------------------
describe("matchUserToSegments", () => {
  it("retorna [] quando userId é string vazia", async () => {
    const result = await matchUserToSegments("", "ws_1");
    expect(result).toEqual([]);
  });

  it("retorna [] quando user está em dmp_optouts", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(true, ["aud_1", "aud_2"])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    expect(result).toEqual([]);
  });

  it("retorna IDs de audiências quando user tem segmentos e não está em opt-out", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(false, ["aud_1", "aud_2"])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    expect(result).toEqual(["aud_1", "aud_2"]);
  });

  it("retorna [] quando user não tem segmentos", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(false, [])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    expect(result).toEqual([]);
  });

  it("todos os valores retornados são strings", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(false, ["aud_1"])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    for (const id of result) expect(typeof id).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Tests: evaluateAudienceRules
// ---------------------------------------------------------------------------
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

describe("evaluateAudienceRules", () => {
  it("retorna um número >= 0", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeEvaluateMock(["px_1"], ["hash_a", "hash_b"])
    );
    const result = await evaluateAudienceRules(baseAudience, "ws_1");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("é determinístico — mesmos args retornam mesmo valor", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeEvaluateMock(["px_1"], ["hash_a", "hash_b"])
    );
    const result1 = await evaluateAudienceRules(baseAudience, "ws_1");

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeEvaluateMock(["px_1"], ["hash_a", "hash_b"])
    );
    const result2 = await evaluateAudienceRules(baseAudience, "ws_1");

    expect(result1).toBe(result2);
  });

  it("retorna 0 quando não há regras na audiência", async () => {
    const emptyAudience: Audience = { ...baseAudience, rules: [] };
    // No Supabase call expected when rules is empty
    const result = await evaluateAudienceRules(emptyAudience, "ws_1");
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: hashUserId
// ---------------------------------------------------------------------------
describe("hashUserId", () => {
  it("produz hash SHA-256 de 64 chars hex", () => {
    expect(hashUserId("sess_abc")).toHaveLength(64);
    expect(hashUserId("sess_abc")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("session_id diferentes → hashes diferentes", () => {
    expect(hashUserId("sess_1")).not.toBe(hashUserId("sess_2"));
  });

  it("mesmo session_id → mesmo hash", () => {
    expect(hashUserId("sess_x")).toBe(hashUserId("sess_x"));
  });

  it("string vazia → string vazia", () => {
    expect(hashUserId("")).toBe("");
  });
});
