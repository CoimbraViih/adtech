import { fetchVtex } from "./client";
import { parseVtexOrder } from "./webhooks";
import type { CanonicalOrder } from "@/lib/commerce/types";

export async function fetchVtexOrder(
  orgId: string,
  orderId: string
): Promise<CanonicalOrder> {
  const res = await fetchVtex(orgId, `/api/oms/pvt/orders/${orderId}`);
  if (!res.ok) throw new Error(`VTEX order fetch failed: ${res.status}`);
  const raw = await res.json() as Record<string, unknown>;
  return parseVtexOrder(raw);
}
