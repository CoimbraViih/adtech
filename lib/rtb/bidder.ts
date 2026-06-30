import type {
  RtbCampaign,
  OpenRtbBidRequest,
  OpenRtbBidResponse,
  PmpDeal,
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
 * Returns the campaign + CPM + optional dealid, or null if no campaign is eligible.
 *
 * context.todaySpend: Map<campaignId, spendSoFarToday>
 * context.impressionCounts: Map<campaignId+userId, impressionCount>
 * deals: active PmpDeal records for deal validation and guaranteed pricing
 */
export function selectBid(
  campaigns: RtbCampaign[],
  request: OpenRtbBidRequest,
  context: {
    todaySpend: Map<string, number>;
    impressionCounts: Map<string, number>;
  },
  deals: PmpDeal[] = []
): { campaign: RtbCampaign; cpm: number; dealid?: string } | null {
  const imp = request.imp[0];
  const floorCpm = imp?.bidfloor ?? 0;
  const userId = request.user?.id ?? "";

  // Build a set of deal IDs present in the impression's pmp.deals for fast lookup
  const impDealIds = new Set<string>(
    imp?.pmp?.deals?.map((d) => d.id) ?? []
  );
  const isPrivateAuction = imp?.pmp?.private_auction === 1;

  let best: { campaign: RtbCampaign; cpm: number; dealid?: string } | null = null;

  for (const campaign of campaigns) {
    if (campaign.status !== "active") continue;

    // Change 2: Private auction filtering
    if (isPrivateAuction) {
      if (!campaign.deal_id || !impDealIds.has(campaign.deal_id)) continue;
    }

    const todaySpend = context.todaySpend.get(campaign.id) ?? 0;
    if (!checkPacing(campaign, todaySpend)) continue;

    const impressionKey = campaign.id + userId;
    const impressionCount = context.impressionCounts.get(impressionKey) ?? 0;
    if (!checkFrequencyCap(campaign, impressionCount)) continue;

    // Change 3: Guaranteed bypass — skip CPM comparison, return immediately
    if (campaign.deal_type === "guaranteed") {
      const matchingDeal = deals.find((d) => d.deal_id === campaign.deal_id);
      if (!matchingDeal) continue; // can't guarantee without deal record
      return { campaign, cpm: matchingDeal.floor_price, dealid: matchingDeal.deal_id };
    }

    const cpm = calculateCpm(campaign, floorCpm);
    if (cpm === null) continue;

    // Change 4: Include dealid for deal wins in regular auction path
    if (best === null || cpm > best.cpm) {
      best = {
        campaign,
        cpm,
        ...(campaign.deal_id ? { dealid: campaign.deal_id } : {}),
      };
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
  bid: { campaign: RtbCampaign; cpm: number; dealid?: string } | null
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
            dealid: bid.dealid, // Change 5: propagate dealid
          },
        ],
        seat: bid.campaign.workspace_id,
      },
    ],
    cur: "BRL",
  };
}
