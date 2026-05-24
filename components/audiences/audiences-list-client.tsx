"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Audience, AudienceType } from "@/types/database";

type FilterTab = "all" | AudienceType;

type Props = { audiences: Audience[] };

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

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "behavioral", label: "Comportamental" },
  { value: "lookalike", label: "Lookalike" },
  { value: "custom", label: "Customizado" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AudiencesListClient({ audiences }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audiences.filter((a) => {
      const matchesQuery = q === "" || a.name.toLowerCase().includes(q);
      const matchesFilter = filter === "all" || a.type === filter;
      return matchesQuery && matchesFilter;
    });
  }, [audiences, query, filter]);

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar audiência..."
            className="pl-9 bg-base border-border"
            aria-label="Buscar audiência"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-accent text-white"
                  : "bg-surface border border-border text-muted hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
          Nenhuma audiência encontrada para a busca atual.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                  Tamanho Estimado
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">
                  Regras
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                  Criado em
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((audience) => (
                <tr key={audience.id} className="hover:bg-base/40 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{audience.name}</p>
                      {audience.description && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-1">
                          {audience.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        TYPE_BADGE_CLASS[audience.type]
                      )}
                    >
                      {TYPE_LABELS[audience.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    ~{new Intl.NumberFormat("pt-BR").format(audience.size_estimate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {audience.rules.length > 0 ? (
                      <span className="text-white">{audience.rules.length} regras</span>
                    ) : (
                      <span className="text-muted">Sem regras</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(audience.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/audiences/${audience.id}`}
                      className="text-data hover:text-data/80 text-sm transition-colors"
                    >
                      Ver detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
