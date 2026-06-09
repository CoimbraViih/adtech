import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ComponentType } from "react";
import { ChevronLeft, Activity, Target, TrendingUp, DollarSign, BarChart2 } from "lucide-react";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/campaigns/status-badge";
import { RtbPerformance } from "@/components/campaigns/rtb-performance";
import { RtbAssetsSection } from "@/components/campaigns/rtb-assets-section";
import { getAssetsByRtbCampaign } from "@/lib/storage/creative-assets";
import { cn } from "@/lib/utils";
import type { BidOutcome } from "@/types/database";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

const OUTCOME_CONFIG: Record<BidOutcome, { label: string; classes: string }> = {
  win: {
    label: "Win",
    classes:
      "bg-[color:var(--adflow-success)]/15 text-[color:var(--adflow-success)] border-[color:var(--adflow-success)]/30",
  },
  loss: {
    label: "Loss",
    classes:
      "bg-[color:var(--adflow-fg-muted)]/10 text-[color:var(--adflow-fg-muted)] border-[color:var(--adflow-border)]",
  },
  no_bid: {
    label: "No Bid",
    classes:
      "bg-[color:var(--adflow-warning)]/15 text-[color:var(--adflow-warning)] border-[color:var(--adflow-warning)]/30",
  },
  error: {
    label: "Erro",
    classes:
      "bg-[color:var(--adflow-danger)]/15 text-[color:var(--adflow-danger)] border-[color:var(--adflow-danger)]/30",
  },
};

function OutcomeBadge({ outcome }: { outcome: BidOutcome }) {
  const config = OUTCOME_CONFIG[outcome];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.classes
      )}
    >
      {config.label}
    </span>
  );
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  open: "Open Market",
  private: "Deal Privado",
  preferred: "Preferencial",
  guaranteed: "Garantido",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProgrammaticDetailPage({ params }: PageProps) {
  const { id } = await params;

  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const [campaignRes, bidLogRes, rtbAssets] = await Promise.all([
    supabase
      .from("rtb_campaigns")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", session.workspace.id)
      .single(),
    supabase
      .from("bid_requests_log")
      .select("*")
      .eq("rtb_campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    getAssetsByRtbCampaign(id),
  ]);

  if (!campaignRes.data) notFound();

  const campaign = campaignRes.data;
  const bidLog = bidLogRes.data ?? [];

  const winRate =
    campaign.win_rate !== null ? fmt(campaign.win_rate * 100, 1) + "%" : "—";
  const avgCpm =
    campaign.avg_cpm !== null ? `R$ ${fmt(campaign.avg_cpm, 2)}` : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/campaigns/programmatic"
          className="flex items-center gap-1 text-sm text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)] flex-1 min-w-0 truncate">
          {campaign.name}
        </h1>
        <StatusBadge status={campaign.status} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SmallKpi label="Impressões" value={fmt(campaign.impressions)} icon={Activity} />
        <SmallKpi label="Wins" value={fmt(campaign.wins)} icon={Target} />
        <SmallKpi
          label="Win Rate"
          value={winRate}
          icon={TrendingUp}
          highlight={campaign.win_rate !== null && campaign.win_rate >= 0.4}
        />
        <SmallKpi label="CPM Médio" value={avgCpm} icon={BarChart2} />
        <SmallKpi label="Gasto" value={`R$ ${fmt(campaign.spend, 2)}`} icon={DollarSign} />
      </div>

      {/* Performance charts */}
      <RtbPerformance bidLog={bidLog} />

      {/* Bid Log */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-4">
          Log de Lances — últimas {bidLog.length} entradas
        </h2>
        {bidLog.length === 0 ? (
          <p className="text-sm text-[color:var(--adflow-fg-muted)] text-center py-8">
            Nenhum lance registrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--adflow-border)]">
                  <th className="text-left px-3 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                    Auction ID
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                    Domínio
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                    CPM Ofertado
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                    Latência
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--adflow-border)]">
                {bidLog.map((bid) => (
                  <tr
                    key={bid.id}
                    className="hover:bg-[color:var(--adflow-border)]/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--adflow-fg-muted)]">
                      {bid.auction_id.slice(0, 12)}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[color:var(--adflow-fg)]">
                      {bid.domain ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums">
                      {bid.bid_cpm !== null ? (
                        `R$ ${fmt(bid.bid_cpm, 2)}`
                      ) : (
                        <span className="text-[color:var(--adflow-fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <OutcomeBadge outcome={bid.outcome as BidOutcome} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-[color:var(--adflow-fg-muted)]">
                      {bid.response_ms !== null ? `${bid.response_ms}ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config Section */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-4">
          Configuração da Campanha
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ConfigItem label="Deal Type" value={DEAL_TYPE_LABELS[campaign.deal_type] ?? campaign.deal_type} />
          <ConfigItem label="CPM Piso" value={`R$ ${fmt(campaign.floor_cpm, 2)}`} />
          <ConfigItem label="CPM Máximo" value={`R$ ${fmt(campaign.max_cpm, 2)}`} />
          <ConfigItem
            label="Frequency Cap"
            value={`${campaign.frequency_cap}x / ${campaign.frequency_cap_hours}h`}
          />
          <ConfigItem
            label="Pacing"
            value={campaign.pacing === "even" ? "Distribuído" : "ASAP"}
          />
          <ConfigItem label="Budget Diário" value={`R$ ${fmt(campaign.daily_budget, 2)}`} />
          <ConfigItem
            label="Budget Total"
            value={
              campaign.total_budget !== null
                ? `R$ ${fmt(campaign.total_budget, 2)}`
                : "Sem limite"
            }
          />
          <ConfigItem
            label="Audiência"
            value={campaign.audience_id ? "Audiência vinculada" : "Sem audiência"}
            highlight={!!campaign.audience_id}
          />
        </div>
      </div>

      {/* Banners */}
      <RtbAssetsSection
        workspaceId={session.workspace.id}
        rtbCampaignId={id}
        initialAssets={rtbAssets}
      />
    </div>
  );
}

function SmallKpi({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          {label}
        </span>
        <div className="w-6 h-6 rounded-md bg-[color:var(--adflow-border)] flex items-center justify-center">
          <Icon className="w-3 h-3 text-[color:var(--adflow-fg-muted)]" />
        </div>
      </div>
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          highlight ? "text-[color:var(--adflow-success)]" : "text-[color:var(--adflow-fg)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ConfigItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wider font-medium">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          highlight ? "text-[color:var(--adflow-success)]" : "text-[color:var(--adflow-fg)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
