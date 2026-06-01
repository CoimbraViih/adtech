import { MOCK_CAMPAIGNS } from "@/lib/campaigns/mock-data";
import { MOCK_CREATIVES } from "@/lib/creatives/mock-data";

export type DayPoint = { date: string; value: number };
export type DualDayPoint = { date: string; primary: number; secondary: number };

export type DashboardKpis = {
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  conversions: number;
  ctr: number;
};

export type CampaignStatusCounts = {
  active: number;
  paused: number;
  draft: number;
  archived: number;
};

export type TopCampaign = {
  id: string;
  name: string;
  platform: string;
  roas: number;
  spend: number;
  conversions: number;
  status: string;
};

// Generates evenly-spaced ISO date strings between from and to (inclusive)
function dateRange(from: string, to: string): string[] {
  const start = new Date(from);
  const end = new Date(to);
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Deterministic pseudo-random based on date string seed
function seeded(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const t = ((h >>> 0) / 0xffffffff);
  return min + t * (max - min);
}

export function getDashboardKpis(): DashboardKpis {
  const spend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const revenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const conversions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const clicks = MOCK_CAMPAIGNS.reduce((s, c) => s + c.clicks, 0);
  const impressions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);
  return {
    spend,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    conversions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

// Returns KPI delta % vs previous period (mock: fixed plausible deltas)
export function getKpiDeltas(): DashboardKpis {
  return {
    spend: 5.4,
    revenue: 12.1,
    roas: 6.3,
    cpa: -4.2,
    conversions: 8.7,
    ctr: 1.9,
  };
}

export function getCampaignStatusCounts(): CampaignStatusCounts {
  return {
    active: MOCK_CAMPAIGNS.filter((c) => c.status === "active").length,
    paused: MOCK_CAMPAIGNS.filter((c) => c.status === "paused").length,
    draft: MOCK_CAMPAIGNS.filter((c) => c.status === "draft").length,
    archived: MOCK_CAMPAIGNS.filter((c) => c.status === "archived").length,
  };
}

export function getTopCampaigns(n = 5): TopCampaign[] {
  return [...MOCK_CAMPAIGNS]
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
    .slice(0, n)
    .map((c) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      roas: c.roas ?? 0,
      spend: c.spend,
      conversions: c.conversions,
      status: c.status,
    }));
}

export function getRevenueByDay(from: string, to: string): DayPoint[] {
  const days = dateRange(from, to);
  const totalRevenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const base = totalRevenue / Math.max(days.length, 1);
  return days.map((date) => ({
    date,
    value: Math.round(seeded(date + "rev", base * 0.6, base * 1.4)),
  }));
}

export function getRoasAndSpendByDay(from: string, to: string): DualDayPoint[] {
  const days = dateRange(from, to);
  const totalSpend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const avgRoas = MOCK_CAMPAIGNS.reduce((s, c) => s + (c.roas ?? 0), 0) / MOCK_CAMPAIGNS.length;
  const baseSpend = totalSpend / Math.max(days.length, 1);
  return days.map((date) => ({
    date,
    primary: Math.round(seeded(date + "roas", avgRoas * 0.7, avgRoas * 1.3) * 100) / 100,
    secondary: Math.round(seeded(date + "spend", baseSpend * 0.6, baseSpend * 1.4)),
  }));
}

export function getImpressionsAndConversionsByDay(from: string, to: string): DualDayPoint[] {
  const days = dateRange(from, to);
  const totalImpressions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);
  const totalConversions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const baseImp = totalImpressions / Math.max(days.length, 1);
  const baseConv = totalConversions / Math.max(days.length, 1);
  return days.map((date) => ({
    date,
    primary: Math.round(seeded(date + "imp", baseImp * 0.6, baseImp * 1.4)),
    secondary: Math.round(seeded(date + "conv", baseConv * 0.5, baseConv * 1.5)),
  }));
}

export type CampaignAlert = {
  campaignId: string;
  campaignName: string;
  platform: string;
  worstSeverity: "critical" | "warning";
  worstTitle: string;
  worstDescription: string;
  suggestedAction: string;
  openCount: number;
};

// TODO(M2-backend): replace with Supabase join on ai_diagnostics WHERE status = 'open'
export function getCampaignAlerts(): CampaignAlert[] {
  return [
    {
      campaignId: "cmp_001",
      campaignName: "Black Friday 2025 — Meta",
      platform: "meta",
      worstSeverity: "critical",
      worstTitle: "Gasto sem conversão detectado",
      worstDescription: "R$ 450 investidos nos últimos 7 dias sem nenhuma conversão registrada — 3× o CPA-alvo definido para esta campanha.",
      suggestedAction: "Pausar os conjuntos de anúncios com menor CTR e revisar o público-alvo antes de retomar o investimento.",
      openCount: 2,
    },
    {
      campaignId: "cmp_002",
      campaignName: "Google Search — Marca",
      platform: "google",
      worstSeverity: "warning",
      worstTitle: "Fase de aprendizado ativa",
      worstDescription: "A campanha acumulou apenas 12 conversões desde a última alteração de lance — abaixo das 50 necessárias para sair da fase de aprendizado.",
      suggestedAction: "Evite editar orçamento ou segmentação até atingir 50 conversões. Considere ampliar o público temporariamente.",
      openCount: 1,
    },
  ];
}

export function getCreativesSummary() {
  const copies = MOCK_CREATIVES.filter((c) => c.type === "copy");
  const scores = copies.map((c) => c.score).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return {
    total: copies.length,
    approved: copies.filter((c) => c.status === "approved").length,
    avgScore: avgScore ? Math.round(avgScore) : null,
  };
}
