import { timingSafeEqual } from "crypto";
import type { CanonicalOrder, CommerceLineItem } from "@/lib/commerce/types";

// VTEX webhooks do not use HMAC — they send the AppToken in the hook config URL.
// We verify by comparing the stored appToken against the one in the request header.
export function verifyVtexHook(
  _rawBody: string,
  appToken: string,
  headerToken: string
): boolean {
  if (!headerToken || !appToken) return false;
  try {
    const a = Buffer.from(appToken, "utf8");
    const b = Buffer.from(headerToken, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type VtexItem = {
  productId?: unknown;
  name?: unknown;
  quantity?: unknown;
  price?: unknown;
  currencyCode?: unknown;
};

type VtexClientProfile = { email?: string };

export function parseVtexOrder(raw: Record<string, unknown>): CanonicalOrder {
  const valueInCents = Number(raw.value ?? 0);
  const currency = String(raw.currencyCode ?? "BRL");

  const lineItems: CommerceLineItem[] = ((raw.items as VtexItem[]) ?? []).map((item) => ({
    externalProductId: String(item.productId ?? ""),
    title: String(item.name ?? ""),
    quantity: Number(item.quantity ?? 1),
    unitPrice: Number(item.price ?? 0) / 100,
    currency,
  }));

  const clientProfile = raw.clientProfileData as VtexClientProfile | undefined;

  return {
    externalOrderId: String(raw.orderId ?? ""),
    totalValue: valueInCents / 100,
    currency,
    customerEmail: clientProfile?.email ?? null,
    lineItems,
    placedAt: String(raw.creationDate ?? new Date().toISOString()),
    rawData: raw,
  };
}
