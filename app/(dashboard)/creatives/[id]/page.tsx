import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Clock, Link2 } from "lucide-react";
import { MOCK_CREATIVES } from "@/lib/creatives/mock-data";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns/mock-data";
import { CreativeTypeBadge } from "@/components/creatives/creative-type-badge";
import { CreativeScore } from "@/components/creatives/creative-score";
import { PolicyChecker } from "@/components/creatives/policy-checker";
import { StatusBadge } from "@/components/campaigns/status-badge";
import { AssetUploader } from "@/components/creatives/asset-uploader";
import { getAssetsByCreative } from "@/lib/storage/creative-assets";
type AnyStatus = Parameters<typeof StatusBadge>[0]["status"];

export default async function CreativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // TODO(M3-backend): replace with Supabase query
  const creative = MOCK_CREATIVES.find((c) => c.id === id);
  if (!creative) notFound();

  // TODO(M15-backend): replace with real session.workspace.id
  const workspaceId = "ws_demo";
  const initialAssets = await getAssetsByCreative(id);

  const campaign = creative.campaign_id
    ? MOCK_CAMPAIGNS.find((c) => c.id === creative.campaign_id)
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[color:var(--adflow-fg-muted)]">
        <Link
          href="/creatives"
          className="flex items-center gap-1 hover:text-[color:var(--adflow-fg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Criativos
        </Link>
        <span>/</span>
        <span className="text-[color:var(--adflow-fg)] truncate max-w-xs">{creative.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">{creative.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <CreativeTypeBadge type={creative.type} />
            <StatusBadge status={creative.status as AnyStatus} />
            {creative.format && (
              <span className="text-xs text-[color:var(--adflow-fg-muted)] font-mono">
                {creative.format}
              </span>
            )}
            <span className="text-xs text-[color:var(--adflow-fg-muted)]">·</span>
            <span className="text-xs text-[color:var(--adflow-fg-muted)]">
              v{creative.version}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign && (
            <Link
              href={`/campaigns/${campaign.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:border-[color:var(--adflow-fg-muted)] transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {campaign.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: preview + content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Asset preview */}
          {(creative.asset_url || creative.thumbnail_url) && (
            <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
              <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-3">
                Preview
              </h2>
              <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden bg-[color:var(--adflow-border)]">
                <Image
                  src={creative.thumbnail_url ?? creative.asset_url!}
                  alt={creative.name}
                  fill
                  className="object-cover"
                  sizes="500px"
                />
              </div>
            </div>
          )}

          {/* Copy content */}
          {creative.type === "copy" && (
            <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4 space-y-4">
              <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                Conteúdo
              </h2>
              <div className="space-y-3">
                {creative.headline && (
                  <div>
                    <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-1">
                      Headline
                    </p>
                    <p className="text-base font-semibold text-[color:var(--adflow-fg)]">
                      {creative.headline}
                    </p>
                  </div>
                )}
                {creative.description && (
                  <div>
                    <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-1">
                      Descrição
                    </p>
                    <p className="text-sm text-[color:var(--adflow-fg)] leading-relaxed">
                      {creative.description}
                    </p>
                  </div>
                )}
                {creative.cta && (
                  <div>
                    <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-1">
                      CTA
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[color:var(--adflow-accent)] text-white text-sm font-medium">
                      {creative.cta}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prompt */}
          {creative.prompt && (
            <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
              <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-2">
                Prompt utilizado
              </h2>
              <p className="text-xs text-[color:var(--adflow-fg-muted)] font-mono leading-relaxed bg-[color:var(--adflow-base)] rounded-lg px-3 py-2.5">
                {creative.prompt}
              </p>
              {creative.model_used && (
                <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-1.5">
                  Modelo: <span className="font-mono">{creative.model_used}</span>
                </p>
              )}
            </div>
          )}

          {/* Version history */}
          <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
            <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-3">
              Histórico de versões
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Clock className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)] shrink-0" />
                <div>
                  <p className="text-xs text-[color:var(--adflow-fg)]">Versão {creative.version} (atual)</p>
                  <p className="text-xs text-[color:var(--adflow-fg-muted)]">
                    {new Date(creative.updated_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {creative.version > 1 && creative.parent_id && (
                <p className="text-xs text-[color:var(--adflow-fg-muted)] pl-6">
                  Versão anterior: v{creative.version - 1}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: score + policy */}
        <div className="space-y-4">
          {/* Score */}
          <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
            <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-4">
              Score de qualidade
            </h2>
            {creative.score !== null ? (
              <div className="flex justify-center">
                <CreativeScore
                  score={creative.score}
                  breakdown={creative.score_breakdown}
                  size="lg"
                />
              </div>
            ) : (
              <p className="text-xs text-[color:var(--adflow-fg-muted)] text-center py-4">
                Score não calculado ainda
              </p>
            )}
          </div>

          {/* Policy check */}
          <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
            <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-3">
              Checagem de política
            </h2>
            {creative.policy_items ? (
              <PolicyChecker items={creative.policy_items} />
            ) : (
              <p className="text-xs text-[color:var(--adflow-fg-muted)] text-center py-4">
                Checagem não executada ainda
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Informações
            </h2>
            {[
              { label: "Criado em", value: new Date(creative.created_at).toLocaleDateString("pt-BR") },
              { label: "Campanha", value: campaign?.name ?? "—" },
              { label: "Workspace", value: creative.workspace_id },
              { label: "ID", value: creative.id },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[color:var(--adflow-fg-muted)]">{label}</p>
                <p className="text-xs text-[color:var(--adflow-fg)] font-mono truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assets section */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5">
        <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider mb-4">
          Assets do criativo
        </h2>
        <AssetUploader
          workspaceId={workspaceId}
          creativeId={id}
          initialAssets={initialAssets}
        />
      </div>
    </div>
  );
}
