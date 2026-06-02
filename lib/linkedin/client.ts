/**
 * LinkedIn Ads (Campaign Manager) API client wrapper.
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 * API version: 202506 (Marketing Solutions REST API)
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const BASE_URL = "https://api.linkedin.com/rest";
const LINKEDIN_API_VERSION = "202506";

async function getLinkedInCredentials(organizationId: string) {
  const [token, accountId] = await Promise.all([
    getCredentialField(organizationId, "linkedin", "access_token", "LINKEDIN_ACCESS_TOKEN"),
    getCredentialField(organizationId, "linkedin", "account_id", "LINKEDIN_ACCOUNT_ID"),
  ]);
  if (!token) throw new Error("LinkedIn Access Token não configurado. Configure em Settings → Integrações.");
  if (!accountId) throw new Error("LinkedIn Ad Account ID não configurado. Configure em Settings → Integrações.");
  // LinkedIn uses URN format: urn:li:sponsoredAccount:<id>
  const urn = accountId.startsWith("urn:") ? accountId : `urn:li:sponsoredAccount:${accountId}`;
  return { token, accountId: urn };
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
  organizationId: string
): Promise<{ id: string; name: string; status: string; budget: number }[]> {
  const { token, accountId } = await getLinkedInCredentials(organizationId);

  const params = new URLSearchParams({
    q: "search",
    "search.account.values[0]": accountId,
  });

  const res = await fetch(`${BASE_URL}/adCampaigns?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
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
  input: LinkedInCampaignInput
): Promise<string> {
  const { token, accountId } = await getLinkedInCredentials(organizationId);

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

  const res = await fetch(`${BASE_URL}/adCampaigns`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
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
  updates: { status?: CampaignStatus; dailyBudget?: number }
): Promise<void> {
  const { token } = await getLinkedInCredentials(organizationId);

  const patch: Record<string, unknown> = {};
  if (updates.status) patch.status = mapStatus(updates.status);
  if (updates.dailyBudget) {
    patch.dailyBudget = { currencyCode: "BRL", amount: String(updates.dailyBudget) };
  }

  const res = await fetch(`${BASE_URL}/adCampaigns/${campaignId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "Content-Type": "application/json",
      "X-RestLi-Method": "PARTIAL_UPDATE",
      "X-RestLi-Protocol-Version": "2.0.0",
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
  campaignId: string
): Promise<{ spend: number; impressions: number; clicks: number; conversions: number }> {
  const { token } = await getLinkedInCredentials(organizationId);

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

  const res = await fetch(`${BASE_URL}/adAnalytics?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
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
