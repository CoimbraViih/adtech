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
  } catch {
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
  await supabase
    .from("org_api_credentials")
    .upsert(
      { organization_id: organizationId, provider, credentials: encrypted },
      { onConflict: "organization_id,provider" }
    );
}

export async function deleteCredentials(
  organizationId: string,
  provider: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("org_api_credentials")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", provider);
}

export async function markTested(
  organizationId: string,
  provider: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("org_api_credentials")
    .update({ last_tested_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
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
