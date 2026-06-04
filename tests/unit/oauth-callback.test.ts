/**
 * Tests for the OAuth callback route handler state validation.
 * Calls the real GET handler from app/api/integrations/[provider]/oauth/callback/route.ts
 * to verify CSRF state cookie validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.mock calls are hoisted — these stubs prevent real DB / HTTP calls
vi.mock("@/lib/supabase/server", () => ({
  requireServerSession: vi.fn(async () => ({
    user: { id: "user-1" },
    organization: { id: "org-1" },
    workspace: { id: "ws-1" },
  })),
}));

vi.mock("@/lib/integrations/oauth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/oauth")>();
  return {
    ...actual,
    exchangeCode: vi.fn(async () => ({
      accessToken: "fake-access-token",
      expiresIn: 3600,
    })),
  };
});

vi.mock("@/lib/integrations/credentials", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/credentials")>();
  return {
    ...actual,
    upsertCredentials: vi.fn(async () => undefined),
    saveTokenRefresh: vi.fn(async () => undefined),
  };
});

describe("callback route: state validation", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("valid state cookie → proceeds to exchangeCode and redirects to success", async () => {
    const { GET } = await import(
      "@/app/api/integrations/[provider]/oauth/callback/route"
    );
    const { NextRequest } = await import("next/server");

    const state = "valid-state-xyz";
    const nextReq = new NextRequest(
      new Request(
        `http://localhost:3000/api/integrations/meta/oauth/callback?code=auth-code&state=${state}`,
        { headers: { cookie: `oauth_state_meta=${state}` } }
      )
    );

    const res = await GET(nextReq, { params: Promise.resolve({ provider: "meta" }) });

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("connected=meta");
    expect(location).not.toContain("error=");
  });

  it("missing state cookie → redirects to error URL with invalid_state", async () => {
    const { GET } = await import(
      "@/app/api/integrations/[provider]/oauth/callback/route"
    );
    const { NextRequest } = await import("next/server");

    // No cookie set — oauth_state_meta absent
    const nextReq = new NextRequest(
      new Request(
        "http://localhost:3000/api/integrations/meta/oauth/callback?code=auth-code&state=some-state"
      )
    );

    const res = await GET(nextReq, { params: Promise.resolve({ provider: "meta" }) });

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("error=invalid_state");
  });

  it("mismatched state cookie → redirects to error URL with invalid_state", async () => {
    const { GET } = await import(
      "@/app/api/integrations/[provider]/oauth/callback/route"
    );
    const { NextRequest } = await import("next/server");

    const nextReq = new NextRequest(
      new Request(
        "http://localhost:3000/api/integrations/meta/oauth/callback?code=auth-code&state=tampered-value",
        { headers: { cookie: "oauth_state_meta=original-state" } }
      )
    );

    const res = await GET(nextReq, { params: Promise.resolve({ provider: "meta" }) });

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("error=invalid_state");
  });
});
