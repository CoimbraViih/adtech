import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Query chain builder — mirrors the pattern used in integrations-credentials
// ---------------------------------------------------------------------------
type ChainOverrides = {
  data?: unknown;
  error?: { message: string } | null;
};

function makeQueryChain(overrides: ChainOverrides = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "lte", "inner"];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // Terminal resolution — called when the query is awaited
  chain.then = vi.fn(
    async (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve({ data: overrides.data ?? null, error: overrides.error ?? null })
  );
  return chain;
}

describe("getManagedSpend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 0 when there are no rows", async () => {
    const chain = makeQueryChain({ data: [] });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => chain,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    const result = await getManagedSpend(
      "org-1",
      new Date("2026-06-01"),
      new Date("2026-06-30")
    );
    expect(result).toBe(0);
  });

  it("returns 0 when Supabase returns an error", async () => {
    const chain = makeQueryChain({ data: null, error: { message: "DB error" } });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => chain,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    const result = await getManagedSpend(
      "org-1",
      new Date("2026-06-01"),
      new Date("2026-06-30")
    );
    expect(result).toBe(0);
  });

  it("sums spend values across multiple rows", async () => {
    const rows = [
      { spend: "500.00" },
      { spend: "1000.50" },
      { spend: "250.25" },
    ];
    const chain = makeQueryChain({ data: rows });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => chain,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    const result = await getManagedSpend(
      "org-1",
      new Date("2026-06-01"),
      new Date("2026-06-30")
    );
    // 500.00 + 1000.50 + 250.25 = 1750.75
    expect(result).toBeCloseTo(1750.75, 2);
  });

  it("handles numeric spend values (not just strings)", async () => {
    const rows = [{ spend: 300 }, { spend: 700 }];
    const chain = makeQueryChain({ data: rows });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => chain,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    const result = await getManagedSpend(
      "org-2",
      new Date("2026-06-01"),
      new Date("2026-06-30")
    );
    expect(result).toBe(1000);
  });

  it("handles null spend values gracefully (treats as 0)", async () => {
    const rows = [{ spend: null }, { spend: "500.00" }];
    const chain = makeQueryChain({ data: rows });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => chain,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    const result = await getManagedSpend(
      "org-1",
      new Date("2026-06-01"),
      new Date("2026-06-30")
    );
    expect(result).toBeCloseTo(500, 2);
  });

  it("queries with the correct date range formatted as YYYY-MM-DD", async () => {
    const chain = makeQueryChain({ data: [] });
    const fromSpy = vi.fn(() => chain);
    vi.mocked(createServiceClient).mockReturnValue({
      from: fromSpy,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    await getManagedSpend("org-1", new Date("2026-06-01"), new Date("2026-06-30"));

    expect(fromSpy).toHaveBeenCalledWith("campaign_metrics_daily");
    expect(chain.gte).toHaveBeenCalledWith("date", "2026-06-01");
    expect(chain.lte).toHaveBeenCalledWith("date", "2026-06-30");
  });

  it("filters by organization_id via workspace join", async () => {
    const chain = makeQueryChain({ data: [] });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => chain,
    } as ReturnType<typeof createServiceClient>);

    const { getManagedSpend } = await import("@/lib/billing/managed-spend");
    await getManagedSpend("org-99", new Date("2026-06-01"), new Date("2026-06-30"));

    expect(chain.eq).toHaveBeenCalledWith("workspaces.organization_id", "org-99");
  });
});

describe("getCurrentBillingPeriod", () => {
  it("returns start as the first day of the current month", async () => {
    const { getCurrentBillingPeriod } = await import("@/lib/billing/managed-spend");
    const { start } = getCurrentBillingPeriod();
    expect(start.getDate()).toBe(1);
  });

  it("returns end as the last day of the current month", async () => {
    const { getCurrentBillingPeriod } = await import("@/lib/billing/managed-spend");
    const { end } = getCurrentBillingPeriod();
    // Last day of any month is always >= 28
    expect(end.getDate()).toBeGreaterThanOrEqual(28);
    // The next day would be the first of the next month
    const nextDay = new Date(end);
    nextDay.setDate(nextDay.getDate() + 1);
    expect(nextDay.getDate()).toBe(1);
  });

  it("start is before or equal to end", async () => {
    const { getCurrentBillingPeriod } = await import("@/lib/billing/managed-spend");
    const { start, end } = getCurrentBillingPeriod();
    expect(start.getTime()).toBeLessThanOrEqual(end.getTime());
  });
});
