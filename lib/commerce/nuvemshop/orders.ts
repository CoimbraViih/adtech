import { fetchNuvemshop } from "./client";
import { parseNuvemshopOrder } from "./webhooks";
import type { CanonicalOrder } from "@/lib/commerce/types";

export async function fetchNuvemshopOrder(
  orgId: string,
  orderId: string
): Promise<CanonicalOrder> {
  const res = await fetchNuvemshop(orgId, `/orders/${orderId}`);
  if (!res.ok) throw new Error(`Nuvemshop order fetch failed: ${res.status}`);
  const raw = await res.json() as Record<string, unknown>;
  return parseNuvemshopOrder(raw);
}
