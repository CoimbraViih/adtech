import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pixel/fanout", () => ({
  fanoutToPlatforms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pixel/dead-letter", () => ({
  writeToDeadLetter: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/observability/metrics", () => ({
  logPixelMetric: vi.fn(),
}));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}));

import { POST } from "@/app/api/pixel/[id]/route";
import { NextRequest } from "next/server";
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";
import { logPixelMetric } from "@/lib/observability/metrics";
import { fanoutToPlatforms } from "@/lib/pixel/fanout";

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
    // workspace lookup for organizationId
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { organization_id: "org_1" },
        error: null,
      }),
    });
    // events_outbox insert (enqueueEvent — fire-and-forget)
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
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

  it("chama writeToDeadLetter com 'validation_failed' para evento com event_type inválido", async () => {
    const req = makeRequest(PIXEL_ID, { event_type: "invalid_type" });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(400);
    expect(writeToDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "validation_failed" })
    );
  });

  it("chama writeToDeadLetter com 'persistence_failed' quando insert no DB falha", async () => {
    // Pixel lookup OK
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, domain: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    // Insert falha
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "connection refused" },
      }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "page_view" }, {
      "x-forwarded-for": "1.2.3.4",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(500);
    expect(writeToDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "persistence_failed" })
    );
  });

  it("chama logPixelMetric com outcome 'accepted' no happy path", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, domain: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ev_1", pixel_id: PIXEL_ID, event_type: "purchase", received_at: new Date().toISOString() },
        error: null,
      }),
    });
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { organization_id: "org_1" },
        error: null,
      }),
    });
    // events_outbox insert (enqueueEvent — fire-and-forget)
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "purchase" }, { "x-forwarded-for": "1.2.3.4" });
    await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });

    expect(logPixelMetric).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "accepted", eventType: "purchase" })
    );
  });

  it("does not call fanoutToPlatforms when consent is denied", async () => {
    const mockFanout = vi.mocked(fanoutToPlatforms);

    // Pixel lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, domain: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    // pixel_events insert
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ev_2", pixel_id: PIXEL_ID, event_type: "page_view", received_at: new Date().toISOString() },
        error: null,
      }),
    });
    // workspace lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { organization_id: "org_1" },
        error: null,
      }),
    });
    // consent_records insert (fire-and-forget)
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    // events_outbox insert (enqueueEvent — fire-and-forget)
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "page_view", consent_state: "denied" }, {
      "x-forwarded-for": "1.2.3.4",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });

    expect(res.status).toBe(204);
    expect(mockFanout).not.toHaveBeenCalled();
  });
});
