import { cn } from "@/lib/utils";
import { formatLimit } from "@/lib/stripe/plans";

type UsageMeterProps = {
  label: string;
  current: number;
  limit: number;
  className?: string;
};

export function UsageMeter({ label, current, limit, className }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isWarning = pct >= 80 && !isUnlimited;
  const isDanger = pct >= 100 && !isUnlimited;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-[color:var(--adflow-fg-muted)]">{label}</span>
        <span className="font-mono text-[color:var(--adflow-fg)]">
          {current} / {formatLimit(limit)}
        </span>
      </div>
      <div className="h-1.5 bg-[color:var(--adflow-border)] rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full w-full bg-success opacity-40 rounded-full" />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isDanger ? "bg-danger" : isWarning ? "bg-warning" : "bg-data"
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
