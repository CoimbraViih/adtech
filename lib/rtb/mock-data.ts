import type {
  RtbCampaign,
  Audience,
  BidRequestLog,
} from "@/types/database";

// ─── RTB Campaigns ────────────────────────────────────────────────────────────

export const MOCK_RTB_CAMPAIGNS: RtbCampaign[] = [
  {
    id: "rtb_001",
    workspace_id: "ws_demo",
    campaign_id: "cmp_005",
    name: "Awareness Branding — Open Market",
    status: "active",
    deal_type: "open",
    deal_id: null,
    floor_cpm: 2.5,
    max_cpm: 18.0,
    daily_budget: 800.0,
    total_budget: 24000.0,
    pacing: "even",
    frequency_cap: 3,
    frequency_cap_hours: 24,
    creative_id: null,
    audience_id: "aud_001",
    targeting: {
      geos: ["BR-SP", "BR-RJ", "BR-MG"],
      formats: ["banner_300x250", "banner_728x90"],
      verticals: ["news", "finance", "sports"],
    },
    start_date: "2026-05-01",
    end_date: "2026-05-31",
    impressions: 1_842_300,
    wins: 736_920,
    spend: 9418.4,
    win_rate: 0.4,
    avg_cpm: 12.78,
    created_at: "2026-04-25T10:00:00Z",
    updated_at: "2026-05-23T08:00:00Z",
  },
  {
    id: "rtb_002",
    workspace_id: "ws_demo",
    campaign_id: null,
    name: "Retargeting Premium — Deal Privado Globo",
    status: "paused",
    deal_type: "private",
    deal_id: "deal_globo_rtb_2026",
    floor_cpm: 8.0,
    max_cpm: 35.0,
    daily_budget: 1200.0,
    total_budget: null,
    pacing: "even",
    frequency_cap: 5,
    frequency_cap_hours: 48,
    creative_id: null,
    audience_id: "aud_002",
    targeting: {
      geos: ["BR-SP"],
      formats: ["banner_970x250", "banner_300x600"],
      deal_ids: ["deal_globo_rtb_2026"],
    },
    start_date: "2026-04-10",
    end_date: null,
    impressions: 520_000,
    wins: 364_000,
    spend: 8736.0,
    win_rate: 0.7,
    avg_cpm: 24.0,
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-05-15T14:00:00Z",
  },
  {
    id: "rtb_003",
    workspace_id: "ws_demo",
    campaign_id: null,
    name: "Prospecting — Preferencial UOL",
    status: "draft",
    deal_type: "preferred",
    deal_id: "deal_uol_preferred_q2",
    floor_cpm: 5.0,
    max_cpm: 22.0,
    daily_budget: 600.0,
    total_budget: 18000.0,
    pacing: "asap",
    frequency_cap: 4,
    frequency_cap_hours: 24,
    creative_id: null,
    audience_id: "aud_003",
    targeting: {
      geos: ["BR-SP", "BR-RJ", "BR-PR", "BR-RS"],
      formats: ["banner_300x250", "banner_320x50"],
      deal_ids: ["deal_uol_preferred_q2"],
    },
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    impressions: 0,
    wins: 0,
    spend: 0,
    win_rate: null,
    avg_cpm: null,
    created_at: "2026-05-20T11:00:00Z",
    updated_at: "2026-05-20T11:00:00Z",
  },
  {
    id: "rtb_004",
    workspace_id: "ws_demo",
    campaign_id: "cmp_006",
    name: "Imóveis SP — Open Q1 2026",
    status: "archived",
    deal_type: "open",
    deal_id: null,
    floor_cpm: 3.0,
    max_cpm: 20.0,
    daily_budget: 500.0,
    total_budget: 15000.0,
    pacing: "even",
    frequency_cap: 3,
    frequency_cap_hours: 24,
    creative_id: null,
    audience_id: "aud_004",
    targeting: {
      geos: ["BR-SP"],
      formats: ["banner_300x250", "banner_728x90"],
      verticals: ["real_estate", "finance"],
    },
    start_date: "2026-01-15",
    end_date: "2026-03-31",
    impressions: 3_210_000,
    wins: 963_000,
    spend: 14_234.7,
    win_rate: 0.3,
    avg_cpm: 14.78,
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

// ─── Audiences (DMP) ──────────────────────────────────────────────────────────

export const MOCK_AUDIENCES: Audience[] = [
  {
    id: "aud_001",
    workspace_id: "ws_demo",
    name: "Visitantes Recentes — 30 dias",
    type: "behavioral",
    description: "Usuários que visitaram o site nos últimos 30 dias",
    rules: [
      {
        event_type: "page_view",
        operator: "gte",
        value: 1,
        lookback_days: 30,
      },
    ],
    lookalike_source_id: null,
    size_estimate: 124_500,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-05-23T06:00:00Z",
  },
  {
    id: "aud_002",
    workspace_id: "ws_demo",
    name: "Carrinhos Abandonados — 7 dias",
    type: "behavioral",
    description: "Usuários que adicionaram ao carrinho mas não compraram nos últimos 7 dias",
    rules: [
      {
        event_type: "add_to_cart",
        operator: "gte",
        value: 1,
        lookback_days: 7,
      },
      {
        event_type: "purchase",
        operator: "eq",
        value: 0,
        lookback_days: 7,
      },
    ],
    lookalike_source_id: null,
    size_estimate: 18_720,
    created_at: "2026-04-05T11:00:00Z",
    updated_at: "2026-05-23T06:00:00Z",
  },
  {
    id: "aud_003",
    workspace_id: "ws_demo",
    name: "Lookalike Compradores 1%",
    type: "lookalike",
    description: "Similar aos compradores dos últimos 90 dias — alcance 1%",
    rules: [],
    lookalike_source_id: "aud_005",
    size_estimate: 890_000,
    created_at: "2026-04-10T09:00:00Z",
    updated_at: "2026-05-10T08:00:00Z",
  },
  {
    id: "aud_004",
    workspace_id: "ws_demo",
    name: "Leads Qualificados — Imóveis",
    type: "custom",
    description: "Lista de leads importados da campanha de imóveis SP",
    rules: [],
    lookalike_source_id: null,
    size_estimate: 4_320,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "aud_005",
    workspace_id: "ws_demo",
    name: "Compradores 90 dias",
    type: "custom",
    description: "Clientes que realizaram uma compra nos últimos 90 dias",
    rules: [
      {
        event_type: "purchase",
        operator: "gte",
        value: 1,
        lookback_days: 90,
      },
    ],
    lookalike_source_id: null,
    size_estimate: 8_940,
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-05-23T06:00:00Z",
  },
];

// ─── Bid Request Log ──────────────────────────────────────────────────────────

const BID_LOG_ROWS: Array<{
  id: string;
  rtb_campaign_id: string;
  ssp_id: string;
  auction_id: string;
  user_id_hash: string | null;
  domain: string;
  floor_cpm: number;
  bid_cpm: number | null;
  outcome: "win" | "loss" | "no_bid" | "error";
  response_ms: number;
  created_at: string;
}> = [
  { id: "bid_001", rtb_campaign_id: "rtb_001", ssp_id: "openx", auction_id: "auc_a1b2c3", user_id_hash: "h1a2b3c4d5", domain: "globo.com", floor_cpm: 3.0, bid_cpm: 14.2, outcome: "win", response_ms: 42, created_at: "2026-05-23T14:00:01Z" },
  { id: "bid_002", rtb_campaign_id: "rtb_001", ssp_id: "appnexus", auction_id: "auc_d4e5f6", user_id_hash: "h6d7e8f9a0", domain: "uol.com.br", floor_cpm: 2.5, bid_cpm: 11.5, outcome: "loss", response_ms: 55, created_at: "2026-05-23T14:00:08Z" },
  { id: "bid_003", rtb_campaign_id: "rtb_001", ssp_id: "rubicon", auction_id: "auc_g7h8i9", user_id_hash: null, domain: "folha.uol.com.br", floor_cpm: 4.0, bid_cpm: null, outcome: "no_bid", response_ms: 18, created_at: "2026-05-23T14:00:15Z" },
  { id: "bid_004", rtb_campaign_id: "rtb_002", ssp_id: "openx", auction_id: "auc_j0k1l2", user_id_hash: "hb1c2d3e4f", domain: "globo.com", floor_cpm: 8.0, bid_cpm: 28.5, outcome: "win", response_ms: 38, created_at: "2026-05-23T13:59:50Z" },
  { id: "bid_005", rtb_campaign_id: "rtb_002", ssp_id: "openx", auction_id: "auc_m3n4o5", user_id_hash: "h5a6b7c8d9", domain: "globo.com", floor_cpm: 8.0, bid_cpm: 31.0, outcome: "win", response_ms: 45, created_at: "2026-05-23T13:59:42Z" },
  { id: "bid_006", rtb_campaign_id: "rtb_001", ssp_id: "pubmatic", auction_id: "auc_p6q7r8", user_id_hash: "he0f1a2b3c", domain: "r7.com", floor_cpm: 2.0, bid_cpm: 13.8, outcome: "win", response_ms: 61, created_at: "2026-05-23T13:59:35Z" },
  { id: "bid_007", rtb_campaign_id: "rtb_001", ssp_id: "appnexus", auction_id: "auc_s9t0u1", user_id_hash: "h4d5e6f7a8", domain: "terra.com.br", floor_cpm: 3.5, bid_cpm: 9.2, outcome: "loss", response_ms: 72, created_at: "2026-05-23T13:59:28Z" },
  { id: "bid_008", rtb_campaign_id: "rtb_002", ssp_id: "rubicon", auction_id: "auc_v2w3x4", user_id_hash: "hb9c0d1e2f", domain: "g1.globo.com", floor_cpm: 9.0, bid_cpm: 33.2, outcome: "win", response_ms: 35, created_at: "2026-05-23T13:59:20Z" },
  { id: "bid_009", rtb_campaign_id: "rtb_001", ssp_id: "pubmatic", auction_id: "auc_y5z6a7", user_id_hash: null, domain: "msn.com", floor_cpm: 1.5, bid_cpm: null, outcome: "no_bid", response_ms: 22, created_at: "2026-05-23T13:59:12Z" },
  { id: "bid_010", rtb_campaign_id: "rtb_001", ssp_id: "openx", auction_id: "auc_b8c9d0", user_id_hash: "h3e4f5a6b7", domain: "ig.com.br", floor_cpm: 2.8, bid_cpm: 15.6, outcome: "win", response_ms: 48, created_at: "2026-05-23T13:59:05Z" },
  { id: "bid_011", rtb_campaign_id: "rtb_002", ssp_id: "appnexus", auction_id: "auc_e1f2g3", user_id_hash: "hc8d9e0f1a", domain: "globo.com", floor_cpm: 8.5, bid_cpm: 29.0, outcome: "win", response_ms: 52, created_at: "2026-05-23T13:58:58Z" },
  { id: "bid_012", rtb_campaign_id: "rtb_001", ssp_id: "rubicon", auction_id: "auc_h4i5j6", user_id_hash: "h2b3c4d5e6", domain: "band.uol.com.br", floor_cpm: 3.2, bid_cpm: 10.4, outcome: "loss", response_ms: 88, created_at: "2026-05-23T13:58:50Z" },
  { id: "bid_013", rtb_campaign_id: "rtb_001", ssp_id: "pubmatic", auction_id: "auc_k7l8m9", user_id_hash: "hf1a2b3c4d", domain: "estadao.com.br", floor_cpm: 4.5, bid_cpm: 16.8, outcome: "win", response_ms: 33, created_at: "2026-05-23T13:58:42Z" },
  { id: "bid_014", rtb_campaign_id: "rtb_001", ssp_id: "openx", auction_id: "auc_n0o1p2", user_id_hash: null, domain: "olx.com.br", floor_cpm: 2.0, bid_cpm: null, outcome: "error", response_ms: 95, created_at: "2026-05-23T13:58:35Z" },
  { id: "bid_015", rtb_campaign_id: "rtb_002", ssp_id: "openx", auction_id: "auc_q3r4s5", user_id_hash: "h5e6f7a8b9", domain: "globo.com", floor_cpm: 8.0, bid_cpm: 30.5, outcome: "win", response_ms: 40, created_at: "2026-05-23T13:58:28Z" },
  { id: "bid_016", rtb_campaign_id: "rtb_001", ssp_id: "appnexus", auction_id: "auc_t6u7v8", user_id_hash: "hc0d1e2f3a", domain: "uol.com.br", floor_cpm: 2.5, bid_cpm: 12.1, outcome: "loss", response_ms: 67, created_at: "2026-05-23T13:58:20Z" },
  { id: "bid_017", rtb_campaign_id: "rtb_001", ssp_id: "pubmatic", auction_id: "auc_w9x0y1", user_id_hash: "h4b5c6d7e8", domain: "veja.abril.com.br", floor_cpm: 5.0, bid_cpm: 17.3, outcome: "win", response_ms: 29, created_at: "2026-05-23T13:58:12Z" },
  { id: "bid_018", rtb_campaign_id: "rtb_002", ssp_id: "rubicon", auction_id: "auc_z2a3b4", user_id_hash: "hf9a0b1c2d", domain: "g1.globo.com", floor_cpm: 9.0, bid_cpm: 32.0, outcome: "win", response_ms: 44, created_at: "2026-05-23T13:58:05Z" },
  { id: "bid_019", rtb_campaign_id: "rtb_001", ssp_id: "rubicon", auction_id: "auc_c5d6e7", user_id_hash: null, domain: "correio24horas.com.br", floor_cpm: 1.8, bid_cpm: null, outcome: "no_bid", response_ms: 15, created_at: "2026-05-23T13:57:58Z" },
  { id: "bid_020", rtb_campaign_id: "rtb_001", ssp_id: "openx", auction_id: "auc_f8g9h0", user_id_hash: "h3e4f5a6b7", domain: "superinteressante.abril.com.br", floor_cpm: 3.0, bid_cpm: 13.4, outcome: "win", response_ms: 57, created_at: "2026-05-23T13:57:50Z" },
];

export const MOCK_BID_LOG: BidRequestLog[] = BID_LOG_ROWS.map((row) => ({
  id: row.id,
  workspace_id: "ws_demo",
  rtb_campaign_id: row.rtb_campaign_id,
  ssp_id: row.ssp_id,
  auction_id: row.auction_id,
  user_id_hash: row.user_id_hash,
  domain: row.domain,
  floor_cpm: row.floor_cpm,
  bid_cpm: row.bid_cpm,
  outcome: row.outcome,
  response_ms: row.response_ms,
  created_at: row.created_at,
}));

// ─── KPI Aggregates ───────────────────────────────────────────────────────────

type RtbKpis = {
  totalBids: number;
  wins: number;
  winRate: number;
  avgCpm: number;
  totalSpend: number;
  impressions: number;
};

export function getMockRtbKpis(workspaceId: string): RtbKpis {
  // workspaceId param reserved for future Supabase swap-in
  // TODO(M8-backend): filter by workspaceId from rtb_campaigns + bid_requests_log
  void workspaceId;

  const activeCampaigns = MOCK_RTB_CAMPAIGNS.filter(
    (c) => c.status === "active" || c.status === "paused"
  );

  const totalBids = MOCK_BID_LOG.length;
  const wins = MOCK_BID_LOG.filter((b) => b.outcome === "win").length;
  const winRate = totalBids > 0 ? wins / totalBids : 0;

  const winBids = MOCK_BID_LOG.filter(
    (b) => b.outcome === "win" && b.bid_cpm !== null
  );
  const avgCpm =
    winBids.length > 0
      ? winBids.reduce((acc, b) => acc + (b.bid_cpm ?? 0), 0) / winBids.length
      : 0;

  const totalSpend = activeCampaigns.reduce((acc, c) => acc + c.spend, 0);
  const impressions = activeCampaigns.reduce((acc, c) => acc + c.impressions, 0);

  return {
    totalBids,
    wins,
    winRate: +winRate.toFixed(4),
    avgCpm: +avgCpm.toFixed(4),
    totalSpend: +totalSpend.toFixed(2),
    impressions,
  };
}

// ─── Bid Landscape Histogram ──────────────────────────────────────────────────

type BidBucket = { cpm: number; count: number };

// Deterministic histogram seeded from campaignId string
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getMockBidLandscape(campaignId: string): BidBucket[] {
  const seed = seedFromId(campaignId);
  // 10 CPM buckets from R$2 to R$38 in ~4 BRL increments
  const buckets: BidBucket[] = [
    { cpm: 2, count: 0 },
    { cpm: 6, count: 0 },
    { cpm: 10, count: 0 },
    { cpm: 14, count: 0 },
    { cpm: 18, count: 0 },
    { cpm: 22, count: 0 },
    { cpm: 26, count: 0 },
    { cpm: 30, count: 0 },
    { cpm: 34, count: 0 },
    { cpm: 38, count: 0 },
  ];

  // Fill counts deterministically using the seed
  const peaks = [
    (seed % 3) + 2,        // primary peak bucket index (2–4)
    ((seed >> 4) % 3) + 5, // secondary peak (5–7)
  ];

  const baseCounts = [180, 320, 560, 740, 620, 480, 310, 190, 90, 40];

  return buckets.map((b, i) => {
    const boost = peaks.includes(i) ? 1 + ((seed >> (i * 2)) % 3) * 0.25 : 1;
    return { cpm: b.cpm, count: Math.round(baseCounts[i] * boost) };
  });
}

// ─── Win-Rate Time Series ─────────────────────────────────────────────────────

type WinRatePoint = { date: string; winRate: number; bids: number };

// Fixed 30-day win-rate series (deterministic, no Math.random)
const WIN_RATE_BASE: Array<{ winRate: number; bids: number }> = [
  { winRate: 0.38, bids: 4200 },
  { winRate: 0.40, bids: 4350 },
  { winRate: 0.37, bids: 4100 },
  { winRate: 0.41, bids: 4500 },
  { winRate: 0.43, bids: 4700 },
  { winRate: 0.39, bids: 4250 },
  { winRate: 0.42, bids: 4600 },
  { winRate: 0.44, bids: 4800 },
  { winRate: 0.36, bids: 4050 },
  { winRate: 0.38, bids: 4200 },
  { winRate: 0.41, bids: 4500 },
  { winRate: 0.45, bids: 4900 },
  { winRate: 0.43, bids: 4700 },
  { winRate: 0.40, bids: 4400 },
  { winRate: 0.38, bids: 4200 },
  { winRate: 0.42, bids: 4600 },
  { winRate: 0.46, bids: 5000 },
  { winRate: 0.44, bids: 4800 },
  { winRate: 0.41, bids: 4500 },
  { winRate: 0.39, bids: 4300 },
  { winRate: 0.43, bids: 4700 },
  { winRate: 0.45, bids: 4900 },
  { winRate: 0.47, bids: 5100 },
  { winRate: 0.44, bids: 4800 },
  { winRate: 0.42, bids: 4600 },
  { winRate: 0.40, bids: 4400 },
  { winRate: 0.43, bids: 4700 },
  { winRate: 0.46, bids: 5000 },
  { winRate: 0.48, bids: 5200 },
  { winRate: 0.45, bids: 4900 },
];

export function getMockWinRateTimeSeries(campaignId: string): WinRatePoint[] {
  // campaignId used to apply a deterministic offset so each campaign looks distinct
  // TODO(M8-backend): query bid_requests_log grouped by day for the given campaign
  const offset = seedFromId(campaignId) % 5;

  const today = new Date("2026-05-24T00:00:00Z");

  return WIN_RATE_BASE.map((row, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (29 - i));
    const dateStr = d.toISOString().slice(0, 10);

    // Shift win rate slightly per campaign for visual variety (deterministic)
    const adjustedWinRate = +(row.winRate + (offset - 2) * 0.01).toFixed(4);
    const adjustedBids = row.bids + (offset - 2) * 50;

    return {
      date: dateStr,
      winRate: adjustedWinRate,
      bids: adjustedBids,
    };
  });
}
