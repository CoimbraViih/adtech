import { createHmac, timingSafeEqual } from "crypto";
import type { CanonicalOrder, CommerceLineItem } from "@/lib/commerce/types";

export function verifyNuvemshopHmac(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false;
  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type NuvemshopProduct = {
  product_id?: unknown;
  name?: unknown;
  quantity?: unknown;
  price?: unknown;
};

export function parseNuvemshopOrder(raw: Record<string, unknown>): CanonicalOrder {
  const lineItems: CommerceLineItem[] = ((raw.products as NuvemshopProduct[]) ?? []).map((p) => ({
    externalProductId: String(p.product_id ?? ""),
    title: String(p.name ?? ""),
    quantity: Number(p.quantity ?? 1),
    unitPrice: parseFloat(String(p.price ?? "0")),
    currency: String(raw.currency ?? "BRL"),
  }));

  return {
    externalOrderId: String(raw.id ?? ""),
    totalValue: parseFloat(String(raw.total ?? "0")),
    currency: String(raw.currency ?? "BRL"),
    customerEmail: raw.contact_email ? String(raw.contact_email) : null,
    lineItems,
    placedAt: String(raw.created_at ?? new Date().toISOString()),
    rawData: raw,
  };
}
