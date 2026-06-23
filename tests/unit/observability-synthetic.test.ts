import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

// Cadeia de mocks para o builder Supabase
const mockFrom = vi.fn(() => ({
  insert: mockInsert.mockReturnThis(),
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  limit: mockLimit.mockReturnThis(),
  single: mockSingle,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

import { runSyntheticCheck } from "@/lib/observability/synthetic";

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    insert: mockInsert.mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    single: mockSingle,
  });
});

describe("runSyntheticCheck", () => {
  it("retorna success=true quando insert e read funcionam", async () => {
    // Primeiro from: insert → select (sem erro)
    mockFrom
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
      // Segundo from: select → eq → limit → single (evento encontrado)
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "ev_1" }, error: null }),
      });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(true);
    expect(typeof result.latencyMs).toBe("number");
    expect(result.error).toBeUndefined();
  });

  it("retorna success=false quando insert falha", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: { message: "DB timeout" } }),
    });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB timeout");
  });

  it("retorna success=false quando evento não é encontrado após insert", async () => {
    mockFrom
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "no rows" } }),
      });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("retorna success=false e captura exceção inesperada", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("unexpected crash");
    });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("unexpected crash");
  });
});
