import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pixel/fanout", () => ({
  fanoutToPlatforms: vi.fn().mockResolvedValue(undefined),
}));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}));

import { POST } from "@/app/api/pixel/[id]/route";
import { NextRequest } from "next/server";

function makeRequest(pixelId: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/pixel/${pixelId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const PIXEL_ID = "px_test_123";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/pixel/[id]", () => {
  it("returns 204 for a valid page_view event when pixel exists", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ev_1", pixel_id: PIXEL_ID, event_type: "page_view", received_at: new Date().toISOString() },
        error: null,
      }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "page_view" }, {
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestAgent/1.0",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid event_type", async () => {
    const req = makeRequest(PIXEL_ID, { event_type: "bad_type" });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when pixel does not exist", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });

    const req = makeRequest("px_nonexistent", { event_type: "page_view" });
    const res = await POST(req, { params: Promise.resolve({ id: "px_nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/pixel/${PIXEL_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json {{",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(400);
  });
});
