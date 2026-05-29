import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/integrations/crypto", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
  decrypt: vi.fn((v: string) => v.replace("encrypted:", "")),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "upsert", "update", "delete", "eq", "order", "limit"];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.single = vi.fn(async () => ({ data: overrides.singleData ?? null, error: overrides.singleError ?? null }));
  chain.maybeSingle = vi.fn(async () => ({ data: overrides.maybeData ?? null, error: null }));
  chain.then = vi.fn(async (resolve: (v: unknown) => void) => resolve({ data: overrides.listData ?? [], error: null }));
  return chain;
}

describe("integrations/credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  it("getCredentials returns null when no row exists", async () => {
    const chain = makeChain({ maybeData: null });
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);
    const { getCredentials } = await import("@/lib/integrations/credentials");
    const result = await getCredentials("org-1", "meta");
    expect(result).toBeNull();
  });

  it("getCredentials decrypts and returns parsed JSON", async () => {
    const stored = { access_token: "EAA123", ad_account_id: "act_456" };
    const chain = makeChain({ maybeData: { credentials: `encrypted:${JSON.stringify(stored)}` } });
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);
    const { getCredentials } = await import("@/lib/integrations/credentials");
    const result = await getCredentials("org-1", "meta");
    expect(result).toEqual(stored);
  });

  it("upsertCredentials encrypts before storing", async () => {
    const { encrypt } = await import("@/lib/integrations/crypto");
    const chain = makeChain();
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);
    const { upsertCredentials } = await import("@/lib/integrations/credentials");
    await upsertCredentials("org-1", "openai", { api_key: "sk-test" });
    expect(encrypt).toHaveBeenCalledWith(JSON.stringify({ api_key: "sk-test" }));
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("deleteCredentials calls delete().eq().eq()", async () => {
    const chain = makeChain();
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);
    const { deleteCredentials } = await import("@/lib/integrations/credentials");
    await deleteCredentials("org-1", "resend");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(chain.eq).toHaveBeenCalledWith("provider", "resend");
  });

  it("listCredentialStatuses returns configured providers only", async () => {
    const rows = [
      { provider: "meta", last_tested_at: "2026-05-29T10:00:00Z" },
      { provider: "openai", last_tested_at: null },
    ];
    const chain = makeChain({ listData: rows });
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);
    const { listCredentialStatuses } = await import("@/lib/integrations/credentials");
    const result = await listCredentialStatuses("org-1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ provider: "meta", configured: true, last_tested_at: "2026-05-29T10:00:00Z" });
  });
});
