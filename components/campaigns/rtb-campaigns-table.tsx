"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  Pause,
  Play,
  Archive,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RtbCampaign } from "@/types/database";
import { StatusBadge } from "./status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

type DealTypeBadgeProps = {
  dealType: RtbCampaign["deal_type"];
};

const DEAL_TYPE_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  open: {
    label: "Open",
    classes:
      "bg-[color:var(--adflow-data)]/15 text-[color:var(--adflow-data)] border-[color:var(--adflow-data)]/30",
  },
  private: {
    label: "Privado",
    classes:
      "border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]",
  },
  preferred: {
    label: "Preferencial",
    classes:
      "bg-[color:var(--adflow-warning)]/15 text-[color:var(--adflow-warning)] border-[color:var(--adflow-warning)]/30",
  },
  guaranteed: {
    label: "Garantido",
    classes:
      "bg-[color:var(--adflow-success)]/15 text-[color:var(--adflow-success)] border-[color:var(--adflow-success)]/30",
  },
};

function DealTypeBadge({ dealType }: DealTypeBadgeProps) {
  const config = DEAL_TYPE_CONFIG[dealType] ?? {
    label: dealType,
    classes: "",
  };
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

type RtbCampaignsTableProps = {
  campaigns: RtbCampaign[];
};

export function RtbCampaignsTable({ campaigns }: RtbCampaignsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = campaigns.filter((c) =>
    search.trim()
      ? c.name.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
          <input
            type="text"
            placeholder="Buscar campanhas RTB..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition"
          />
        </div>
        <span className="ml-auto text-xs text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
          {filtered.length} campanha{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[color:var(--adflow-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Nome
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Deal Type
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Max CPM
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Budget/Dia
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Impressões
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--adflow-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-sm text-[color:var(--adflow-fg-muted)]"
                  >
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((campaign) => (
                  <RtbCampaignRow key={campaign.id} campaign={campaign} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RtbCampaignRow({ campaign }: { campaign: RtbCampaign }) {
  return (
    <tr className="hover:bg-[color:var(--adflow-surface)]/60 transition-colors group">
      <td className="px-4 py-3">
        <Link
          href={`/campaigns/programmatic/${campaign.id}`}
          className="font-medium text-[color:var(--adflow-fg)] hover:text-[color:var(--adflow-accent)] transition-colors line-clamp-1"
        >
          {campaign.name}
        </Link>
        {campaign.deal_id && (
          <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5 font-mono">
            {campaign.deal_id}
          </p>
        )}
      </td>

      <td className="px-3 py-3">
        <StatusBadge status={campaign.status} />
      </td>

      <td className="px-3 py-3">
        <DealTypeBadge dealType={campaign.deal_type} />
      </td>

      <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
        R$ {fmt(campaign.max_cpm, 2)}
      </td>

      <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
        R$ {fmt(campaign.daily_budget, 2)}
      </td>

      <td className="px-3 py-3 text-right text-sm tabular-nums">
        {campaign.impressions > 0 ? (
          fmt(campaign.impressions)
        ) : (
          <span className="text-[color:var(--adflow-fg-muted)]">—</span>
        )}
      </td>

      <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
        {campaign.win_rate !== null ? (
          <span
            className={
              campaign.win_rate >= 0.5
                ? "text-[color:var(--adflow-success)]"
                : campaign.win_rate >= 0.3
                ? "text-[color:var(--adflow-warning)]"
                : "text-[color:var(--adflow-danger)]"
            }
          >
            {fmt(campaign.win_rate * 100, 1)}%
          </span>
        ) : (
          <span className="text-[color:var(--adflow-fg-muted)]">—</span>
        )}
      </td>

      <td className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="sr-only">Ações</span>
              </Button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)]"
          >
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              render={<Link href={`/campaigns/programmatic/${campaign.id}`} />}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver detalhe
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[color:var(--adflow-border)]" />
            {campaign.status === "active" && (
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </DropdownMenuItem>
            )}
            {campaign.status === "paused" && (
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                <Play className="w-3.5 h-3.5" />
                Ativar
              </DropdownMenuItem>
            )}
            {campaign.status !== "archived" && (
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-[color:var(--adflow-danger)]">
                <Archive className="w-3.5 h-3.5" />
                Arquivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
