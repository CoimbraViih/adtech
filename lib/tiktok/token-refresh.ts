/**
 * TikTok Ads token refresh helper.
 *
 * TikTok access tokens expire after 24 hours (sandbox) or based on the
 * authorized scope in production. The refresh_token has a longer lifetime
 * (up to 365 days). This module refreshes the access_token proactively when
 * it is within 1 hour of its recorded expiry.
 *
 * Docs: https://ads.tiktok.com/marketing_api/docs?id=1738373164380162
 */

import { getCredentialField, saveTokenRefresh } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

const TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/";

const ONE_HOUR_MS = 60 * 60 * 1000;

type TikTokTokenResponse = {
  code: number;
  message: string;
  data?: {
    access_token: string;
    access_token_expire_in: number; // Unix timestamp
    refresh_token: string;
    refresh_token_expire_in: number; // Unix timestamp
  };
};

export async function refreshTikTokTokenIfNeeded(orgId: string): Promise<void> {
  const expiresAtRaw = await getCredentialField(orgId, "tiktok", "expires_at");

  if (expiresAtRaw === null) return;

  const expiresAt = new Date(expiresAtRaw).getTime();
  const threshold = Date.now() + ONE_HOUR_MS;

  if (expiresAt > threshold) return;

  const [refreshToken, appId, appSecret] = await Promise.all([
    getCredentialField(orgId, "tiktok", "refresh_token"),
    getCredentialField(orgId, "tiktok", "app_id"),
    getCredentialField(orgId, "tiktok", "app_secret"),
  ]);

  if (!refreshToken || !appId || !appSecret) return;

  const res = await fetchWithRetry(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      secret: appSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => String(res.status));
    throw new Error(`TikTok token refresh failed: ${detail}`);
  }

  const data = (await res.json()) as TikTokTokenResponse;

  if (data.code !== 0 || !data.data?.access_token) {
    throw new Error(`TikTok token refresh failed: ${data.message}`);
  }

  const newExpiresAt = new Date(data.data.access_token_expire_in * 1000);

  await saveTokenRefresh(orgId, "tiktok", {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expiresAt: newExpiresAt,
  });
}
