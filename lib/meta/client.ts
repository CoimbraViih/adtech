/**
 * Meta Marketing API wrapper — real implementation.
 *
 * Docs: https://developers.facebook.com/docs/marketing-apis
 * API version: v25.0
 *
 * Credentials are resolved per-org from `org_api_credentials` via
 * `getMetaCredentials()`. Env-var fallbacks (META_ACCESS_TOKEN,
 * META_AD_ACCOUNT_ID) are handled inside `getCredentialField` and are NOT
 * read directly in this module.
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";
import { refreshMetaTokenIfNeeded } from "@/lib/meta/token-refresh";

const BASE_URL = "https://graph.facebook.com/v25.0";

// ── types ──────────────────────────────────────────────────────────────────

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

// ── objective mapping ───────────────────────────────────────────────────────

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

// ── http helpers ────────────────────────────────────────────────────────────

async function getMetaCredentials(organizationId: string) {
  // Best-effort proactive refresh — a refresh failure must not block the
  // caller from using whatever valid token is currently stored.
  try {
    await refreshMetaTokenIfNeeded(organizationId);
  } catch (err) {
    console.warn("[meta] token refresh skipped:", (err as Error).message);
  }

  const [token, accountId] = await Promise.all([
    getCredentialField(organizationId, "meta", "access_token", "META_ACCESS_TOKEN"),
    getCredentialField(organizationId, "meta", "ad_account_id", "META_AD_ACCOUNT_ID"),
  ]);
  if (!token) throw new Error("Meta Ads Access Token não configurado. Configure em Settings → Integrações.");
  if (!accountId) throw new Error("Meta Ads Account ID não configurado. Configure em Settings → Integrações.");
  return {
    token,
    account: accountId.startsWith("act_") ? accountId : `act_${accountId}`,
  };
}

async function metaFetch<T>(
  path: string,
  options: RequestInit & { token: string }
): Promise<T> {
  const { token, ...rest } = options;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetchWithRetry(url, {
    ...rest,
    headers: {
      ...(rest.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json() as T & { error?: { message: string; code: number } };

  if (!res.ok || (data as { error?: { message: string } }).error) {
    const errMsg = (data as { error?: { message: string } }).error?.message ?? `Meta API error (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

// ── public API ──────────────────────────────────────────────────────────────

type MetaListResponse = {
  data: MetaCampaign[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
};

const META_SAFETY_LIMIT = 5000;

/**
 * List all campaigns for the configured ad account (fully paginated).
 */
export async function listMetaCampaigns(
  organizationId: string,
  opts?: {
    status?: MetaCampaignStatus[];
  }
): Promise<MetaCampaign[]> {
  const { token, account } = await getMetaCredentials(organizationId);

  const fields = "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time";
  const statusFilter = opts?.status?.join(",") ?? "ACTIVE,PAUSED";

  const initialPath = `/${account}/campaigns?fields=${fields}&effective_status=['${statusFilter.replace(/,/g, "','")}']&limit=200`;

  const accumulated: MetaCampaign[] = [];
  let nextPath: string | undefined = initialPath;

  while (nextPath !== undefined) {
    const response: MetaListResponse = await metaFetch<MetaListResponse>(nextPath, { token, method: "GET" });
    accumulated.push(...response.data);

    if (!response.paging?.next) break;
    if (accumulated.length >= META_SAFETY_LIMIT) break;

    // paging.next is an absolute URL — metaFetch routes it correctly via
    // the `path.startsWith("http")` check in its URL construction.
    nextPath = response.paging.next;
  }

  return accumulated;
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
  }
): Promise<string> {
  const { token, account } = await getMetaCredentials(organizationId);

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
  update: { status?: CampaignStatus; dailyBudget?: number }
): Promise<void> {
  const { token } = await getMetaCredentials(organizationId);

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
 * Fetch account-level insights for all campaigns in a single API call.
 * Uses /{accountId}/insights?level=campaign to retrieve metrics for every
 * campaign under the account, then returns them keyed by campaign_id.
 * This replaces the N-per-campaign pattern with 1 call per account.
 */
export async function getMetaAccountInsights(
  organizationId: string,
  opts: {
    datePreset?: "today" | "last_7d" | "last_30d" | "last_month";
    since?: string; // YYYY-MM-DD
    until?: string;
  } = {}
): Promise<Record<string, MetaInsights>> {
  const { token, account } = await getMetaCredentials(organizationId);

  const fields = "campaign_id,spend,impressions,clicks,actions,purchase_roas,date_start,date_stop";
  const timeRange = opts.since && opts.until
    ? `&time_range={'since':'${opts.since}','until':'${opts.until}'}`
    : `&date_preset=${opts.datePreset ?? "last_30d"}`;

  // level=campaign on an account endpoint returns one row per campaign.
  const initialPath = `/${account}/insights?fields=${fields}&level=campaign${timeRange}&limit=200`;

  const accumulated: MetaInsights[] = [];
  let nextPath: string | undefined = initialPath;

  type AccountInsightsPage = { data: MetaInsights[]; paging?: { next?: string } };

  while (nextPath !== undefined) {
    const response: AccountInsightsPage = await metaFetch<AccountInsightsPage>(
      nextPath,
      { token, method: "GET" }
    );
    accumulated.push(...response.data);
    if (!response.paging?.next) break;
    nextPath = response.paging.next;
  }

  // Key by campaign_id for O(1) join in the sync loop.
  const byId: Record<string, MetaInsights> = {};
  for (const ins of accumulated) {
    byId[ins.campaign_id] = ins;
  }
  return byId;
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
  } = {}
): Promise<MetaInsights[]> {
  const { token } = await getMetaCredentials(organizationId);

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
