/**
 * TikTok Ads API client wrapper — real implementation.
 * Docs: https://ads.tiktok.com/marketing_api/docs
 * API version: v1.3
 *
 * Credentials are resolved per-org from `org_api_credentials` via
 * `getTikTokCredentials()`. Env-var fallbacks (TIKTOK_ACCESS_TOKEN,
 * TIKTOK_ADVERTISER_ID) are handled inside `getCredentialField` and are NOT
 * read directly in this module.
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

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

type TikTokPageInfo = {
  page: number;
  total_number: number;
  has_more: boolean;
};

type TikTokListResponse = {
  data?: {
    list?: Record<string, unknown>[];
    page_info?: TikTokPageInfo;
  };
};

const TIKTOK_PAGE_SIZE = 20;
const TIKTOK_SAFETY_LIMIT = 1000;

export async function listTikTokCampaigns(
  organizationId: string
): Promise<{ id: string; name: string; status: string; budget: number }[]> {
  const { token, advertiserId } = await getTikTokCredentials(organizationId);

  const accumulated: Record<string, unknown>[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      page: String(page),
      page_size: String(TIKTOK_PAGE_SIZE),
    });

    const res = await fetchWithRetry(`${BASE_URL}/campaign/get/?${params}`, {
      headers: { "Access-Token": token },
    });

    if (!res.ok) {
      throw new Error(`TikTok listCampaigns error: ${res.status}`);
    }

    const json = (await res.json()) as TikTokListResponse;
    const list = json.data?.list ?? [];
    accumulated.push(...list);

    if (!json.data?.page_info?.has_more) break;
    if (accumulated.length >= TIKTOK_SAFETY_LIMIT) break;

    page++;
  }

  return accumulated.map((c) => ({
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

  const res = await fetchWithRetry(`${BASE_URL}/campaign/create/`, {
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

  const res = await fetchWithRetry(`${BASE_URL}/campaign/update/`, {
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

/**
 * Fetch insights for multiple campaigns in a single API call.
 * TikTok's report endpoint supports filtering by a list of campaign IDs via
 * filter_type: "IN", so we can batch all IDs into one request instead of
 * one request per campaign.
 * Returns a Record keyed by campaign_id string.
 */
export async function getTikTokBatchInsights(
  organizationId: string,
  campaignIds: string[]
): Promise<Record<string, { spend: number; impressions: number; clicks: number; conversions: number }>> {
  if (campaignIds.length === 0) return {};

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
    filtering: JSON.stringify([
      {
        field_name: "campaign_id",
        filter_type: "IN",
        filter_value: JSON.stringify(campaignIds),
      },
    ]),
    page_size: "1000",
  });

  const res = await fetchWithRetry(`${BASE_URL}/report/integrated/get/?${params}`, {
    headers: { "Access-Token": token },
  });

  if (!res.ok) return {};

  const json = await res.json();
  const list: Record<string, unknown>[] = (json.data?.list as Record<string, unknown>[] | undefined) ?? [];

  const result: Record<string, { spend: number; impressions: number; clicks: number; conversions: number }> = {};
  for (const row of list) {
    const dimensions = row.dimensions as Record<string, unknown> | undefined;
    const metrics = row.metrics as Record<string, unknown> | undefined;
    const id = String(dimensions?.campaign_id ?? "");
    if (!id) continue;
    result[id] = {
      spend: Number(metrics?.spend ?? 0),
      impressions: Number(metrics?.impressions ?? 0),
      clicks: Number(metrics?.clicks ?? 0),
      conversions: Number(metrics?.conversions ?? 0),
    };
  }
  return result;
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

  const res = await fetchWithRetry(`${BASE_URL}/report/integrated/get/?${params}`, {
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
