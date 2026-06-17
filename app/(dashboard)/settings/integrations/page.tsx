export const dynamic = "force-dynamic";

import { IntegrationsGrid } from "@/components/settings/integrations-grid";
import { requireServerSession } from "@/lib/supabase/server";
import { listCredentialStatuses, getOAuthConnectedProviders, type OAuthConnectedInfo } from "@/lib/integrations/credentials";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import type { IntegrationStatus, SyncRun } from "@/types/database";

const SYNC_PLATFORMS = new Set(["meta", "google", "tiktok", "linkedin"]);

async function fetchLatestSyncRuns(workspaceId: string): Promise<Map<string, SyncRun>> {
  const supabase = createServiceClient();

  // Fetch the most-recent run per platform in a single query.
  // TODO(M-ADS-backend): when the real Supabase client is wired, this query
  // executes as:
  //   SELECT DISTINCT ON (platform) * FROM sync_runs
  //   WHERE workspace_id = $1
  //   ORDER BY platform, started_at DESC
  // The stub returns null, so the map will be empty — no sync status shown.
  const { data } = (await supabase
    .from("sync_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(100)) as { data: SyncRun[] | null };

  const map = new Map<string, SyncRun>();
  if (!data) return map;

  for (const row of data) {
    // keep only the first (most recent) row per platform
    if (!map.has(row.platform)) {
      map.set(row.platform, row);
    }
  }

  return map;
}

export default async function IntegrationsPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch (err) {
    const isUnauthenticated = err instanceof Error && err.message === "UNAUTHENTICATED";
    if (!isUnauthenticated) {
      console.error("[integrations/page] requireServerSession failed unexpectedly:", err);
      throw err;
    }
    redirect("/login");
  }

  const [configured, syncRunsMap, oauthProviders] = await Promise.all([
    listCredentialStatuses(session.organization.id),
    fetchLatestSyncRuns(session.workspace.id),
    getOAuthConnectedProviders(session.organization.id),
  ]);

  const configuredMap = new Map<string, IntegrationStatus>(
    configured.map((s) => [s.provider, s])
  );

  const categories = PROVIDER_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    providers: Object.values(PROVIDERS)
      .filter((p) => p.category === cat.key)
      .map((p) => {
        const status = configuredMap.get(p.key);
        const syncRun = SYNC_PLATFORMS.has(p.key) ? (syncRunsMap.get(p.key) ?? null) : null;
        const oauthInfo: OAuthConnectedInfo | undefined = oauthProviders.get(p.key);
        return {
          key: p.key,
          label: p.label,
          description: p.description,
          docsUrl: p.docsUrl,
          fields: p.fields.map((f) => ({
            key: f.key,
            label: f.label,
            placeholder: f.placeholder,
            helpText: f.helpText ?? null,
            secret: f.secret,
          })),
          configured: !!status,
          last_tested_at: status?.last_tested_at ?? null,
          syncRun,
          oauthConnected: oauthInfo !== undefined,
          oauthAccountId: oauthInfo?.accountId ?? null,
          oauthExpiresAt: oauthInfo?.expiresAt ?? null,
        };
      }),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <p className="text-sm text-[color:var(--adflow-fg-muted)] mb-6">
        Configure as chaves de API das plataformas. As credenciais são criptografadas e armazenadas com segurança.
      </p>
      <IntegrationsGrid
        initialCategories={categories}
        workspaceId={session.workspace.id}
      />
    </div>
  );
}
