/**
 * LinkedIn Ads (Campaign Manager) API client wrapper.
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 * API version: v2 (Marketing Solutions)
 *
 * TODO(M2-backend): replace stub with real LinkedIn API calls once
 * LINKEDIN_ACCESS_TOKEN and LINKEDIN_AD_ACCOUNT_ID are configured.
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const BASE_URL = "https://api.linkedin.com/v2";

async function getLinkedInCredentials(organizationId: string) {
  const [token, accountId] = await Promise.all([
    getCredentialField(organizationId, "linkedin", "access_token", "LINKEDIN_ACCESS_TOKEN"),
    getCredentialField(organizationId, "linkedin", "account_id", "LINKEDIN_ACCOUNT_ID"),
  ]);
  return { token: token ?? "", accountId: accountId ?? "" };
}

function getAccessToken(override?: string) {
  return override ?? process.env.LINKEDIN_ACCESS_TOKEN ?? "";
}

function getAdAccountId(override?: string) {
  const raw = override ?? process.env.LINKEDIN_AD_ACCOUNT_ID ?? "";
  // LinkedIn uses URN format: urn:li:sponsoredAccount:<id>
  if (raw.startsWith("urn:")) return raw;
  return `urn:li:sponsoredAccount:${raw}`;
}

function mapObjective(objective: CampaignObjective): string {
  const map: Record<CampaignObjective, string> = {
    awareness: "BRAND_AWARENESS",
    traffic: "WEBSITE_VISITS",
    engagement: "ENGAGEMENT",
    leads: "LEAD_GENERATION",
    sales: "WEBSITE_CONVERSIONS",
    app_promotion: "APP_DOWNLOADS",
  };
  return map[objective] ?? "BRAND_AWARENESS";
}

function mapStatus(status: CampaignStatus): string {
  const map: Record<CampaignStatus, string> = {
    active: "ACTIVE",
    paused: "PAUSED",
    draft: "DRAFT",
    archived: "ARCHIVED",
  };
  return map[status] ?? "DRAFT";
}

export type LinkedInCampaignInput = {
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  dailyBudget?: number;
  lifetimeBudget?: number | null;
  startDate?: string;
  endDate?: string | null;
};

export async function listLinkedInCampaigns(
  organizationId: string,
  opts?: { accessToken?: string; adAccountId?: string }
): Promise<{ id: string; name: string; status: string; budget: number }[]> {
  const dbCreds = await getLinkedInCredentials(organizationId);
  const token = getAccessToken((opts?.accessToken ?? dbCreds.token) || undefined);
  const accountId = getAdAccountId((opts?.adAccountId ?? dbCreds.accountId) || undefined);

  if (!token || !accountId) return [];

  const params = new URLSearchParams({
    q: "search",
    "search.account.values[0]": accountId,
  });

  const res = await fetch(`${BASE_URL}/adCampaignsV2?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202401",
    },
  });

  if (!res.ok) {
    throw new Error(`LinkedIn listCampaigns error: ${res.status}`);
  }

  const json = await res.json();
  return (json.elements ?? []).map((c: Record<string, unknown>) => ({
    id: String((c.id as string).split(":").pop()),
    name: String(c.name),
    status: String(c.status),
    budget: Number((c.dailyBudget as Record<string, unknown>)?.amount ?? 0),
  }));
}

export async function createLinkedInCampaign(
  organizationId: string,
  input: LinkedInCampaignInput,
  opts?: { accessToken?: string; adAccountId?: string }
): Promise<string> {
  const dbCreds = await getLinkedInCredentials(organizationId);
  const token = getAccessToken((opts?.accessToken ?? dbCreds.token) || undefined);
  const accountId = getAdAccountId((opts?.adAccountId ?? dbCreds.accountId) || undefined);

  if (!token || !accountId) {
    throw new Error("LINKEDIN_ACCESS_TOKEN and LINKEDIN_AD_ACCOUNT_ID are required");
  }

  const body: Record<string, unknown> = {
    account: accountId,
    name: input.name,
    status: mapStatus(input.status),
    type: "SPONSORED_UPDATES",
    costType: "CPM",
    objectiveType: mapObjective(input.objective),
    locale: { country: "BR", language: "pt" },
  };

  if (input.dailyBudget) {
    body.dailyBudget = { currencyCode: "BRL", amount: String(input.dailyBudget) };
  }
  if (input.lifetimeBudget) {
    body.totalBudget = { currencyCode: "BRL", amount: String(input.lifetimeBudget) };
  }
  if (input.startDate) {
    const [y, m, d] = input.startDate.split("-").map(Number);
    body.runSchedule = { start: new Date(y, m - 1, d).getTime() };
    if (input.endDate) {
      const [ey, em, ed] = input.endDate.split("-").map(Number);
      (body.runSchedule as Record<string, unknown>).end = new Date(ey, em - 1, ed).getTime();
    }
  }

  const res = await fetch(`${BASE_URL}/adCampaignsV2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202401",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn createCampaign error: ${res.status} ${err}`);
  }

  const location = res.headers.get("x-restli-id") ?? res.headers.get("location") ?? "";
  const id = location.split(":").pop() ?? String(Date.now());
  return id;
}

export async function updateLinkedInCampaign(
  organizationId: string,
  campaignId: string,
  updates: { status?: CampaignStatus; dailyBudget?: number },
  opts?: { accessToken?: string; adAccountId?: string }
): Promise<void> {
  const dbCreds = await getLinkedInCredentials(organizationId);
  const token = getAccessToken((opts?.accessToken ?? dbCreds.token) || undefined);

  if (!token) {
    throw new Error("LINKEDIN_ACCESS_TOKEN is required");
  }

  const patch: Record<string, unknown> = {};
  if (updates.status) patch.status = mapStatus(updates.status);
  if (updates.dailyBudget) {
    patch.dailyBudget = { currencyCode: "BRL", amount: String(updates.dailyBudget) };
  }

  const res = await fetch(`${BASE_URL}/adCampaignsV2/${campaignId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202401",
      "Content-Type": "application/json",
      "X-RestLi-Method": "PARTIAL_UPDATE",
    },
    body: JSON.stringify({ patch: { "$set": patch } }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn updateCampaign error: ${res.status} ${err}`);
  }
}

export async function getLinkedInCampaignInsights(
  organizationId: string,
  campaignId: string,
  opts?: { accessToken?: string }
): Promise<{ spend: number; impressions: number; clicks: number; conversions: number }> {
  const dbCreds = await getLinkedInCredentials(organizationId);
  const token = getAccessToken((opts?.accessToken ?? dbCreds.token) || undefined);

  if (!token) return { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

  const endDate = new Date();
  const startDate = new Date(Date.now() - 30 * 86400000);

  const params = new URLSearchParams({
    q: "analytics",
    pivot: "CAMPAIGN",
    dateRange: JSON.stringify({
      start: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
      end: { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() },
    }),
    timeGranularity: "ALL",
    campaigns: `List(urn:li:sponsoredCampaign:${campaignId})`,
    fields: "costInLocalCurrency,impressions,clicks,externalWebsiteConversions",
  });

  const res = await fetch(`${BASE_URL}/adAnalyticsV2?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202401",
    },
  });

  if (!res.ok) return { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

  const json = await res.json();
  const el = json.elements?.[0] ?? {};
  return {
    spend: Number(el.costInLocalCurrency ?? 0),
    impressions: Number(el.impressions ?? 0),
    clicks: Number(el.clicks ?? 0),
    conversions: Number(el.externalWebsiteConversions ?? 0),
  };
}
