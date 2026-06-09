import Link from "next/link";
import { ArrowRight, Play, Pause, FileText, Archive } from "lucide-react";
import type { CampaignStatusCounts } from "@/types/dashboard";

type Props = { counts: CampaignStatusCounts };

const STATUS_ROWS = [
  { key: "active" as const, label: "Ativas", icon: Play, color: "text-[color:var(--adflow-success)]", dot: "bg-[color:var(--adflow-success)]" },
  { key: "paused" as const, label: "Pausadas", icon: Pause, color: "text-[color:var(--adflow-warning)]", dot: "bg-[color:var(--adflow-warning)]" },
  { key: "draft" as const, label: "Rascunhos", icon: FileText, color: "text-[color:var(--adflow-fg-muted)]", dot: "bg-[color:var(--adflow-fg-muted)]" },
  { key: "archived" as const, label: "Arquivadas", icon: Archive, color: "text-[color:var(--adflow-border)]", dot: "bg-[color:var(--adflow-border)]" },
];

export function CampaignStatusHub({ counts }: Props) {
  const total = counts.active + counts.paused + counts.draft + counts.archived;
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[color:var(--adflow-fg)]">Campanhas</h3>
        <span className="text-xs text-[color:var(--adflow-fg-muted)]">{total} total</span>
      </div>

      {/* Mini stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {STATUS_ROWS.map((s) => {
          const pct = total > 0 ? (counts[s.key] / total) * 100 : 0;
          return pct > 0 ? (
            <div key={s.key} className={`${s.dot} h-full`} style={{ width: `${pct}%` }} />
          ) : null;
        })}
      </div>

      <div className="space-y-2">
        {STATUS_ROWS.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-[color:var(--adflow-fg-muted)]">{s.label}</span>
            </div>
            <span className={`text-sm font-semibold tabular-nums ${s.color}`}>{counts[s.key]}</span>
          </div>
        ))}
      </div>

      <Link
        href="/campaigns"
        className="flex items-center gap-1 text-xs text-[color:var(--adflow-accent)] hover:underline mt-auto"
      >
        Ver campanhas <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
