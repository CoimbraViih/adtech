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
