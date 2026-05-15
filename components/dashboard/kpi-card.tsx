import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
};

export function KpiCard({ label, value, delta, deltaLabel }: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isFlat = delta !== undefined && delta === 0;

  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-3">
      <span className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide font-medium">
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold text-[color:var(--adflow-fg)] font-mono tabular-nums">
          {value}
        </span>
        {delta !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium shrink-0",
              isPositive && "text-[color:var(--adflow-success)]",
              isNegative && "text-[color:var(--adflow-danger)]",
              isFlat && "text-[color:var(--adflow-fg-muted)]"
            )}
          >
            {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
            {isFlat && <Minus className="w-3.5 h-3.5" />}
            <span>
              {deltaLabel ?? `${delta > 0 ? "+" : ""}${delta}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
