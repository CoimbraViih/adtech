export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { getCredentials } from "@/lib/integrations/credentials";
import { createServiceClient } from "@/lib/supabase/service";
import { CommerceConnectCard } from "@/components/settings/commerce-connect-card";
import type { CommerceProvider } from "@/lib/commerce/types";

type CatalogRow = {
  provider: string;
  external_store_id: string;
  synced_at: string | null;
};

async function loadCommerceState(orgId: string): Promise<Map<CommerceProvider, CatalogRow>> {
  const supabase = createServiceClient();
  const { data } = (await supabase
    .from("product_catalogs")
    .select("provider, external_store_id, synced_at")
    .eq("organization_id", orgId)) as { data: CatalogRow[] | null };

  const map = new Map<CommerceProvider, CatalogRow>();
  for (const row of data ?? []) {
    map.set(row.provider as CommerceProvider, row);
  }
  return map;
}

export default async function CommerceIntegrationsPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const [catalogMap, nuvemCreds, shopifyCreds, vtexCreds] = await Promise.all([
    loadCommerceState(session.organization.id),
    getCredentials(session.organization.id, "nuvemshop"),
    getCredentials(session.organization.id, "shopify"),
    getCredentials(session.organization.id, "vtex"),
  ]);

  const platforms: Array<{
    provider: CommerceProvider;
    label: string;
    logo: string;
    mode: "oauth" | "apikey";
    isConnected: boolean;
  }> = [
    {
      provider: "nuvemshop",
      label: "Nuvemshop",
      logo: "🛒",
      mode: "oauth",
      isConnected: nuvemCreds?.oauth_connected === "true",
    },
    {
      provider: "shopify",
      label: "Shopify",
      logo: "🛍️",
      mode: "oauth",
      isConnected: shopifyCreds?.oauth_connected === "true",
    },
    {
      provider: "vtex",
      label: "VTEX",
      logo: "🔶",
      mode: "apikey",
      isConnected: !!(vtexCreds?.app_key && vtexCreds?.app_token),
    },
  ];

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">E-commerce</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Conecte sua loja para importar catálogo e registrar conversões automaticamente.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {platforms.map((p) => {
          const catalog = catalogMap.get(p.provider);
          return (
            <CommerceConnectCard
              key={p.provider}
              provider={p.provider}
              label={p.label}
              logo={p.logo}
              mode={p.mode}
              isConnected={p.isConnected}
              connectedStoreId={catalog?.external_store_id}
              lastSynced={catalog?.synced_at}
            />
          );
        })}
      </div>
    </div>
  );
}
