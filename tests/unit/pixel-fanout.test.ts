import { describe, it, expect, vi } from "vitest";

// mock the adapters before importing fanout
vi.mock("@/lib/pixel/meta-capi", () => ({
  sendMetaCapiEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/pixel/google-ec", () => ({
  sendGoogleEcEvent: vi.fn().mockResolvedValue(undefined),
}));

import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { sendMetaCapiEvent } from "@/lib/pixel/meta-capi";
import { sendGoogleEcEvent } from "@/lib/pixel/google-ec";
import type { Pixel, PixelEvent } from "@/types/database";

const mockPixel: Pixel = {
  id: "px_1",
  workspace_id: "ws_1",
  name: "Test Pixel",
  meta_pixel_id: "meta_123",
  google_tag_id: "G-XXXX",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockEvent: PixelEvent = {
  id: "ev_1",
  pixel_id: "px_1",
  event_type: "purchase",
  event_name: null,
  url: "https://example.com",
  referrer: null,
  ip: "1.2.3.4",
  user_agent: "Mozilla/5.0",
  session_id: "sess_1",
  value: 99,
  currency: "BRL",
  properties: null,
  received_at: new Date().toISOString(),
};

describe("fanoutToPlatforms", () => {
  it("calls both adapters when pixel has both IDs configured", async () => {
    await fanoutToPlatforms(mockEvent, mockPixel);
    expect(sendMetaCapiEvent).toHaveBeenCalledWith(mockEvent, mockPixel.meta_pixel_id);
    expect(sendGoogleEcEvent).toHaveBeenCalledWith(mockEvent, mockPixel.google_tag_id);
  });

  it("skips Meta CAPI when meta_pixel_id is null", async () => {
    vi.clearAllMocks();
    const pixelNoMeta = { ...mockPixel, meta_pixel_id: null };
    await fanoutToPlatforms(mockEvent, pixelNoMeta);
    expect(sendMetaCapiEvent).not.toHaveBeenCalled();
    expect(sendGoogleEcEvent).toHaveBeenCalled();
  });

  it("skips Google EC when google_tag_id is null", async () => {
    vi.clearAllMocks();
    const pixelNoGoogle = { ...mockPixel, google_tag_id: null };
    await fanoutToPlatforms(mockEvent, pixelNoGoogle);
    expect(sendMetaCapiEvent).toHaveBeenCalled();
    expect(sendGoogleEcEvent).not.toHaveBeenCalled();
  });

  it("resolves without throwing even if an adapter rejects", async () => {
    vi.clearAllMocks();
    (sendMetaCapiEvent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    await expect(fanoutToPlatforms(mockEvent, mockPixel)).resolves.not.toThrow();
  });
});
