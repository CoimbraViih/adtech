import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveBenchmarks } from "@/lib/ai/diagnostics/benchmarks";

function makeSupabaseMock(rows: object[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            or: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    }),
  };
}

describe("resolveBenchmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns global default when no workspace override exists", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock([
        { workspace_id: null, metric: "ctr", target_value: "0.0100", comparator: "gte" },
      ]) as never,
    );
    const result = await resolveBenchmarks("ws-1", "meta", "sales");
    expect(result.ctr).toEqual({ target: 0.01, comparator: "gte" });
  });

  it("workspace override wins over global default for the same metric", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock([
        { workspace_id: null, metric: "ctr", target_value: "0.0100", comparator: "gte" },
        { workspace_id: "ws-1", metric: "ctr", target_value: "0.0200", comparator: "gte" },
      ]) as never,
    );
    const result = await resolveBenchmarks("ws-1", "meta", "sales");
    expect(result.ctr).toEqual({ target: 0.02, comparator: "gte" });
  });

  it("returns empty object when no benchmarks exist for platform/objective", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock([]) as never,
    );
    const result = await resolveBenchmarks("ws-1", "tiktok", "awareness");
    expect(result).toEqual({});
  });
});
