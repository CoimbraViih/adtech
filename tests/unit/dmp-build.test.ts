import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { getUsersMatchingRule } from "@/lib/rtb/dmp";
import { createServiceClient } from "@/lib/supabase/service";
import type { AudienceRule } from "@/types/database";

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
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
  operator: "eq",
  value: "page_view",
  lookback_days: 30,
};

const gteRule: AudienceRule = {
  event_type: "purchase",
  operator: "gte",
  value: 2,
  lookback_days: 7,
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

  it("operador eq: retorna todos os users com ao menos 1 evento do tipo", async () => {
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
