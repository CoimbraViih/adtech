import { fetchNuvemshop } from "./client";
import { createServiceClient } from "@/lib/supabase/service";
import type { CanonicalProduct } from "@/lib/commerce/types";

type NuvemshopApiProduct = {
  id: number;
  name: { pt: string } | string;
  description?: { pt: string } | string | null;
  variants?: Array<{ price?: string }>;
  images?: Array<{ src?: string }>;
  canonical_url?: string;
  published?: boolean;
};

function mapProduct(p: NuvemshopApiProduct): CanonicalProduct {
  const title = typeof p.name === "object" ? (p.name as { pt: string }).pt : String(p.name);
  const description =
    p.description
      ? (typeof p.description === "object" ? (p.description as { pt: string }).pt : String(p.description))
      : null;
  const price = p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : null;
  const imageUrl = p.images?.[0]?.src ?? null;

  return {
    externalId: String(p.id),
    title,
    description,
    price,
    currency: "BRL",
    imageUrl,
    url: p.canonical_url ?? null,
    status: p.published === false ? "archived" : "active",
    rawData: p as unknown as Record<string, unknown>,
  };
}

export async function listNuvemshopProducts(orgId: string): Promise<CanonicalProduct[]> {
  const products: CanonicalProduct[] = [];
  let page = 1;

  while (true) {
    const res = await fetchNuvemshop(orgId, `/products?page=${page}&per_page=50`);
    if (!res.ok) throw new Error(`Nuvemshop catalog fetch failed: ${res.status}`);

    const data = await res.json() as NuvemshopApiProduct[];
    if (!data.length) break;

    products.push(...data.map(mapProduct));
    page++;
  }

  return products;
}

export async function syncNuvemshopCatalog(
  orgId: string,
  catalogId: string
): Promise<{ upserted: number }> {
  const products = await listNuvemshopProducts(orgId);
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

  if (error) throw new Error(`Nuvemshop catalog upsert failed: ${error.message}`);
  return { upserted: rows.length };
}
