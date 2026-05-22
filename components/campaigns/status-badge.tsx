import { cn } from "@/lib/utils";
import type { CampaignStatus, AdSetStatus, AdStatus } from "@/types/database";

type AnyStatus = CampaignStatus | AdSetStatus | AdStatus;

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  active:    { label: "Ativo",      classes: "bg-[color:var(--adflow-success)]/15 text-[color:var(--adflow-success)] border-[color:var(--adflow-success)]/30" },
  paused:    { label: "Pausado",    classes: "bg-[color:var(--adflow-warning)]/15 text-[color:var(--adflow-warning)] border-[color:var(--adflow-warning)]/30" },
  draft:     { label: "Rascunho",   classes: "bg-[color:var(--adflow-fg-muted)]/10 text-[color:var(--adflow-fg-muted)] border-[color:var(--adflow-border)]" },
  archived:  { label: "Arquivado",  classes: "bg-[color:var(--adflow-border)]/50 text-[color:var(--adflow-fg-muted)] border-[color:var(--adflow-border)]" },
  in_review: { label: "Em revisão", classes: "bg-[color:var(--adflow-data)]/15 text-[color:var(--adflow-data)] border-[color:var(--adflow-data)]/30" },
  rejected:  { label: "Reprovado",  classes: "bg-[color:var(--adflow-danger)]/15 text-[color:var(--adflow-danger)] border-[color:var(--adflow-danger)]/30" },
};

type StatusBadgeProps = {
  status: AnyStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, classes: "" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.classes,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {config.label}
    </span>
  );
}
