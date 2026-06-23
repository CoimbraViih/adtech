import { describe, it, expect, beforeEach, vi } from "vitest";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    // Set default behavior: DB returns success
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it("returns 200 with status ok and required fields", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("build");
    expect(body).toHaveProperty("timestamp");
  });

  it("timestamp is a valid ISO string", async () => {
    const response = await GET();
    const body = await response.json();

    const timestamp = new Date(body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeGreaterThan(0);
  });
});

describe("GET /api/health — deep check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 200 e checks.db.ok=true quando DB responde sem erro", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks.db.ok).toBe(true);
    expect(typeof body.checks.db.latencyMs).toBe("number");
  });

  it("retorna 503 e checks.db.ok=false quando DB retorna erro", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.db.ok).toBe(false);
    expect(body.checks.db.error).toBeDefined();
  });

  it("retorna 503 quando createServiceClient lança exceção", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("env vars missing");
    });

    const response = await GET();
    expect(response.status).toBe(503);
  });
});
