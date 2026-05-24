import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOCK_AUDIENCES, MOCK_RTB_CAMPAIGNS } from "@/lib/rtb/mock-data";
import type { AudienceType, AudienceRule, RtbCampaignStatus } from "@/types/database";

const TYPE_LABELS: Record<AudienceType, string> = {
  behavioral: "Comportamental",
  lookalike: "Lookalike",
  custom: "Customizado",
};

const TYPE_BADGE_CLASS: Record<AudienceType, string> = {
  behavioral: "border border-data text-data bg-data/10",
  lookalike: "border border-purple-400 text-purple-400 bg-transparent",
  custom: "border border-success text-success bg-success/10",
};

const OPERATOR_LABELS: Record<AudienceRule["operator"], string> = {
  eq: "=",
  gte: "≥",
  lte: "≤",
  contains: "contém",
};

const STATUS_BADGE: Record<RtbCampaignStatus, string> = {
  active: "bg-success/10 text-success border border-success",
  paused: "bg-warning/10 text-warning border border-warning",
  draft: "bg-muted/10 text-muted border border-border",
  archived: "bg-base text-muted border border-border",
};

const STATUS_LABELS: Record<RtbCampaignStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  draft: "Rascunho",
  archived: "Arquivado",
};

type Props = { params: Promise<{ id: string }> };

export default async function AudienceDetailPage({ params }: Props) {
  const { id } = await params;

  const audience = MOCK_AUDIENCES.find((a) => a.id === id);
  if (!audience) notFound();

  const linkedCampaigns = MOCK_RTB_CAMPAIGNS.filter(
    (c) => c.audience_id === audience.id
  );

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb + title */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/audiences"
          className="text-sm text-muted hover:text-white transition-colors flex items-center gap-1"
        >
          ← Audiências
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-semibold text-white">{audience.name}</h1>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            TYPE_BADGE_CLASS[audience.type]
          )}
        >
          {TYPE_LABELS[audience.type]}
        </span>
      </div>

      {audience.description && (
        <p className="text-sm text-muted">{audience.description}</p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Tamanho Estimado</p>
          <p className="text-2xl font-bold text-data mt-1">
            ~{new Intl.NumberFormat("pt-BR").format(audience.size_estimate)}
          </p>
          <p className="text-xs text-muted mt-1">usuários</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Regras Ativas</p>
          <p className="text-2xl font-bold text-white mt-1">
            {audience.rules.length}
          </p>
          <p className="text-xs text-muted mt-1">condições de segmentação</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Campanhas que Usam</p>
          <p className="text-2xl font-bold text-success mt-1">
            {linkedCampaigns.length}
          </p>
          <p className="text-xs text-muted mt-1">campanhas programáticas</p>
        </div>
      </div>

      {/* Rules section */}
      <div>
        <h2 className="text-base font-medium text-white mb-3">
          Regras de Segmentação
        </h2>
        {audience.rules.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-muted text-sm">
            Nenhuma regra definida para esta audiência.
          </div>
        ) : (
          <div className="space-y-2">
            {audience.rules.map((rule, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span className="text-xs text-muted font-mono w-5 shrink-0">
                  {i + 1}.
                </span>
                <p className="text-sm text-white">
                  Evento{" "}
                  <span className="font-mono text-data">{rule.event_type}</span>{" "}
                  <span className="font-medium">
                    {OPERATOR_LABELS[rule.operator]}
                  </span>{" "}
                  <span className="font-mono text-accent">{String(rule.value)}</span>{" "}
                  <span className="text-muted">
                    nos últimos {rule.lookback_days} dias
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RTB Campaigns */}
      <div>
        <h2 className="text-base font-medium text-white mb-3">
          Campanhas Programáticas Vinculadas
        </h2>
        {linkedCampaigns.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-muted text-sm">
            Nenhuma campanha vinculada a esta audiência.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                    Campanha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                    CPM Máximo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linkedCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-base/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/programmatic/${campaign.id}`}
                        className="font-medium text-white hover:text-data transition-colors"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          STATUS_BADGE[campaign.status]
                        )}
                      >
                        {STATUS_LABELS[campaign.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(campaign.max_cpm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
