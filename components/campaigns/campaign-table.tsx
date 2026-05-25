"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Pause,
  Play,
  Archive,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign, CampaignStatus, CampaignPlatform } from "@/types/database";
import { StatusBadge } from "./status-badge";
import { PlatformIcon, PLATFORM_LABEL } from "./platform-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n: number) {
  return `R$ ${fmt(n, 2)}`;
}

function fmtMetric(n: number | null, suffix = "") {
  if (n === null) return <span className="text-[color:var(--adflow-fg-muted)]">—</span>;
  return `${fmt(n, suffix === "x" ? 2 : 2)}${suffix}`;
}

// ── types ──────────────────────────────────────────────────────────────────

type SortKey = "name" | "spend" | "roas" | "cpa" | "impressions" | "clicks";
type SortDir = "asc" | "desc";

type CampaignTableProps = {
  campaigns: Campaign[];
  onStatusChange?: (id: string, status: CampaignStatus) => void;
};

// ── sub-components ─────────────────────────────────────────────────────────

function SortButton({
  column,
  sortKey,
  sortDir,
  onSort,
  children,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sortKey === column;
  return (
    <button
      className="flex items-center gap-1 hover:text-[color:var(--adflow-fg)] transition-colors"
      onClick={() => onSort(column)}
    >
      {children}
      {active ? (
        sortDir === "asc" ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export function CampaignTable({ campaigns, onStatusChange }: CampaignTableProps) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<CampaignPlatform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let result = campaigns;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (platformFilter !== "all") {
      result = result.filter((c) => c.platform === platformFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      const va = a[sortKey] ?? -Infinity;
      const vb = b[sortKey] ?? -Infinity;
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof va === "string") return va.localeCompare(vb as string) * dir;
      return ((va as number) - (vb as number)) * dir;
    });

    return result;
  }, [campaigns, search, platformFilter, statusFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const PLATFORMS: { value: CampaignPlatform | "all"; label: string }[] = [
    { value: "all", label: "Todas as plataformas" },
    { value: "meta", label: "Meta" },
    { value: "google", label: "Google" },
    { value: "tiktok", label: "TikTok" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "programmatic", label: "Programático" },
  ];

  const STATUSES: { value: CampaignStatus | "all"; label: string }[] = [
    { value: "all", label: "Todos os status" },
    { value: "active", label: "Ativo" },
    { value: "paused", label: "Pausado" },
    { value: "draft", label: "Rascunho" },
    { value: "archived", label: "Arquivado" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition"
          />
        </div>

        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value as CampaignPlatform | "all"); setPage(1); }}
          className="px-3 py-1.5 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as CampaignStatus | "all"); setPage(1); }}
          className="px-3 py-1.5 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <span className="ml-auto self-center text-xs text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
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
                  <SortButton column="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                    Nome
                  </SortButton>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Plataforma
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  <SortButton column="spend" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                    Gasto
                  </SortButton>
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  <SortButton column="roas" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                    ROAS
                  </SortButton>
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  <SortButton column="cpa" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                    CPA
                  </SortButton>
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  <SortButton column="impressions" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                    Impressões
                  </SortButton>
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  <SortButton column="clicks" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                    Cliques
                  </SortButton>
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
                  Budget/dia
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--adflow-border)]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-[color:var(--adflow-fg-muted)]">
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                paginated.map((campaign) => (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[color:var(--adflow-fg-muted)]">
            Página {page} de {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 px-2 text-xs"
            >
              Anterior
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="px-1 text-[color:var(--adflow-fg-muted)]">…</span>
                    )}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {p}
                    </Button>
                  </span>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="h-7 px-2 text-xs"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── row component ──────────────────────────────────────────────────────────

function CampaignRow({
  campaign,
  onStatusChange,
}: {
  campaign: Campaign;
  onStatusChange?: (id: string, status: CampaignStatus) => void;
}) {
  return (
    <tr className="hover:bg-[color:var(--adflow-surface)]/60 transition-colors group">
      <td className="px-4 py-3">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="font-medium text-[color:var(--adflow-fg)] hover:text-[color:var(--adflow-accent)] transition-colors line-clamp-1"
        >
          {campaign.name}
        </Link>
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5 capitalize">
          {campaign.objective.replace("_", " ")}
        </p>
      </td>

      <td className="px-3 py-3">
        <PlatformIcon platform={campaign.platform} size={18} showLabel />
      </td>

      <td className="px-3 py-3">
        <StatusBadge status={campaign.status} />
      </td>

      <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
        {fmtCurrency(campaign.spend)}
      </td>

      <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
        <span
          className={cn(
            campaign.roas !== null && campaign.roas >= 3
              ? "text-[color:var(--adflow-success)]"
              : campaign.roas !== null && campaign.roas >= 1.5
              ? "text-[color:var(--adflow-warning)]"
              : "text-[color:var(--adflow-danger)]"
          )}
        >
          {fmtMetric(campaign.roas, "x")}
        </span>
      </td>

      <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
        {campaign.cpa !== null ? `R$ ${fmt(campaign.cpa, 2)}` : <span className="text-[color:var(--adflow-fg-muted)]">—</span>}
      </td>

      <td className="px-3 py-3 text-right text-sm tabular-nums">
        {campaign.impressions > 0 ? fmt(campaign.impressions) : <span className="text-[color:var(--adflow-fg-muted)]">—</span>}
      </td>

      <td className="px-3 py-3 text-right text-sm tabular-nums">
        {campaign.clicks > 0 ? fmt(campaign.clicks) : <span className="text-[color:var(--adflow-fg-muted)]">—</span>}
      </td>

      <td className="px-3 py-3 text-right text-sm tabular-nums text-[color:var(--adflow-fg-muted)]">
        {fmtCurrency(campaign.daily_budget)}
      </td>

      <td className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            }
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="sr-only">Ações</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)]"
          >
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              render={<Link href={`/campaigns/${campaign.id}`} />}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[color:var(--adflow-border)]" />
            {campaign.status === "active" && (
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onStatusChange?.(campaign.id, "paused")}
              >
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </DropdownMenuItem>
            )}
            {campaign.status === "paused" && (
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onStatusChange?.(campaign.id, "active")}
              >
                <Play className="w-3.5 h-3.5" />
                Ativar
              </DropdownMenuItem>
            )}
            {campaign.status !== "archived" && (
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-[color:var(--adflow-danger)]"
                onClick={() => onStatusChange?.(campaign.id, "archived")}
              >
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
