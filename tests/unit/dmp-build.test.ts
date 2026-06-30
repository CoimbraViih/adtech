import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { getUsersMatchingRule, evaluateAudienceRules, buildAudienceMemberships } from "@/lib/rtb/dmp";
import { createServiceClient } from "@/lib/supabase/service";
import type { AudienceRule, Audience } from "@/types/database";

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: unknown;
};

function makeChain(pixelData: unknown, eventData: unknown): { from: ReturnType<typeof vi.fn> } {
  const pixelChain: MockChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: undefined,
  };
  (pixelChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({ data: pixelData, error: null }));

  const eventChain: MockChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: undefined,
  };
  (eventChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({ data: eventData, error: null }));

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "pixels") return pixelChain;
    return eventChain;
  });

  return { from };
}

const pageViewRule: AudienceRule = {
  event_type: "page_view",
  operator: "contains",
  value: "page_view",
  lookback_days: 30,
};

const gteRule: AudienceRule = {
  event_type: "purchase",
  operator: "gte",
  value: 2,
  lookback_days: 7,
};

const eqRule: AudienceRule = {
  event_type: "purchase",
  operator: "eq",
  value: 2,
  lookback_days: 30,
};

describe("getUsersMatchingRule", () => {
  it("retorna set vazio quando workspace não tem pixels", async () => {
    const mock = makeChain([], []);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(0);
  });

  it("retorna set vazio quando não há eventos correspondentes", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [] // sem eventos
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(0);
  });

  it("operador contains: retorna todos os users com ao menos 1 evento do tipo", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" },
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_a" }, // duplicata — deve ser deduplicado
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(2);
    expect(result.has("hash_a")).toBe(true);
    expect(result.has("hash_b")).toBe(true);
  });

  it("operador gte: inclui apenas users com count >= value", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" }, // 1 evento — abaixo de gte:2
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_b" }, // 2 eventos — satisfaz gte:2
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(gteRule, "ws_1");
    expect(result.has("hash_a")).toBe(false);
    expect(result.has("hash_b")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("operador eq: inclui apenas users com count === value (exato)", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" }, // 1 evento — não bate eq:2
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_b" }, // 2 eventos — bate eq:2
        { user_id_hash: "hash_c" },
        { user_id_hash: "hash_c" },
        { user_id_hash: "hash_c" }, // 3 eventos — não bate eq:2
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(eqRule, "ws_1");
    expect(result.has("hash_a")).toBe(false);
    expect(result.has("hash_b")).toBe(true);
    expect(result.has("hash_c")).toBe(false);
    expect(result.size).toBe(1);
  });

  it("ignora events com user_id_hash null", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: null },
        { user_id_hash: "hash_a" },
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(1);
    expect(result.has("hash_a")).toBe(true);
  });
});

const baseAudience: Audience = {
  id: "aud_1",
  workspace_id: "ws_1",
  name: "Compradores",
  type: "behavioral",
  description: null,
  rules: [
    { event_type: "purchase", operator: "gte", value: 1, lookback_days: 30 },
  ],
  lookalike_source_id: null,
  size_estimate: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("evaluateAudienceRules", () => {
  it("retorna 0 quando audiência não tem regras", async () => {
    const noRules = { ...baseAudience, rules: [] };
    // Sem regras → nenhum usuário corresponde por interseção vazia
    const mock = makeChain([], []);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await evaluateAudienceRules(noRules, "ws_1");
    expect(result).toBe(0);
  });

  it("retorna contagem real de users distintos quando há 1 regra", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" },
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_a" },
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await evaluateAudienceRules(baseAudience, "ws_1");
    expect(result).toBe(2);
  });

  it("interseção de 2 regras retorna apenas users que satisfazem ambas", async () => {
    const twoRuleAudience: Audience = {
      ...baseAudience,
      rules: [
        { event_type: "page_view", operator: "contains", value: "page_view", lookback_days: 30 },
        { event_type: "purchase", operator: "gte", value: 1, lookback_days: 30 },
      ],
    };

    let callCount = 0;
    const from = vi.fn().mockImplementation((table: string) => {
      // Primeira chamada a pixel_events para regra 1, segunda para regra 2
      const datasets: Array<{ user_id_hash: string }[]> = [
        [{ user_id_hash: "hash_a" }, { user_id_hash: "hash_b" }, { user_id_hash: "hash_c" }],
        [{ user_id_hash: "hash_a" }, { user_id_hash: "hash_b" }],
      ];

      const chain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: undefined as unknown,
      };

      if (table === "pixels") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [{ id: "px_1" }], error: null }));
      } else {
        const dataIdx = callCount % 2;
        callCount++;
        const data = datasets[dataIdx] ?? [];
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data, error: null }));
      }
      return chain;
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
    const result = await evaluateAudienceRules(twoRuleAudience, "ws_1");
    // hash_a e hash_b estão em ambos os sets; hash_c só no primeiro
    expect(result).toBe(2);
  });
});

describe("buildAudienceMemberships", () => {
  it("retorna { processed: 0, total: 0 } quando workspace não tem audiências", async () => {
    const from = vi.fn().mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: undefined as unknown,
      };
      if (table === "audiences") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [], error: null }));
      } else {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: null, error: null }));
      }
      return chain;
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
    const result = await buildAudienceMemberships("ws_empty");
    expect(result).toEqual({ processed: 0, total: 0 });
  });

  it("processa audiências e retorna totais corretos", async () => {
    const mockAudience = {
      id: "aud_1",
      workspace_id: "ws_1",
      name: "Test",
      type: "behavioral",
      description: null,
      rules: [{ event_type: "page_view", operator: "contains", value: "page_view", lookback_days: 30 }],
      lookalike_source_id: null,
      size_estimate: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    let audiencesCallCount = 0;
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "audiences") {
        audiencesCallCount++;
        if (audiencesCallCount === 1) {
          // First call: select("*").eq("workspace_id", ...) → return audience list
          const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnThis(),
            then: undefined as unknown,
          };
          (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
            Promise.resolve(resolve({ data: [mockAudience], error: null }));
          return chain;
        } else {
          // Subsequent calls: update().eq() → return { error: null }
          const updateChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnThis(),
            then: undefined as unknown,
          };
          (updateChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
            Promise.resolve(resolve({ data: null, error: null }));
          return updateChain;
        }
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        then: undefined as unknown,
      };

      if (table === "pixels") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [{ id: "px_1" }], error: null }));
      } else if (table === "pixel_events") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [{ user_id_hash: "hash_a" }, { user_id_hash: "hash_b" }], error: null }));
      } else {
        // audience_segments upsert
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: null, error: null }));
      }
      return chain;
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
    const result = await buildAudienceMemberships("ws_1");
    expect(result.total).toBe(1);
    expect(result.processed).toBe(1);
  });
});
