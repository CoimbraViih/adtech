import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/campaigns/status-badge";
import { PlatformIcon } from "@/components/campaigns/platform-icon";
import { CampaignCharts } from "@/components/campaigns/campaign-charts";
import { AdSetsTable } from "@/components/campaigns/ad-sets-table";
import { DiagnosticCard } from "@/components/diagnostics/diagnostic-card";
import { SeveritySummary } from "@/components/diagnostics/severity-summary";
import { RunDiagnosticsButton } from "@/components/diagnostics/run-diagnostics-button";
import { CampaignAssetsSection } from "@/components/campaigns/campaign-assets-section";
import { getAssetsByCampaign } from "@/lib/storage/creative-assets";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();

  const [campaignRes, adSetsRes, diagnosticsRes, snapshotsRes, campaignAssets] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", session.workspace.id)
        .single(),
      supabase
        .from("ad_sets")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_diagnostics")
        .select("*")
        .eq("campaign_id", id)
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_metrics_daily")
        .select("*")
        .eq("campaign_id", id)
        .gte(
          "date",
          new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
        )
        .order("date", { ascending: true }),
      getAssetsByCampaign(id),
    ]);

  if (!campaignRes.data) notFound();

  const campaign = campaignRes.data;
  const adSets = adSetsRes.data ?? [];
  const diagnostics = diagnosticsRes.data ?? [];
  const snapshots = snapshotsRes.data ?? [];

  const ctr =
    campaign.impressions > 0
      ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
      : null;

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "Gasto total", value: `R$ ${fmt(campaign.spend, 2)}` },
    { label: "Receita", value: `R$ ${fmt(campaign.revenue, 2)}` },
    {
      label: "ROAS",
      value: campaign.roas !== null ? `${fmt(campaign.roas, 2)}x` : "—",
      sub: "Retorno sobre gasto",
    },
    {
      label: "CPA",
      value: campaign.cpa !== null ? `R$ ${fmt(campaign.cpa, 2)}` : "—",
      sub: "Custo por conversão",
    },
    {
      label: "Impressões",
      value: campaign.impressions > 0 ? fmt(campaign.impressions) : "—",
    },
    { label: "Cliques", value: campaign.clicks > 0 ? fmt(campaign.clicks) : "—" },
    { label: "CTR", value: ctr !== null ? `${ctr}%` : "—", sub: "Taxa de clique" },
    { label: "Conversões", value: fmt(campaign.conversions) },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[color:var(--adflow-fg-muted)]">
        <Link
          href="/campaigns"
          className="flex items-center gap-1 hover:text-[color:var(--adflow-fg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Campanhas
        </Link>
        <span>/</span>
        <span className="text-[color:var(--adflow-fg)] truncate max-w-xs">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-start gap-3">
          <PlatformIcon platform={campaign.platform} size={36} />
          <div>
            <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={campaign.status} />
              <span className="text-xs text-[color:var(--adflow-fg-muted)] capitalize">
                {campaign.objective.replace("_", " ")}
              </span>
              <span className="text-xs text-[color:var(--adflow-fg-muted)]">·</span>
              <span className="text-xs text-[color:var(--adflow-fg-muted)]">
                Desde {new Date(campaign.start_date).toLocaleDateString("pt-BR")}
              </span>
              {campaign.external_id && (
                <>
                  <span className="text-xs text-[color:var(--adflow-fg-muted)]">·</span>
                  <span className="text-xs font-mono text-[color:var(--adflow-fg-muted)]">
                    ID: {campaign.external_id}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-[color:var(--adflow-fg-muted)]">Orçamento diário</p>
          <p className="text-lg font-semibold text-[color:var(--adflow-fg)]">
            R$ {fmt(campaign.daily_budget, 2)}
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4"
          >
            <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-semibold tabular-nums text-[color:var(--adflow-fg)]">
              {stat.value}
            </p>
            {stat.sub && (
              <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <CampaignCharts snapshots={snapshots} />

      {/* Ad Sets */}
      {adSets.length > 0 && (
        <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
          <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-4">
            Conjuntos de anúncios ({adSets.length})
          </h2>
          <AdSetsTable adSets={adSets} />
        </div>
      )}

      {/* Assets */}
      <CampaignAssetsSection
        workspaceId={session.workspace.id}
        campaignId={id}
        initialAssets={campaignAssets}
      />

      {/* Diagnostics */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">Diagnósticos</h2>
          <RunDiagnosticsButton workspaceId={session.workspace.id} campaignId={id} />
        </div>

        {diagnostics.length >= 2 && <SeveritySummary diagnostics={diagnostics} />}

        {diagnostics.length === 0 ? (
          <p className="text-sm text-[color:var(--adflow-fg-muted)] py-4 text-center">
            Nenhum problema detectado — rode uma análise para começar.
          </p>
        ) : (
          <div className="space-y-3">
            {diagnostics.map((d) => (
              <DiagnosticCard key={d.id} diagnostic={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
