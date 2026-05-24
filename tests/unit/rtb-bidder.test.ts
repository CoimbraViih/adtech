import { describe, it, expect } from "vitest";
import {
  checkPacing,
  checkFrequencyCap,
  calculateCpm,
  selectBid,
  buildBidResponse,
} from "@/lib/rtb/bidder";
import type { RtbCampaign, OpenRtbBidRequest } from "@/types/database";

const baseCampaign: RtbCampaign = {
  id: "camp_1",
  workspace_id: "ws_1",
  campaign_id: null,
  name: "Test Campaign",
  status: "active",
  deal_type: "open",
  deal_id: null,
  floor_cpm: 1.0,
  max_cpm: 5.0,
  daily_budget: 100,
  total_budget: null,
  pacing: "even",
  frequency_cap: 3,
  frequency_cap_hours: 24,
  creative_id: null,
  audience_id: null,
  targeting: {},
  start_date: "2026-05-01",
  end_date: null,
  impressions: 0,
  wins: 0,
  spend: 0,
  win_rate: null,
  avg_cpm: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

function makeCampaign(overrides: Partial<RtbCampaign> = {}): RtbCampaign {
  return { ...baseCampaign, ...overrides };
}

const baseRequest: OpenRtbBidRequest = {
  id: "req_1",
  imp: [{ id: "imp_1", bidfloor: 2.0 }],
  at: 1,
  user: { id: "user_1" },
};

describe("checkPacing", () => {
  it("returns true when todaySpend < daily_budget", () => {
    expect(checkPacing(makeCampaign({ daily_budget: 100 }), 50)).toBe(true);
  });

  it("returns false when todaySpend > daily_budget", () => {
    expect(checkPacing(makeCampaign({ daily_budget: 100 }), 150)).toBe(false);
  });

  it("returns false when todaySpend exactly equals daily_budget", () => {
    expect(checkPacing(makeCampaign({ daily_budget: 100 }), 100)).toBe(false);
  });
});

describe("checkFrequencyCap", () => {
  it("returns true when impressionCount < frequency_cap", () => {
    expect(checkFrequencyCap(makeCampaign({ frequency_cap: 3 }), 2)).toBe(true);
  });

  it("returns false when impressionCount > frequency_cap", () => {
    expect(checkFrequencyCap(makeCampaign({ frequency_cap: 3 }), 4)).toBe(false);
  });

  it("returns false when impressionCount exactly equals frequency_cap", () => {
    expect(checkFrequencyCap(makeCampaign({ frequency_cap: 3 }), 3)).toBe(false);
  });
});

describe("calculateCpm", () => {
  it("returns max_cpm when max_cpm > floorCpm", () => {
    expect(calculateCpm(makeCampaign({ max_cpm: 5.0 }), 2.0)).toBe(5.0);
  });

  it("returns null when max_cpm < floorCpm", () => {
    expect(calculateCpm(makeCampaign({ max_cpm: 1.0 }), 3.0)).toBeNull();
  });

  it("returns null when max_cpm equals floorCpm", () => {
    expect(calculateCpm(makeCampaign({ max_cpm: 3.0 }), 3.0)).toBeNull();
  });
});

describe("selectBid", () => {
  it("returns null when campaigns array is empty", () => {
    const context = {
      todaySpend: new Map<string, number>(),
      impressionCounts: new Map<string, number>(),
    };
    expect(selectBid([], baseRequest, context)).toBeNull();
  });

  it("returns null when all campaigns are paused", () => {
    const context = {
      todaySpend: new Map<string, number>(),
      impressionCounts: new Map<string, number>(),
    };
    const campaigns = [
      makeCampaign({ status: "paused" }),
      makeCampaign({ id: "camp_2", status: "draft" }),
    ];
    expect(selectBid(campaigns, baseRequest, context)).toBeNull();
  });

  it("returns null when no campaign passes floor check", () => {
    const context = {
      todaySpend: new Map<string, number>(),
      impressionCounts: new Map<string, number>(),
    };
    // bidfloor = 2.0, max_cpm = 1.5 — all below floor
    const campaigns = [makeCampaign({ max_cpm: 1.5 })];
    expect(selectBid(campaigns, baseRequest, context)).toBeNull();
  });

  it("returns null when campaign exceeds daily budget", () => {
    const campaign = makeCampaign({ daily_budget: 100, max_cpm: 5.0 });
    const context = {
      todaySpend: new Map<string, number>([["camp_1", 100]]),
      impressionCounts: new Map<string, number>(),
    };
    expect(selectBid([campaign], baseRequest, context)).toBeNull();
  });

  it("returns the eligible campaign + CPM when one passes all checks", () => {
    const campaign = makeCampaign({ max_cpm: 5.0, daily_budget: 100 });
    const context = {
      todaySpend: new Map<string, number>([["camp_1", 50]]),
      impressionCounts: new Map<string, number>(),
    };
    const result = selectBid([campaign], baseRequest, context);
    expect(result).not.toBeNull();
    expect(result!.campaign.id).toBe("camp_1");
    expect(result!.cpm).toBe(5.0);
  });

  it("returns the highest CPM campaign when multiple are eligible", () => {
    const camp1 = makeCampaign({ id: "camp_1", max_cpm: 5.0, daily_budget: 100 });
    const camp2 = makeCampaign({ id: "camp_2", max_cpm: 8.0, daily_budget: 100 });
    const context = {
      todaySpend: new Map<string, number>([
        ["camp_1", 50],
        ["camp_2", 50],
      ]),
      impressionCounts: new Map<string, number>(),
    };
    const result = selectBid([camp1, camp2], baseRequest, context);
    expect(result).not.toBeNull();
    expect(result!.campaign.id).toBe("camp_2");
    expect(result!.cpm).toBe(8.0);
  });
});

describe("buildBidResponse", () => {
  it("returns empty seatbid when bid is null", () => {
    const response = buildBidResponse("req_1", "imp_1", null);
    expect(response.seatbid).toHaveLength(0);
  });

  it("returns proper OpenRTB structure when bid is provided", () => {
    const campaign = makeCampaign();
    const bid = { campaign, cpm: 5.0 };
    const response = buildBidResponse("req_1", "imp_1", bid);
    expect(response.seatbid).toHaveLength(1);
    expect(response.seatbid[0].bid[0].price).toBe(5.0);
    expect(response.seatbid[0].bid[0].impid).toBe("imp_1");
  });

  it("response id matches the requestId parameter", () => {
    const response = buildBidResponse("req_abc", "imp_1", null);
    expect(response.id).toBe("req_abc");
  });
});
