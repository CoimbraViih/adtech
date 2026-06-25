export type CommerceProvider = "nuvemshop" | "vtex" | "shopify";

export type CommerceLineItem = {
  externalProductId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency: string;
};

export type CanonicalProduct = {
  externalId: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  url: string | null;
  status: "active" | "archived";
  rawData: Record<string, unknown>;
};

export type CanonicalOrder = {
  externalOrderId: string;
  totalValue: number;
  currency: string;
  lineItems: CommerceLineItem[];
  customerEmail?: string | null;
  placedAt: string; // ISO8601
  rawData?: Record<string, unknown>;
};

export function isCanonicalOrder(v: unknown): v is CanonicalOrder {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.externalOrderId === "string" &&
    typeof o.totalValue === "number" &&
    typeof o.currency === "string" &&
    Array.isArray(o.lineItems) &&
    typeof o.placedAt === "string"
  );
}
