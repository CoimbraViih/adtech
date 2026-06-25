import { fetchShopify } from "./client";
import { getCredentialField } from "@/lib/integrations/credentials";
import { createServiceClient } from "@/lib/supabase/service";
import type { CanonicalProduct } from "@/lib/commerce/types";

type ShopifyProduct = {
  id: number;
  title: string;
  body_html?: string | null;
  variants?: Array<{ price?: string }>;
  images?: Array<{ src?: string }>;
  handle?: string;
  status?: string;
};

function mapProduct(p: ShopifyProduct, shopDomain: string): CanonicalProduct {
  return {
    externalId: String(p.id),
    title: p.title,
    description: p.body_html ? p.body_html.replace(/<[^>]+>/g, "") : null,
    price: p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : null,
    currency: "BRL",
    imageUrl: p.images?.[0]?.src ?? null,
    url: p.handle ? `https://${shopDomain}/products/${p.handle}` : null,
    status: p.status === "archived" ? "archived" : "active",
    rawData: p as unknown as Record<string, unknown>,
  };
}

export async function listShopifyProducts(orgId: string): Promise<CanonicalProduct[]> {
  const shopDomain = (await getCredentialField(orgId, "shopify", "shop_domain")) ?? "";

  const products: CanonicalProduct[] = [];
  let pageInfo: string | null = null;

  while (true) {
    const query = pageInfo
      ? `?limit=50&page_info=${pageInfo}`
      : "?limit=50&status=any";

    const res = await fetchShopify(orgId, `/products.json${query}`);
    if (!res.ok) throw new Error(`Shopify catalog fetch failed: ${res.status}`);

    const data = await res.json() as { products: ShopifyProduct[] };
    if (!data.products.length) break;

    products.push(...data.products.map((p) => mapProduct(p, shopDomain)));

    const linkHeader = res.headers.get("link") ?? "";
    const nextMatch = linkHeader.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    pageInfo = nextMatch ? nextMatch[1] : null;
    if (!pageInfo) break;
  }

  return products;
}

export async function syncShopifyCatalog(
  orgId: string,
  catalogId: string
): Promise<{ upserted: number }> {
  const products = await listShopifyProducts(orgId);
  const supabase = createServiceClient();

  const rows = products.map((p) => ({
    organization_id: orgId,
    catalog_id: catalogId,
    external_id: p.externalId,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency,
    image_url: p.imageUrl,
    url: p.url,
    status: p.status,
    raw_data: p.rawData,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "catalog_id,external_id" });

  if (error) throw new Error(`Shopify catalog upsert failed: ${error.message}`);
  return { upserted: rows.length };
}
