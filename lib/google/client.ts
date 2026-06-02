/**
 * Google Ads API wrapper.
 *
 * Docs: https://developers.google.com/google-ads/api/docs/start
 * API version: v24
 *
 * Required env vars:
 *   GOOGLE_ADS_DEVELOPER_TOKEN   â€” developer token from Google Ads API Center
 *   GOOGLE_ADS_CLIENT_ID         â€” OAuth2 client ID
 *   GOOGLE_ADS_CLIENT_SECRET     â€” OAuth2 client secret
 *   GOOGLE_ADS_REFRESH_TOKEN     â€” OAuth2 refresh token (offline access)
 *   GOOGLE_ADS_CUSTOMER_ID       â€” customer ID (without dashes, e.g. 1234567890)
 *
 * TODO(M2-backend): store refresh tokens per workspace in DB (encrypted).
 */

import type { CampaignObjective, CampaignStatus } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const GOOGLE_ADS_API_VERSION = "v24";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ objective / status mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ credentials helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getGoogleCredentials(organizationId: string) {
  const [devToken, clientId, clientSecret, refreshToken, customerId] = await Promise.all([
    getCredentialField(organizationId, "google", "developer_token", "GOOGLE_ADS_DEVELOPER_TOKEN"),
    getCredentialField(organizationId, "google", "client_id", "GOOGLE_ADS_CLIENT_ID"),
    getCredentialField(organizationId, "google", "client_secret", "GOOGLE_ADS_CLIENT_SECRET"),
    getCredentialField(organizationId, "google", "refresh_token", "GOOGLE_ADS_REFRESH_TOKEN"),
    getCredentialField(organizationId, "google", "customer_id", "GOOGLE_ADS_CUSTOMER_ID"),
  ]);
  return {
    devToken: devToken ?? "",
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
    refreshToken: refreshToken ?? "",
    customerId: customerId ?? "",
  };
}

// â”€â”€ auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TokenResponse = { access_token: string; expires_in: number };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(refreshToken?: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const rToken = refreshToken ?? process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

  if (!rToken || !clientId || !clientSecret) {
    throw new Error("Google Ads OAuth credentials are not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: rToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as TokenResponse;
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cachedToken.token;
}

function getCredentials(customerId?: string) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const cid = (customerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/-/g, "");

  if (!devToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured");
  if (!cid) throw new Error("GOOGLE_ADS_CUSTOMER_ID is not configured");

  return { devToken, customerId: cid };
}

async function googleFetch<T>(
  path: string,
  options: RequestInit & { customerId?: string; refreshToken?: string }
): Promise<T> {
  const { customerId: cid, refreshToken, ...rest } = options;
  const accessToken = await getAccessToken(refreshToken);
  const { devToken, customerId } = getCredentials(cid);

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": devToken,
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

// â”€â”€ GAQL query helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function googleQuery<T>(
  query: string,
  opts: { customerId?: string; refreshToken?: string } = {}
): Promise<T[]> {
  const { customerId: cid } = getCredentials(opts.customerId);

  const data = await googleFetch<{ results?: T[] }>(
    `/customers/${cid}/googleAds:search`,
    {
      method: "POST",
      body: JSON.stringify({ query }),
      customerId: cid,
      refreshToken: opts.refreshToken,
    }
  );

  return data.results ?? [];
}

// â”€â”€ public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * List campaigns for the configured customer.
 */
export async function listGoogleCampaigns(
  organizationId: string,
  opts?: {
    customerId?: string;
    refreshToken?: string;
    statuses?: GoogleCampaignStatus[];
  }
): Promise<GoogleCampaign[]> {
  const dbCreds = await getGoogleCredentials(organizationId);
  const mergedOpts = {
    ...opts,
    customerId: (opts?.customerId ?? dbCreds.customerId) || undefined,
    refreshToken: (opts?.refreshToken ?? dbCreds.refreshToken) || undefined,
  };

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
    LIMIT 1000
  `;

  type Row = { campaign: GoogleCampaign };
  const rows = await googleQuery<Row>(query, mergedOpts);
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
  },
  opts?: { customerId?: string; refreshToken?: string }
): Promise<string> {
  const dbCreds = await getGoogleCredentials(organizationId);
  const mergedOpts = {
    customerId: (opts?.customerId ?? dbCreds.customerId) || undefined,
    refreshToken: (opts?.refreshToken ?? dbCreds.refreshToken) || undefined,
  };
  const { customerId: cid } = getCredentials(mergedOpts.customerId);

  // 1. Create a campaign budget first
  const budgetResult = await googleFetch<{ results: Array<{ resourceName: string }> }>(
    `/customers/${cid}/campaignBudgets:mutate`,
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
      customerId: cid,
      refreshToken: mergedOpts.refreshToken,
    }
  );

  const budgetResourceName = budgetResult.results[0]?.resourceName;
  if (!budgetResourceName) throw new Error("Failed to create Google Ads budget");

  // 2. Create the campaign
  const campaignResult = await googleFetch<{ results: Array<{ resourceName: string }> }>(
    `/customers/${cid}/campaigns:mutate`,
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
      customerId: cid,
      refreshToken: mergedOpts.refreshToken,
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
  update: { status?: CampaignStatus; dailyBudget?: number },
  opts?: { customerId?: string; refreshToken?: string }
): Promise<void> {
  const dbCreds = await getGoogleCredentials(organizationId);
  const mergedOpts = {
    customerId: (opts?.customerId ?? dbCreds.customerId) || undefined,
    refreshToken: (opts?.refreshToken ?? dbCreds.refreshToken) || undefined,
  };
  const { customerId: cid } = getCredentials(mergedOpts.customerId);

  if (!update.status && !update.dailyBudget) return;

  const ops: unknown[] = [];

  if (update.status) {
    ops.push({
      updateMask: "status",
      update: {
        resourceName: `customers/${cid}/campaigns/${externalId}`,
        status: STATUS_MAP[update.status],
      },
    });
  }

  if (ops.length === 0) return;

  await googleFetch(
    `/customers/${cid}/campaigns:mutate`,
    {
      method: "POST",
      body: JSON.stringify({ operations: ops }),
      customerId: cid,
      refreshToken: mergedOpts.refreshToken,
    }
  );
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
    customerId?: string;
    refreshToken?: string;
  } = {}
): Promise<GoogleCampaignMetrics[]> {
  const dbCreds = await getGoogleCredentials(organizationId);
  const mergedOpts = {
    ...opts,
    customerId: (opts.customerId ?? dbCreds.customerId) || undefined,
    refreshToken: (opts.refreshToken ?? dbCreds.refreshToken) || undefined,
  };

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
  return googleQuery<Row>(query, mergedOpts);
}
