import { createServiceClient } from "@/lib/supabase/service";
import { encrypt, decrypt } from "@/lib/integrations/crypto";
import type { IntegrationStatus } from "@/types/database";

export async function getCredentials(
  organizationId: string,
  provider: string
): Promise<Record<string, string> | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("org_api_credentials")
    .select("credentials")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  if (!data) return null;

  try {
    const row = data as { credentials: string };
    return JSON.parse(decrypt(row.credentials)) as Record<string, string>;
  } catch (err) {
    console.error("[credentials] decrypt failed for", provider, (err as Error).message);
    return null;
  }
}

export async function getCredentialField(
  organizationId: string,
  provider: string,
  field: string,
  envFallback?: string
): Promise<string | null> {
  const creds = await getCredentials(organizationId, provider);
  if (creds?.[field]) return creds[field];
  return envFallback ? (process.env[envFallback] ?? null) : null;
}

export async function upsertCredentials(
  organizationId: string,
  provider: string,
  fields: Record<string, string>
): Promise<void> {
  const supabase = createServiceClient();
  const encrypted = encrypt(JSON.stringify(fields));
  const { error } = await supabase
    .from("org_api_credentials")
    .upsert(
      { organization_id: organizationId, provider, credentials: encrypted },
      { onConflict: "organization_id,provider" }
    );
  if (error) throw new Error(`Failed to save credentials for ${provider}: ${(error as { message?: string }).message ?? String(error)}`);
}

export async function deleteCredentials(
  organizationId: string,
  provider: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("org_api_credentials")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", provider);
  if (error) throw new Error(`Failed to delete credentials for ${provider}: ${(error as { message?: string }).message ?? String(error)}`);
}

// ---------------------------------------------------------------------------
// Token-refresh helpers (Onda 1B)
// ---------------------------------------------------------------------------

type TokenRefreshData = {
  /** New access token (plaintext — will be encrypted before storage). */
  accessToken: string;
  /** New refresh token (plaintext — will be encrypted before storage).
   *  Omit when the provider reuses the same refresh token across refreshes. */
  refreshToken?: string;
  /** UTC timestamp at which the new access token expires. */
  expiresAt: Date;
};

/**
 * Persists a refreshed OAuth token set for an org+provider pair without
 * touching any other credential fields (e.g. ad_account_id, customer_id).
 *
 * The strategy is:
 *   1. Read the existing `credentials` blob and decrypt it.
 *   2. Merge `access_token` (and optionally `refresh_token`) into the JSON.
 *   3. Re-encrypt and UPDATE `credentials` + `expires_at` in the same row.
 *      The `refresh_token` column (migration 020) is also written as an
 *      encrypted copy so the refresh-flow can look it up with a single
 *      column read instead of decrypting the full `credentials` blob.
 *
 * If the row does not yet exist the UPDATE affects 0 rows silently — callers
 * should use `upsertCredentials` for the initial write.
 */
export async function saveTokenRefresh(
  orgId: string,
  provider: string,
  data: TokenRefreshData
): Promise<void> {
  const supabase = createServiceClient();

  // Read the existing credential blob so we can merge, not overwrite.
  const existing = (await getCredentials(orgId, provider)) ?? {};

  const merged: Record<string, string> = {
    ...existing,
    access_token: data.accessToken,
  };
  if (data.refreshToken !== undefined) {
    merged.refresh_token = data.refreshToken;
  }

  const updates: Record<string, string> = {
    credentials: encrypt(JSON.stringify(merged)),
    expires_at: data.expiresAt.toISOString(),
  };

  // Mirror the refresh token in the dedicated column (migration 020) so the
  // refresh-flow can read it via getCredentialField without decrypting the
  // whole blob.
  if (data.refreshToken !== undefined) {
    updates.refresh_token = encrypt(data.refreshToken);
  }

  const { error } = await supabase
    .from("org_api_credentials")
    .update(updates)
    .eq("organization_id", orgId)
    .eq("provider", provider);

  if (error) {
    throw new Error(
      `saveTokenRefresh failed for ${provider}: ${
        (error as { message?: string }).message ?? String(error)
      }`
    );
  }
}

export async function markTested(
  organizationId: string,
  provider: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("org_api_credentials")
    .update({ last_tested_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
  if (error) console.error("[credentials] markTested failed for", provider, (error as { message?: string }).message);
}

export async function listCredentialStatuses(
  organizationId: string
): Promise<IntegrationStatus[]> {
  const supabase = createServiceClient();
  const { data } = (await supabase
    .from("org_api_credentials")
    .select("provider, last_tested_at")
    .eq("organization_id", organizationId)) as { data: Array<{ provider: string; last_tested_at: string | null }> | null };

  if (!data) return [];
  return data.map((row) => ({
    provider: row.provider,
    configured: true,
    last_tested_at: row.last_tested_at,
  }));
}
