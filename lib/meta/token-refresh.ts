/**
 * Meta (Facebook) long-lived token exchange helper.
 *
 * Meta does not use a classic refresh_token flow.  Instead, a short-lived user
 * access token can be exchanged for a long-lived one (~60 days) via the
 * fb_exchange_token grant.  This module performs that exchange proactively when
 * the stored token is within 7 days of its recorded expiry.
 *
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */

import { getCredentialField, saveTokenRefresh } from "@/lib/integrations/credentials";

const BASE_URL = "https://graph.facebook.com/v25.0";

/** Seven days expressed in milliseconds. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type MetaExchangeResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number; // seconds — present for user tokens, absent for System Users
};

/**
 * Exchanges the Meta access token for a long-lived one when it is expiring
 * within the next 7 days.
 *
 * Behaviour matrix:
 * - `expires_at` is null  → token has no recorded expiry (System User token);
 *   skip without error.
 * - `expires_at` > now + 7d → still fresh; skip.
 * - `expires_at` ≤ now + 7d → call the fb_exchange_token endpoint.
 * - `app_id` or `app_secret` absent → skip (token may be a System User token
 *   that never expires and does not support the exchange flow).
 *
 * On Meta API failure the function throws with a message prefixed by
 * "Meta token refresh failed: <detail>".
 */
export async function refreshMetaTokenIfNeeded(orgId: string): Promise<void> {
  const expiresAtRaw = await getCredentialField(orgId, "meta", "expires_at");

  // Null means no expiry was recorded (e.g. System User token).
  if (expiresAtRaw === null) return;

  const expiresAt = new Date(expiresAtRaw).getTime();
  const threshold = Date.now() + SEVEN_DAYS_MS;

  if (expiresAt > threshold) return;

  // We need the current token plus the app credentials to perform the exchange.
  const [currentToken, appId, appSecret] = await Promise.all([
    getCredentialField(orgId, "meta", "access_token", "META_ACCESS_TOKEN"),
    getCredentialField(orgId, "meta", "app_id"),
    getCredentialField(orgId, "meta", "app_secret"),
  ]);

  if (!appId || !appSecret) {
    // System User or manually-configured token without app credentials.
    return;
  }

  if (!currentToken) {
    // Nothing to exchange — credentials not configured yet.
    return;
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: currentToken,
  });

  const res = await fetch(`${BASE_URL}/oauth/access_token?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => String(res.status));
    throw new Error(`Meta token refresh failed: ${detail}`);
  }

  const data = (await res.json()) as MetaExchangeResponse;

  if (!data.access_token) {
    throw new Error("Meta token refresh failed: response missing access_token");
  }

  // expires_in is in seconds; fall back to 60 days when absent.
  const expiresInMs =
    data.expires_in !== undefined
      ? data.expires_in * 1000
      : 60 * 24 * 60 * 60 * 1000;

  const newExpiresAt = new Date(Date.now() + expiresInMs);

  // Meta's fb_exchange_token flow does not rotate a refresh token.
  await saveTokenRefresh(orgId, "meta", {
    accessToken: data.access_token,
    expiresAt: newExpiresAt,
  });
}
