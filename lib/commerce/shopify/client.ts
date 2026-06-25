import { getCredentialField } from "@/lib/integrations/credentials";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

const SHOPIFY_API_VERSION = "2024-04";

export function buildShopifyAuthUrl(
  shop: string,
  state: string,
  redirectUri: string
): string {
  const clientId = process.env.SHOPIFY_CLIENT_ID ?? "";
  const scopes = "read_products,read_orders";
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    "grant_options[]": "per-user",
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeShopifyCode(
  shop: string,
  code: string
): Promise<{ accessToken: string }> {
  const clientId = process.env.SHOPIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET ?? "";

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Shopify token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Shopify: access_token missing in token response");

  return { accessToken: data.access_token };
}

export async function fetchShopify(
  orgId: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const accessToken = await getCredentialField(orgId, "shopify", "access_token");
  const shop = await getCredentialField(orgId, "shopify", "shop_domain");

  if (!accessToken || !shop) {
    throw new Error("Shopify not connected for this organization");
  }

  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  return fetchWithRetry(url, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> ?? {}),
    },
  });
}
