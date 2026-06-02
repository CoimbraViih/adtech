/**
 * LinkedIn OAuth2 token refresh helper.
 *
 * Called proactively before reading credentials so that API calls never hit a
 * stale token.  The function is idempotent: it only contacts LinkedIn when the
 * stored access token is within 7 days of expiring.
 */

import { getCredentialField, saveTokenRefresh } from "@/lib/integrations/credentials";

/** Seven days expressed in milliseconds. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type LinkedInTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
};

/**
 * Refreshes the LinkedIn access token for the given org when it is expiring
 * within the next 7 days.
 *
 * Behaviour matrix:
 * - `expires_at` is null  → token was added manually without an expiry; skip.
 * - `expires_at` > now + 7d → still fresh; skip.
 * - `expires_at` ≤ now + 7d → call LinkedIn and persist the new token pair.
 * - `refresh_token`, `client_id`, or `client_secret` absent → skip (manual
 *   token that does not support automatic refresh).
 *
 * On LinkedIn API failure the function throws with a message prefixed by
 * "LinkedIn token refresh failed: <detail>".
 */
export async function refreshLinkedInTokenIfNeeded(orgId: string): Promise<void> {
  const expiresAtRaw = await getCredentialField(orgId, "linkedin", "expires_at");

  // Null means the token was configured manually without recording an expiry.
  if (expiresAtRaw === null) return;

  const expiresAt = new Date(expiresAtRaw).getTime();
  const threshold = Date.now() + SEVEN_DAYS_MS;

  if (expiresAt > threshold) return;

  // We need all three credential fields to perform an OAuth refresh.
  const [refreshToken, clientId, clientSecret] = await Promise.all([
    getCredentialField(orgId, "linkedin", "refresh_token"),
    getCredentialField(orgId, "linkedin", "client_id"),
    getCredentialField(orgId, "linkedin", "client_secret"),
  ]);

  if (!refreshToken || !clientId || !clientSecret) {
    // Manual / system-user token — automatic refresh is not supported.
    return;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => String(res.status));
    throw new Error(`LinkedIn token refresh failed: ${detail}`);
  }

  const data = (await res.json()) as LinkedInTokenResponse;

  if (!data.access_token) {
    throw new Error("LinkedIn token refresh failed: response missing access_token");
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

  await saveTokenRefresh(orgId, "linkedin", {
    accessToken: data.access_token,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    expiresAt: newExpiresAt,
  });
}
