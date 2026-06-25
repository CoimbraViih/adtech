import { createServiceClient } from "@/lib/supabase/service";
import { syncNuvemshopCatalog } from "./nuvemshop/catalog";
import { syncShopifyCatalog } from "./shopify/catalog";
import { syncVtexCatalog } from "./vtex/catalog";
import type { CommerceProvider } from "./types";

export async function syncCommerceProvider(
  orgId: string,
  provider: CommerceProvider
): Promise<{ upserted: number }> {
  const supabase = createServiceClient();

  const { data: catalog, error } = await supabase
    .from("product_catalogs")
    .select("id, workspace_id")
    .eq("organization_id", orgId)
    .eq("provider", provider)
    .maybeSingle() as { data: { id: string; workspace_id: string } | null; error: unknown };

  if (error) throw new Error(`Failed to look up catalog: ${String(error)}`);
  if (!catalog) throw new Error(`No catalog configured for provider=${provider}`);

  let result: { upserted: number };

  if (provider === "nuvemshop") {
    result = await syncNuvemshopCatalog(orgId, catalog.id);
  } else if (provider === "shopify") {
    result = await syncShopifyCatalog(orgId, catalog.id);
  } else if (provider === "vtex") {
    result = await syncVtexCatalog(orgId, catalog.id);
  } else {
    const _never: never = provider;
    throw new Error(`Unknown provider: ${String(_never)}`);
  }

  await supabase
    .from("product_catalogs")
    .update({ synced_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("provider", provider);

  return result;
}
