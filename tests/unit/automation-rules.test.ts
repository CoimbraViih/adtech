import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchActiveRules, fetchCampaignMetrics, insertNotification, markRuleTriggered } from "@/lib/automation/rules";

function makeMockSupabase(data: unknown, error: unknown = null) {
  const awaitableChain = Object.assign(
    Promise.resolve({ data, error }),
    {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
    }
  );
  return {
    from: vi.fn().mockReturnValue(awaitableChain),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
  };
}

describe("fetchActiveRules", () => {
  it("calls supabase with alert_rules table", async () => {
    const mock = makeMockSupabase([]);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);
    await fetchActiveRules("ws-1");
    expect(mock.from).toHaveBeenCalledWith("alert_rules");
  });
});

describe("fetchCampaignMetrics", () => {
  it("calls supabase with campaigns table", async () => {
    const mock = makeMockSupabase([]);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);
    await fetchCampaignMetrics("ws-1");
    expect(mock.from).toHaveBeenCalledWith("campaigns");
  });
});

describe("insertNotification", () => {
  it("calls supabase with alert_notifications table", async () => {
    const mock = makeMockSupabase(null);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);
    await insertNotification({
      workspace_id: "ws-1",
      rule_id: "rule-1",
      campaign_id: null,
      title: "Test",
      body: "Body",
      metric_value: 1.5,
    });
    expect(mock.from).toHaveBeenCalledWith("alert_notifications");
  });
});

describe("markRuleTriggered", () => {
  it("calls supabase with alert_rules table", async () => {
    const mock = makeMockSupabase(null);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);
    await markRuleTriggered("rule-1");
    expect(mock.from).toHaveBeenCalledWith("alert_rules");
  });
});
