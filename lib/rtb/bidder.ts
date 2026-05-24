import type {
  RtbCampaign,
  OpenRtbBidRequest,
  OpenRtbBidResponse,
} from "@/types/database";

/**
 * Returns true if the campaign still has daily budget remaining.
 */
export function checkPacing(campaign: RtbCampaign, todaySpend: number): boolean {
  return todaySpend < campaign.daily_budget;
}

/**
 * Returns true if the user has seen fewer impressions than the frequency cap.
 */
export function checkFrequencyCap(
  campaign: RtbCampaign,
  impressionCount: number
): boolean {
  return impressionCount < campaign.frequency_cap;
}

/**
 * Returns the CPM to bid, or null if the campaign should not bid on this impression.
 * Bids max_cpm if max_cpm > floorCpm, otherwise no-bid.
 */
export function calculateCpm(
  campaign: RtbCampaign,
  floorCpm: number
): number | null {
  if (campaign.max_cpm > floorCpm) {
    return campaign.max_cpm;
  }
  return null;
}

/**
 * Selects the best bid from eligible active campaigns.
 * Returns the campaign + CPM, or null if no campaign is eligible.
 *
 * context.todaySpend: Map<campaignId, spendSoFarToday>
 * context.impressionCounts: Map<campaignId+userId, impressionCount>
 */
export function selectBid(
  campaigns: RtbCampaign[],
  request: OpenRtbBidRequest,
  context: {
    todaySpend: Map<string, number>;
    impressionCounts: Map<string, number>;
  }
): { campaign: RtbCampaign; cpm: number } | null {
  const floorCpm = request.imp[0]?.bidfloor ?? 0;
  const userId = request.user?.id ?? "";

  let best: { campaign: RtbCampaign; cpm: number } | null = null;

  for (const campaign of campaigns) {
    if (campaign.status !== "active") continue;

    const todaySpend = context.todaySpend.get(campaign.id) ?? 0;
    if (!checkPacing(campaign, todaySpend)) continue;

    const impressionKey = campaign.id + userId;
    const impressionCount = context.impressionCounts.get(impressionKey) ?? 0;
    if (!checkFrequencyCap(campaign, impressionCount)) continue;

    const cpm = calculateCpm(campaign, floorCpm);
    if (cpm === null) continue;

    if (best === null || cpm > best.cpm) {
      best = { campaign, cpm };
    }
  }

  return best;
}

/**
 * Builds an OpenRTB 2.6 BidResponse from a selected bid.
 * Returns a no-bid response (empty seatbid) if bid is null.
 */
export function buildBidResponse(
  requestId: string,
  impId: string,
  bid: { campaign: RtbCampaign; cpm: number } | null
): OpenRtbBidResponse {
  if (bid === null) {
    return { id: requestId, seatbid: [] };
  }

  return {
    id: requestId,
    seatbid: [
      {
        bid: [
          {
            id: `bid_${requestId}`,
            impid: impId,
            price: bid.cpm,
            adid: bid.campaign.id,
            crid: bid.campaign.creative_id ?? undefined,
          },
        ],
        seat: bid.campaign.workspace_id,
      },
    ],
    cur: "BRL",
  };
}
