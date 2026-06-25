import { createHmac, timingSafeEqual } from "crypto";
import type { CanonicalOrder, CommerceLineItem } from "@/lib/commerce/types";

export function verifyShopifyHmac(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false;
  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type ShopifyLineItem = {
  product_id?: unknown;
  title?: unknown;
  quantity?: unknown;
  price?: unknown;
};

export function parseShopifyOrder(raw: Record<string, unknown>): CanonicalOrder {
  const lineItems: CommerceLineItem[] = ((raw.line_items as ShopifyLineItem[]) ?? []).map((li) => ({
    externalProductId: String(li.product_id ?? ""),
    title: String(li.title ?? ""),
    quantity: Number(li.quantity ?? 1),
    unitPrice: parseFloat(String(li.price ?? "0")),
    currency: String(raw.currency ?? "BRL"),
  }));

  return {
    externalOrderId: String(raw.id ?? ""),
    totalValue: parseFloat(String(raw.total_price ?? "0")),
    currency: String(raw.currency ?? "BRL"),
    customerEmail: raw.email ? String(raw.email) : null,
    lineItems,
    placedAt: String(raw.created_at ?? new Date().toISOString()),
    rawData: raw,
  };
}
