import { fetchVtex } from "./client";
import { createServiceClient } from "@/lib/supabase/service";
import { getCredentialField } from "@/lib/integrations/credentials";
import type { CanonicalProduct } from "@/lib/commerce/types";

type VtexProduct = {
  ProductId?: number;
  ProductName?: string;
  Description?: string | null;
  PriceRange?: { ListPrice?: { HighPrice?: number } };
  Images?: Array<{ ImageUrl?: string }>;
  DetailUrl?: string;
  IsActive?: boolean;
};

function mapProduct(p: VtexProduct, accountName: string): CanonicalProduct {
  return {
    externalId: String(p.ProductId ?? ""),
    title: p.ProductName ?? "",
    description: p.Description ?? null,
    price: p.PriceRange?.ListPrice?.HighPrice ?? null,
    currency: "BRL",
    imageUrl: p.Images?.[0]?.ImageUrl ?? null,
    url: p.DetailUrl ? `https://${accountName}.com.br${p.DetailUrl}` : null,
    status: p.IsActive === false ? "archived" : "active",
    rawData: p as unknown as Record<string, unknown>,
  };
}

export async function listVtexProducts(orgId: string): Promise<CanonicalProduct[]> {
  const account = (await getCredentialField(orgId, "vtex", "account_name")) ?? "";
  const products: CanonicalProduct[] = [];
  let from = 0;
  const pageSize = 50;

  while (true) {
    const to = from + pageSize - 1;
    const res = await fetchVtex(
      orgId,
      `/api/catalog_system/pub/products/search?_from=${from}&_to=${to}`
    );
    if (!res.ok) throw new Error(`VTEX catalog fetch failed: ${res.status}`);

    const data = await res.json() as VtexProduct[];
    if (!data.length) break;

    products.push(...data.map((p) => mapProduct(p, account)));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return products;
}

export async function syncVtexCatalog(
  orgId: string,
  catalogId: string
): Promise<{ upserted: number }> {
  const products = await listVtexProducts(orgId);
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

  if (error) throw new Error(`VTEX catalog upsert failed: ${error.message}`);
  return { upserted: rows.length };
}
