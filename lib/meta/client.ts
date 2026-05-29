/**
 * Meta Marketing API wrapper.
 *
 * Docs: https://developers.facebook.com/docs/marketing-apis
 * API version: v21.0
 *
 * Required env vars:
 *   META_ACCESS_TOKEN      â€” long-lived User or System User access token
 *   META_AD_ACCOUNT_ID     â€” ad account ID (act_XXXXXXXXX)
 *
 * TODO(M2-backend): wire META_ACCESS_TOKEN per workspace (stored in DB encrypted).
 * For now falls back to env vars for single-tenant dev.
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const BASE_URL = "https://graph.facebook.com/v21.0";

// â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type MetaCampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
type MetaObjective =
  | "OUTCOME_AWARENESS"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_APP_PROMOTION";

export type MetaCampaign = {
  id: string;
  name: string;
  status: MetaCampaignStatus;
  objective: MetaObjective;
  daily_budget: string; // Meta returns cents as string
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
};

export type MetaInsights = {
  campaign_id: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
};

type MetaCreateCampaignInput = {
  name: string;
  objective: MetaObjective;
  status: MetaCampaignStatus;
  daily_budget?: number; // in BRL cents
  lifetime_budget?: number;
  start_time?: string; // ISO 8601
  stop_time?: string;
};

// â”€â”€ objective mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OBJECTIVE_MAP: Record<CampaignObjective, MetaObjective> = {
  awareness:       "OUTCOME_AWARENESS",
  traffic:         "OUTCOME_TRAFFIC",
  engagement:      "OUTCOME_ENGAGEMENT",
  leads:           "OUTCOME_LEADS",
  sales:           "OUTCOME_SALES",
  app_promotion:   "OUTCOME_APP_PROMOTION",
};

const STATUS_MAP: Record<CampaignStatus, MetaCampaignStatus> = {
  active:   "ACTIVE",
  paused:   "PAUSED",
  draft:    "PAUSED",
  archived: "ARCHIVED",
};

// â”€â”€ http helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getMetaCredentials(organizationId: string) {
  const [token, accountId] = await Promise.all([
    getCredentialField(organizationId, "meta", "access_token", "META_ACCESS_TOKEN"),
    getCredentialField(organizationId, "meta", "ad_account_id", "META_AD_ACCOUNT_ID"),
  ]);
  return { token: token ?? "", accountId: accountId ?? "" };
}

function getCredentials(accessToken?: string, adAccountId?: string) {
  const token = accessToken ?? process.env.META_ACCESS_TOKEN;
  const account = adAccountId ?? process.env.META_AD_ACCOUNT_ID;

  if (!token) throw new Error("META_ACCESS_TOKEN is not configured");
  if (!account) throw new Error("META_AD_ACCOUNT_ID is not configured");

  return { token, account: account.startsWith("act_") ? account : `act_${account}` };
}

async function metaFetch<T>(
  path: string,
  options: RequestInit & { token: string }
): Promise<T> {
  const { token, ...rest } = options;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const separator = url.includes("?") ? "&" : "?";

  const res = await fetch(`${url}${separator}access_token=${token}`, rest);
  const data = await res.json() as T & { error?: { message: string; code: number } };

  if (!res.ok || (data as { error?: { message: string } }).error) {
    const errMsg = (data as { error?: { message: string } }).error?.message ?? `Meta API error (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

// â”€â”€ public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * List all campaigns for the configured ad account.
 */
export async function listMetaCampaigns(
  organizationId: string,
  opts?: {
    accessToken?: string;
    adAccountId?: string;
    status?: MetaCampaignStatus[];
  }
): Promise<MetaCampaign[]> {
  const dbCreds = await getMetaCredentials(organizationId);
  const { token, account } = getCredentials(
    (opts?.accessToken ?? dbCreds.token) || undefined,
    (opts?.adAccountId ?? dbCreds.accountId) || undefined
  );

  const fields = "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time";
  const statusFilter = opts?.status?.join(",") ?? "ACTIVE,PAUSED";

  const data = await metaFetch<{ data: MetaCampaign[] }>(
    `/${account}/campaigns?fields=${fields}&effective_status=['${statusFilter.replace(/,/g, "','")}']&limit=200`,
    { token, method: "GET" }
  );

  return data.data;
}

/**
 * Create a campaign on Meta and return its external ID.
 */
export async function createMetaCampaign(
  organizationId: string,
  input: {
    name: string;
    objective: CampaignObjective;
    status: CampaignStatus;
    dailyBudget: number; // BRL
    lifetimeBudget?: number | null;
    startDate: string; // YYYY-MM-DD
    endDate?: string | null;
  },
  opts?: { accessToken?: string; adAccountId?: string }
): Promise<string> {
  const dbCreds = await getMetaCredentials(organizationId);
  const { token, account } = getCredentials(
    (opts?.accessToken ?? dbCreds.token) || undefined,
    (opts?.adAccountId ?? dbCreds.accountId) || undefined
  );

  const body: MetaCreateCampaignInput = {
    name: input.name,
    objective: OBJECTIVE_MAP[input.objective],
    status: STATUS_MAP[input.status],
    daily_budget: Math.round(input.dailyBudget * 100), // cents
    start_time: `${input.startDate}T00:00:00-0300`,
  };

  if (input.lifetimeBudget) {
    body.lifetime_budget = Math.round(input.lifetimeBudget * 100);
    delete body.daily_budget;
  }

  if (input.endDate) {
    body.stop_time = `${input.endDate}T23:59:59-0300`;
  }

  const formBody = new URLSearchParams(
    Object.entries(body).map(([k, v]) => [k, String(v)])
  );

  const result = await metaFetch<{ id: string }>(
    `/${account}/campaigns`,
    {
      token,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    }
  );

  return result.id;
}

/**
 * Update campaign status or budget on Meta.
 */
export async function updateMetaCampaign(
  organizationId: string,
  externalId: string,
  update: { status?: CampaignStatus; dailyBudget?: number },
  opts?: { accessToken?: string }
): Promise<void> {
  const dbCreds = await getMetaCredentials(organizationId);
  const { token } = getCredentials((opts?.accessToken ?? dbCreds.token) || undefined);

  const body: Record<string, string> = {};
  if (update.status) body.status = STATUS_MAP[update.status];
  if (update.dailyBudget) body.daily_budget = String(Math.round(update.dailyBudget * 100));

  if (Object.keys(body).length === 0) return;

  const formBody = new URLSearchParams(body);
  await metaFetch<{ success: boolean }>(
    `/${externalId}`,
    {
      token,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    }
  );
}

/**
 * Fetch campaign-level insights for a date range.
 */
export async function getMetaCampaignInsights(
  organizationId: string,
  externalId: string,
  opts: {
    datePreset?: "today" | "last_7d" | "last_30d" | "last_month";
    since?: string; // YYYY-MM-DD
    until?: string;
    accessToken?: string;
  } = {}
): Promise<MetaInsights[]> {
  const dbCreds = await getMetaCredentials(organizationId);
  const { token } = getCredentials((opts.accessToken ?? dbCreds.token) || undefined);

  const fields = "campaign_id,spend,impressions,clicks,actions,purchase_roas,date_start,date_stop";
  const timeRange = opts.since && opts.until
    ? `&time_range={'since':'${opts.since}','until':'${opts.until}'}`
    : `&date_preset=${opts.datePreset ?? "last_30d"}`;

  const data = await metaFetch<{ data: MetaInsights[] }>(
    `/${externalId}/insights?fields=${fields}&level=campaign${timeRange}`,
    { token, method: "GET" }
  );

  return data.data;
}
