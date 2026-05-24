import type { OpenRtbBidRequest } from "@/types/database";

const SAMPLE_DOMAINS = [
  "globo.com",
  "uol.com.br",
  "terra.com.br",
  "ig.com.br",
  "r7.com",
  "folha.uol.com.br",
  "estadao.com.br",
  "veja.abril.com.br",
];

const SAMPLE_USER_IDS = [
  "usr_a1b2c3",
  "usr_d4e5f6",
  "usr_g7h8i9",
  "usr_j1k2l3",
  "usr_m4n5o6",
];

/**
 * Generates a single valid OpenRTB 2.6 BidRequest.
 */
export function generateBidRequest(opts?: {
  domain?: string;
  userId?: string;
  floorCpm?: number;
  impId?: string;
}): OpenRtbBidRequest {
  const now = Date.now();
  const domain = opts?.domain ?? SAMPLE_DOMAINS[now % SAMPLE_DOMAINS.length];
  const userId = opts?.userId ?? SAMPLE_USER_IDS[now % SAMPLE_USER_IDS.length];
  const floorCpm = opts?.floorCpm ?? 2.5;
  const impId = opts?.impId ?? "imp_1";
  const auctionId = `auction_${now}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: auctionId,
    imp: [
      {
        id: impId,
        banner: { w: 300, h: 250 },
        bidfloor: floorCpm,
        bidfloorcur: "BRL",
      },
    ],
    site: {
      domain,
      page: `https://${domain}/`,
    },
    user: { id: userId },
    at: 1,
    tmax: 100,
  };
}

/**
 * Generates a batch of BidRequests for load testing / demo.
 */
export function generateBidRequestBatch(count: number): OpenRtbBidRequest[] {
  return Array.from({ length: count }, () => generateBidRequest());
}
