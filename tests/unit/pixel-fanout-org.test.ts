import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Credential mock (controls whether adapters have a token) ─────────────────
const mockGetCredentialField = vi.fn<
  [string, string, string, string],
  Promise<string | null>
>();

vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: (
    orgId: string,
    provider: string,
    field: string,
    envFallback: string
  ) => mockGetCredentialField(orgId, provider, field, envFallback),
}));

// ── fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = vi.fn<[RequestInfo | URL, RequestInit?], Promise<Response>>();
vi.stubGlobal("fetch", mockFetch);

import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { sendMetaCapiEvent } from "@/lib/pixel/meta-capi";
import { sendGoogleEcEvent } from "@/lib/pixel/google-ec";
import type { Pixel, PixelEvent } from "@/types/database";

// ── Fixtures ──────────────────────────────────────────────────────────────────
const basePixel: Pixel = {
  id: "px_1",
  workspace_id: "ws_1",
  name: "Test Pixel",
  meta_pixel_id: "meta_123",
  google_tag_id: "G-XXXX",
  domain: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const baseEvent: PixelEvent = {
  id: "ev_1",
  pixel_id: "px_1",
  event_type: "purchase",
  event_name: null,
  url: "https://example.com",
  referrer: null,
  ip: "1.2.3.0",
  user_agent: "Mozilla/5.0",
  session_id: "sess_1",
  value: 49.9,
  currency: "BRL",
  properties: null,
  received_at: new Date().toISOString(),
};

function makeOkResponse(): Response {
  return new Response(null, { status: 200 });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(makeOkResponse());
});

// ─────────────────────────────────────────────────────────────────────────────
// fanoutToPlatforms — organizationId forwarding
// ─────────────────────────────────────────────────────────────────────────────
describe("fanoutToPlatforms — organizationId propagation", () => {
  it("passes organizationId to sendMetaCapiEvent", async () => {
    // No credentials so adapters will skip gracefully — we only care about the call arg
    mockGetCredentialField.mockResolvedValue(null);

    await fanoutToPlatforms(baseEvent, basePixel, "org_abc");

    // getCredentialField should have been called with "org_abc" for meta
    const metaCall = mockGetCredentialField.mock.calls.find(
      ([orgId, provider]) => provider === "meta" && orgId === "org_abc"
    );
    expect(metaCall).toBeDefined();
  });

  it("passes organizationId to sendGoogleEcEvent", async () => {
    mockGetCredentialField.mockResolvedValue(null);

    await fanoutToPlatforms(baseEvent, basePixel, "org_abc");

    const googleCall = mockGetCredentialField.mock.calls.find(
      ([orgId, provider]) => provider === "google" && orgId === "org_abc"
    );
    expect(googleCall).toBeDefined();
  });

  it("resolves without throwing when organizationId is empty and no env creds", async () => {
    mockGetCredentialField.mockResolvedValue(null);

    await expect(
      fanoutToPlatforms(baseEvent, basePixel, "")
    ).resolves.not.toThrow();
  });

  it("does not call fetch when organizationId is empty and no credentials are found", async () => {
    mockGetCredentialField.mockResolvedValue(null);

    await fanoutToPlatforms(baseEvent, basePixel, "");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls fetch for both adapters when a real organizationId yields credentials", async () => {
    // Return a token for any credential field lookup
    mockGetCredentialField.mockResolvedValue("token_xyz");

    await fanoutToPlatforms(baseEvent, basePixel, "org_real");

    // Two fetch calls — one for Meta CAPI, one for GA4 MP
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendMetaCapiEvent — token in Authorization header, NOT in URL
// ─────────────────────────────────────────────────────────────────────────────
describe("sendMetaCapiEvent — Authorization header", () => {
  it("sends the access token as a Bearer header, not in the URL query string", async () => {
    mockGetCredentialField.mockResolvedValue("my_meta_token");

    await sendMetaCapiEvent("org_1", baseEvent, "meta_px_999");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    // Token must NOT appear in the URL
    expect(url).not.toContain("access_token");
    expect(url).not.toContain("my_meta_token");

    // Token must appear in Authorization header
    const headers = init?.headers as Record<string, string>;
    expect(headers?.["Authorization"]).toBe("Bearer my_meta_token");
  });

  it("skips (no fetch) when no access_token credential is found", async () => {
    mockGetCredentialField.mockResolvedValue(null);

    await sendMetaCapiEvent("org_1", baseEvent, "meta_px_999");

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendGoogleEcEvent — uses ga4_api_secret field, not refresh_token
// ─────────────────────────────────────────────────────────────────────────────
describe("sendGoogleEcEvent — ga4_api_secret credential field", () => {
  it("calls getCredentialField with 'ga4_api_secret' field, not 'refresh_token'", async () => {
    mockGetCredentialField.mockResolvedValue("ga4_secret_abc");

    await sendGoogleEcEvent("org_1", baseEvent, "G-TEST123");

    const googleCall = mockGetCredentialField.mock.calls.find(
      ([, , field]) => field === "ga4_api_secret"
    );
    expect(googleCall).toBeDefined();

    const wrongCall = mockGetCredentialField.mock.calls.find(
      ([, , field]) => field === "refresh_token"
    );
    expect(wrongCall).toBeUndefined();
  });

  it("uses 'GA4_API_SECRET' as the env fallback variable name", async () => {
    mockGetCredentialField.mockResolvedValue(null);

    await sendGoogleEcEvent("org_1", baseEvent, "G-TEST123");

    const call = mockGetCredentialField.mock.calls.find(
      ([, , , envFallback]) => envFallback === "GA4_API_SECRET"
    );
    expect(call).toBeDefined();
  });

  it("skips (no fetch) when ga4_api_secret is not found", async () => {
    mockGetCredentialField.mockResolvedValue(null);

    await sendGoogleEcEvent("org_1", baseEvent, "G-TEST123");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("passes api_secret in the URL query string (GA4 MP requirement)", async () => {
    mockGetCredentialField.mockResolvedValue("ga4_secret_xyz");

    await sendGoogleEcEvent("org_1", baseEvent, "G-TEST123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("api_secret=ga4_secret_xyz");
  });
});
