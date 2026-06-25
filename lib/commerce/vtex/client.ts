import { getCredentialField } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

export async function fetchVtex(
  orgId: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const appKey = await getCredentialField(orgId, "vtex", "app_key", "VTEX_API_KEY");
  const appToken = await getCredentialField(orgId, "vtex", "app_token", "VTEX_API_TOKEN");
  const account = await getCredentialField(orgId, "vtex", "account_name");

  if (!appKey || !appToken || !account) {
    throw new Error("VTEX not configured for this organization");
  }

  const url = `https://${account}.vtexcommercestable.com.br${path}`;
  return fetchWithRetry(url, {
    ...init,
    headers: {
      "X-VTEX-API-AppKey": appKey,
      "X-VTEX-API-AppToken": appToken,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> ?? {}),
    },
  });
}
