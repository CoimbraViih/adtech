import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

// Import após os mocks
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

describe("writeToDeadLetter", () => {
  it("insere na tabela pixel_dead_letter com os campos corretos", async () => {
    await writeToDeadLetter({
      pixelId: "px_1",
      organizationId: "org_1",
      reason: "validation_failed",
      eventPayload: { event_type: "bad_type" },
    });

    expect(mockFrom).toHaveBeenCalledWith("pixel_dead_letter");
    expect(mockInsert).toHaveBeenCalledWith({
      pixel_id: "px_1",
      organization_id: "org_1",
      rejection_reason: "validation_failed",
      event_payload: { event_type: "bad_type" },
    });
  });

  it("aceita organization_id nulo (falha antes do lookup do pixel)", async () => {
    await writeToDeadLetter({
      pixelId: "px_2",
      organizationId: null,
      reason: "persistence_failed",
      eventPayload: null,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: null })
    );
  });

  it("não lança exceção quando o insert falha (best-effort)", async () => {
    mockInsert.mockRejectedValue(new Error("DB connection refused"));

    await expect(
      writeToDeadLetter({
        pixelId: "px_3",
        organizationId: null,
        reason: "validation_failed",
        eventPayload: {},
      })
    ).resolves.not.toThrow();
  });

  it("aceita reason 'synthetic_check_failed'", async () => {
    await writeToDeadLetter({
      pixelId: "synthetic-px",
      organizationId: null,
      reason: "synthetic_check_failed",
      eventPayload: { latencyMs: 1500, error: "DB timeout" },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rejection_reason: "synthetic_check_failed" })
    );
  });
});
