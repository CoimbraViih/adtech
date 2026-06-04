/**
 * Google Ads API wrapper.
 *
 * Docs: https://developers.google.com/google-ads/api/docs/start
 * API version: v24
 *
 * Credentials are resolved per-org from `org_api_credentials` via
 * `getGoogleCredentials()`. Env-var fallbacks are handled inside
 * `getCredentialField` and are NOT read directly in this module.
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

const GOOGLE_ADS_API_VERSION = "v24";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// -- types --------------------------------------------------------------------

type GoogleCampaignStatus = "ENABLED" | "PAUSED" | "REMOVED";
type GoogleAdvertisingChannelType =
  | "SEARCH"
  | "DISPLAY"
  | "SHOPPING"
  | "VIDEO"
  | "PERFORMANCE_MAX"
  | "SMART";

export type GoogleCampaign = {
  resourceName: string;
  id: string;
  name: string;
  status: GoogleCampaignStatus;
  advertisingChannelType: GoogleAdvertisingChannelType;
  campaignBudget: string; // resource name
  startDate: string; // YYYY-MM-DD
  endDate?: string;
};

export type GoogleCampaignMetrics = {
  campaign: { id: string; name: string };
  metrics: {
    costMicros: string; // BRL micros
    impressions: string;
    clicks: string;
    conversions: string;
    conversionsValue: string;
    averageCpc: string;
    ctr: string;
  };
};

type GoogleCreds = {
  devToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
};

// -- objective / status mapping -----------------------------------------------

const CHANNEL_MAP: Record<CampaignObjective, GoogleAdvertisingChannelType> = {
  awareness:       "DISPLAY",
  traffic:         "SEARCH",
  engagement:      "DISPLAY",
  leads:           "SEARCH",
  sales:           "PERFORMANCE_MAX",
  app_promotion:   "DISPLAY",
};

const STATUS_MAP: Record<CampaignStatus, GoogleCampaignStatus> = {
  active:   "ENABLED",
  paused:   "PAUSED",
  draft:    "PAUSED",
  archived: "REMOVED",
};

// -- credentials helper -------------------------------------------------------

async function getGoogleCredentials(organizationId: string): Promise<GoogleCreds> {
  const [devToken, clientId, clientSecret, refreshToken, customerId] = await Promise.all([
    getCredentialField(organizationId, "google", "developer_token", "GOOGLE_ADS_DEVELOPER_TOKEN"),
    getCredentialField(organizationId, "google", "client_id", "GOOGLE_ADS_CLIENT_ID"),
    getCredentialField(organizationId, "google", "client_secret", "GOOGLE_ADS_CLIENT_SECRET"),
    getCredentialField(organizationId, "google", "refresh_token", "GOOGLE_ADS_REFRESH_TOKEN"),
    getCredentialField(organizationId, "google", "customer_id", "GOOGLE_ADS_CUSTOMER_ID"),
  ]);

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Google Ads OAuth credentials não configuradas. Configure em Settings → Integrações.");
  }
  if (!devToken) throw new Error("Google Ads Developer Token não configurado.");
  if (!customerId) throw new Error("Google Ads Customer ID não configurado.");

  return {
    devToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
  };
}

// -- auth ---------------------------------------------------------------------

type TokenResponse = { access_token: string; expires_in: number };

// Intentionally unbounded for MVP: one entry per org, bounded by number of orgs.
// Post-MVP: add TTL-based eviction if memory becomes a concern at scale.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(orgId: string, creds: GoogleCreds): Promise<string> {
  const now = Date.now();
  const cached = tokenCache.get(orgId);
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.token;
  }

  if (!creds.refreshToken || !creds.clientId || !creds.clientSecret) {
    throw new Error("Google Ads OAuth credentials não configuradas. Configure em Settings → Integrações.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as TokenResponse;
  const entry = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  tokenCache.set(orgId, entry);
  return entry.token;
}

// -- fetch helper -------------------------------------------------------------

async function googleFetch<T>(
  path: string,
  options: RequestInit & { orgId: string; creds: GoogleCreds }
): Promise<T> {
  const { orgId, creds, ...rest } = options;
  const accessToken = await getAccessToken(orgId, creds);
  const customerId = creds.customerId.replace(/-/g, "");

  if (!creds.devToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN não configurado.");
  if (!customerId) throw new Error("GOOGLE_ADS_CUSTOMER_ID não configurado.");

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetchWithRetry(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": creds.devToken,
      "login-customer-id": customerId,
      ...(rest.headers as Record<string, string> | undefined),
    },
  });

  const data = (await res.json()) as T & { error?: { message: string; status: string } };

  if (!res.ok) {
    const errMsg = (data as { error?: { message: string } }).error?.message ?? `Google Ads API error (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

// -- GAQL query helper --------------------------------------------------------

type GoogleSearchResponse<T> = {
  results?: T[];
  nextPageToken?: string;
};

async function googleQueryPage<T>(
  query: string,
  orgId: string,
  creds: GoogleCreds,
  pageToken?: string
): Promise<GoogleSearchResponse<T>> {
  const customerId = creds.customerId.replace(/-/g, "");
  const body: Record<string, string> = { query };
  if (pageToken !== undefined) {
    body.pageToken = pageToken;
  }
  return googleFetch<GoogleSearchResponse<T>>(
    `/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      body: JSON.stringify(body),
      orgId,
      creds,
    }
  );
}

const GOOGLE_SAFETY_LIMIT = 10_000;

/**
 * Execute a GAQL query and return all results across all pages.
 * The query must NOT include a LIMIT clause when full pagination is desired.
 */
async function googleQuery<T>(
  query: string,
  orgId: string,
  creds: GoogleCreds
): Promise<T[]> {
  const accumulated: T[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const response: GoogleSearchResponse<T> = await googleQueryPage<T>(query, orgId, creds, pageToken);
    const results = response.results ?? [];
    accumulated.push(...results);
    pageToken = response.nextPageToken;
  } while (pageToken !== undefined && accumulated.length < GOOGLE_SAFETY_LIMIT);

  return accumulated;
}

// -- public API ---------------------------------------------------------------

/**
 * List campaigns for the configured customer.
 */
export async function listGoogleCampaigns(
  organizationId: string,
  opts?: { statuses?: GoogleCampaignStatus[] }
): Promise<GoogleCampaign[]> {
  const creds = await getGoogleCredentials(organizationId);

  const statusList = (opts?.statuses ?? ["ENABLED", "PAUSED"])
    .map((s) => `'${s}'`)
    .join(", ");

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.campaign_budget,
      campaign.start_date,
      campaign.end_date
    FROM campaign
    WHERE campaign.status IN (${statusList})
    ORDER BY campaign.id DESC
  `;

  type Row = { campaign: GoogleCampaign };
  const rows = await googleQuery<Row>(query, organizationId, creds);
  return rows.map((r) => r.campaign);
}

/**
 * Create a campaign on Google Ads and return its external ID.
 */
export async function createGoogleCampaign(
  organizationId: string,
  input: {
    name: string;
    objective: CampaignObjective;
    status: CampaignStatus;
    dailyBudget: number; // BRL
    startDate: string; // YYYY-MM-DD
    endDate?: string | null;
  }
): Promise<string> {
  const creds = await getGoogleCredentials(organizationId);
  const customerId = creds.customerId.replace(/-/g, "");

  // 1. Create a campaign budget first
  const budgetResult = await googleFetch<{ results: Array<{ resourceName: string }> }>(
    `/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: "POST",
      body: JSON.stringify({
        operations: [
          {
            create: {
              amountMicros: String(Math.round(input.dailyBudget * 1_000_000)),
              deliveryMethod: "STANDARD",
            },
          },
        ],
      }),
      orgId: organizationId,
      creds,
    }
  );

  const budgetResourceName = budgetResult.results[0]?.resourceName;
  if (!budgetResourceName) throw new Error("Failed to create Google Ads budget");

  // 2. Create the campaign
  const campaignResult = await googleFetch<{ results: Array<{ resourceName: string }> }>(
    `/customers/${customerId}/campaigns:mutate`,
    {
      method: "POST",
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: input.name,
              status: STATUS_MAP[input.status],
              advertisingChannelType: CHANNEL_MAP[input.objective],
              campaignBudget: budgetResourceName,
              startDate: input.startDate.replace(/-/g, ""),
              ...(input.endDate ? { endDate: input.endDate.replace(/-/g, "") } : {}),
              networkSettings: {
                targetGoogleSearch: true,
                targetSearchNetwork: true,
                targetContentNetwork: false,
              },
            },
          },
        ],
      }),
      orgId: organizationId,
      creds,
    }
  );

  const resourceName = campaignResult.results[0]?.resourceName;
  if (!resourceName) throw new Error("Failed to create Google Ads campaign");

  // Extract numeric ID from resource name "customers/{cid}/campaigns/{id}"
  return resourceName.split("/").pop() ?? resourceName;
}

/**
 * Update campaign status or budget on Google Ads.
 */
export async function updateGoogleCampaign(
  organizationId: string,
  externalId: string,
  update: { status?: CampaignStatus; dailyBudget?: number }
): Promise<void> {
  const creds = await getGoogleCredentials(organizationId);
  const customerId = creds.customerId.replace(/-/g, "");

  if (!update.status && update.dailyBudget === undefined) return;

  if (update.status) {
    await googleFetch(
      `/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              updateMask: "status",
              update: {
                resourceName: `customers/${customerId}/campaigns/${externalId}`,
                status: STATUS_MAP[update.status],
              },
            },
          ],
        }),
        orgId: organizationId,
        creds,
      }
    );
  }

  if (update.dailyBudget !== undefined) {
    // Query the campaign to get its budget resource name
    type BudgetRow = { campaign: { campaignBudget: string } };
    const rows = await googleQuery<BudgetRow>(
      `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${externalId}`,
      organizationId,
      creds
    );

    const budgetResourceName = rows[0]?.campaign?.campaignBudget;
    if (!budgetResourceName) {
      throw new Error("Não foi possível obter o orçamento da campanha no Google Ads.");
    }

    await googleFetch(
      `/customers/${customerId}/campaignBudgets:mutate`,
      {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              updateMask: "amount_micros",
              update: {
                resourceName: budgetResourceName,
                amountMicros: String(Math.round(update.dailyBudget * 1_000_000)),
              },
            },
          ],
        }),
        orgId: organizationId,
        creds,
      }
    );
  }
}

// ── ad group & ad types ────────────────────────────────────────────────────

type GoogleAdGroupStatus = "ENABLED" | "PAUSED" | "REMOVED";
type GoogleAdStatus = "ENABLED" | "PAUSED" | "REMOVED";

export type GoogleAdGroup = {
  resourceName: string;
  id: string;
  name: string;
  status: GoogleAdGroupStatus;
  cpcBidMicros?: string;
};

export type GoogleAd = {
  resourceName: string;
  id: string;
  name?: string;
  status: GoogleAdStatus;
};

/**
 * List all ad groups for a given campaign via GAQL.
 */
export async function listGoogleAdGroups(
  organizationId: string,
  campaignId: string
): Promise<GoogleAdGroup[]> {
  const creds = await getGoogleCredentials(organizationId);

  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.cpc_bid_micros
    FROM ad_group
    WHERE campaign.id = '${campaignId}'
      AND ad_group.status != 'REMOVED'
  `;

  type Row = { adGroup: GoogleAdGroup };
  const rows = await googleQuery<Row>(query, organizationId, creds);
  return rows.map((r) => r.adGroup);
}

/**
 * List all ads for a given ad group via GAQL.
 */
export async function listGoogleAds(
  organizationId: string,
  adGroupId: string
): Promise<GoogleAd[]> {
  const creds = await getGoogleCredentials(organizationId);

  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.status
    FROM ad_group_ad
    WHERE ad_group.id = '${adGroupId}'
      AND ad_group_ad.status != 'REMOVED'
  `;

  type Row = { adGroupAd: { ad: { id: string; name?: string }; status: GoogleAdStatus } };
  const rows = await googleQuery<Row>(query, organizationId, creds);
  return rows.map((r) => ({
    resourceName: `customers/${creds.customerId}/adGroupAds/${adGroupId}~${r.adGroupAd.ad.id}`,
    id: r.adGroupAd.ad.id,
    name: r.adGroupAd.ad.name,
    status: r.adGroupAd.status,
  }));
}

/**
 * Fetch metrics for all campaigns in the account with a single GAQL query.
 * The query omits the `campaign.id = X` filter so Google returns one row per
 * campaign, covering the last 30 days.
 * Returns a Record keyed by campaign ID string.
 */
export async function getGoogleAccountMetrics(
  organizationId: string,
  opts: {
    since?: string; // YYYY-MM-DD
    until?: string;
  } = {}
): Promise<Record<string, GoogleCampaignMetrics>> {
  const creds = await getGoogleCredentials(organizationId);

  const since = opts.since ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const until = opts.until ?? new Date().toISOString().slice(0, 10);

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.average_cpc,
      metrics.ctr
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status IN ('ENABLED', 'PAUSED')
  `;

  type Row = GoogleCampaignMetrics;
  const rows = await googleQuery<Row>(query, organizationId, creds);

  const byId: Record<string, GoogleCampaignMetrics> = {};
  for (const row of rows) {
    byId[row.campaign.id] = row;
  }
  return byId;
}

/**
 * Fetch campaign performance metrics via GAQL.
 */
export async function getGoogleCampaignMetrics(
  organizationId: string,
  externalId: string,
  opts: {
    since?: string; // YYYY-MM-DD
    until?: string;
  } = {}
): Promise<GoogleCampaignMetrics[]> {
  const creds = await getGoogleCredentials(organizationId);

  const since = opts.since ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const until = opts.until ?? new Date().toISOString().slice(0, 10);

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.average_cpc,
      metrics.ctr
    FROM campaign
    WHERE campaign.id = ${externalId}
      AND segments.date BETWEEN '${since}' AND '${until}'
  `;

  type Row = GoogleCampaignMetrics;
  return googleQuery<Row>(query, organizationId, creds);
}
