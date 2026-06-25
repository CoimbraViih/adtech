import { getCredentialField } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

const NUVEMSHOP_API = "https://api.nuvemshop.com.br/v1";

export async function fetchNuvemshop(
  orgId: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const accessToken = await getCredentialField(orgId, "nuvemshop", "access_token");
  const userId = await getCredentialField(orgId, "nuvemshop", "user_id");

  if (!accessToken || !userId) {
    throw new Error("Nuvemshop not connected for this organization");
  }

  const url = `${NUVEMSHOP_API}/${userId}${path}`;
  return fetchWithRetry(url, {
    ...init,
    headers: {
      "Authentication": `bearer ${accessToken}`,
      "User-Agent": "AdFlow/1.0 (adflow.com.br)",
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> ?? {}),
    },
  });
}

export async function buildNuvemshopAuthUrl(state: string, redirectUri: string): Promise<string> {
  const clientId = process.env.NUVEMSHOP_CLIENT_ID ?? "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read_products read_orders write_webhooks",
    state,
  });
  return `https://www.nuvemshop.com.br/apps/${clientId}/authorize?${params.toString()}`;
}

export async function exchangeNuvemshopCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; userId: string }> {
  const clientId = process.env.NUVEMSHOP_CLIENT_ID ?? "";
  const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET ?? "";

  const res = await fetch("https://www.nuvemshop.com.br/apps/authorize/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Nuvemshop token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token?: string; user_id?: number };
  if (!data.access_token || !data.user_id) {
    throw new Error("Nuvemshop: access_token or user_id missing in token response");
  }

  return { accessToken: data.access_token, userId: String(data.user_id) };
}
