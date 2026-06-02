/**
 * TikTok Ads API client wrapper.
 * Docs: https://ads.tiktok.com/marketing_api/docs
 * API version: v1.3
 *
 * TODO(M2-backend): replace stub with real TikTok Ads API calls once
 * TIKTOK_ACCESS_TOKEN and TIKTOK_ADVERTISER_ID are configured.
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";

async function getTikTokCredentials(organizationId: string) {
  const [token, advertiserId] = await Promise.all([
    getCredentialField(organizationId, "tiktok", "access_token", "TIKTOK_ACCESS_TOKEN"),
    getCredentialField(organizationId, "tiktok", "advertiser_id", "TIKTOK_ADVERTISER_ID"),
  ]);
  if (!token) throw new Error("TikTok Access Token não configurado. Configure em Settings → Integrações.");
  if (!advertiserId) throw new Error("TikTok Advertiser ID não configurado. Configure em Settings → Integrações.");
  return { token, advertiserId };
}

function mapObjective(objective: CampaignObjective): string {
  const map: Record<CampaignObjective, string> = {
    awareness: "REACH",
    traffic: "TRAFFIC",
    engagement: "VIDEO_VIEWS",
    leads: "LEAD_GENERATION",
    sales: "CONVERSIONS",
    app_promotion: "APP_INSTALL",
  };
  return map[objective] ?? "REACH";
}

function mapStatus(status: CampaignStatus): string {
  return status === "active" ? "ENABLE" : "DISABLE";
}

export type TikTokCampaignInput = {
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  dailyBudget?: number;
  lifetimeBudget?: number | null;
  startDate?: string;
  endDate?: string | null;
};

export async function listTikTokCampaigns(
  organizationId: string
): Promise<{ id: string; name: string; status: string; budget: number }[]> {
  const { token, advertiserId } = await getTikTokCredentials(organizationId);

  const params = new URLSearchParams({ advertiser_id: advertiserId });
  const res = await fetch(`${BASE_URL}/campaign/get/?${params}`, {
    headers: { "Access-Token": token },
  });

  if (!res.ok) {
    throw new Error(`TikTok listCampaigns error: ${res.status}`);
  }

  const json = await res.json();
  return (json.data?.list ?? []).map((c: Record<string, unknown>) => ({
    id: String(c.campaign_id),
    name: String(c.campaign_name),
    status: String(c.status),
    budget: Number(c.budget),
  }));
}

export async function createTikTokCampaign(
  organizationId: string,
  input: TikTokCampaignInput
): Promise<string> {
  const { token, advertiserId } = await getTikTokCredentials(organizationId);

  const body: Record<string, unknown> = {
    advertiser_id: advertiserId,
    campaign_name: input.name,
    objective_type: mapObjective(input.objective),
    operation_status: mapStatus(input.status),
  };

  if (input.dailyBudget) {
    body.budget_mode = "BUDGET_MODE_DAY";
    body.budget = input.dailyBudget;
  } else if (input.lifetimeBudget) {
    body.budget_mode = "BUDGET_MODE_TOTAL";
    body.budget = input.lifetimeBudget;
  }

  const res = await fetch(`${BASE_URL}/campaign/create/`, {
    method: "POST",
    headers: {
      "Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok createCampaign error: ${res.status} ${err}`);
  }

  const json = await res.json();
  return String(json.data.campaign_id);
}

export async function updateTikTokCampaign(
  organizationId: string,
  campaignId: string,
  updates: { status?: CampaignStatus; dailyBudget?: number }
): Promise<void> {
  const { token, advertiserId } = await getTikTokCredentials(organizationId);

  const body: Record<string, unknown> = {
    advertiser_id: advertiserId,
    campaign_id: campaignId,
  };

  if (updates.status) body.operation_status = mapStatus(updates.status);
  if (updates.dailyBudget) {
    body.budget_mode = "BUDGET_MODE_DAY";
    body.budget = updates.dailyBudget;
  }

  const res = await fetch(`${BASE_URL}/campaign/update/`, {
    method: "POST",
    headers: {
      "Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok updateCampaign error: ${res.status} ${err}`);
  }
}

export async function getTikTokCampaignInsights(
  organizationId: string,
  campaignId: string
): Promise<{ spend: number; impressions: number; clicks: number; conversions: number }> {
  const { token, advertiserId } = await getTikTokCredentials(organizationId);

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: "BASIC",
    dimensions: JSON.stringify(["campaign_id"]),
    metrics: JSON.stringify(["spend", "impressions", "clicks", "conversions"]),
    start_date: startDate,
    end_date: endDate,
    filtering: JSON.stringify([{ field_name: "campaign_id", filter_type: "IN", filter_value: JSON.stringify([campaignId]) }]),
  });

  const res = await fetch(`${BASE_URL}/report/integrated/get/?${params}`, {
    headers: { "Access-Token": token },
  });

  if (!res.ok) return { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

  const json = await res.json();
  const row = json.data?.list?.[0]?.metrics ?? {};
  return {
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: Number(row.conversions ?? 0),
  };
}
