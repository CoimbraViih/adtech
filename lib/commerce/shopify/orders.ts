import { fetchShopify } from "./client";
import { parseShopifyOrder } from "./webhooks";
import type { CanonicalOrder } from "@/lib/commerce/types";

export async function fetchShopifyOrder(
  orgId: string,
  orderId: string
): Promise<CanonicalOrder> {
  const res = await fetchShopify(orgId, `/orders/${orderId}.json`);
  if (!res.ok) throw new Error(`Shopify order fetch failed: ${res.status}`);
  const data = await res.json() as { order: Record<string, unknown> };
  return parseShopifyOrder(data.order);
}
