import { cn } from "@/lib/utils";
import { TIERS, formatFeeBRL } from "@/lib/billing/fee-calculator";

export type SpendMeterProps = {
  currentBRL: number;
  label?: string;
  className?: string;
};

const TIER_COLORS = ["bg-[color:var(--adflow-data)]", "bg-[color:var(--adflow-warning)]", "bg-[color:var(--adflow-success)]"];

/**
 * Visual spend meter showing where current managed spend falls across
 * the three AdFlow fee tiers (10% / 5% / 3%).
 */
export function SpendMeter({ currentBRL, label = "Gasto gerenciado este mês", className }: SpendMeterProps) {
  // Tier boundaries: [0, 2000], [2000, 5000], [5000, ∞]
  // For visualization we cap the "infinite" tier at 10000 BRL.
  const VISUAL_CAP = 10_000;

  const tier1End = 2000;
  const tier2End = 5000;
  const totalVisual = VISUAL_CAP;

  // Segment widths as % of totalVisual
  const tier1Width = (tier1End / totalVisual) * 100;               // 20%
  const tier2Width = ((tier2End - tier1End) / totalVisual) * 100;  // 30%
  const tier3Width = 100 - tier1Width - tier2Width;                 // 50%

  // Clamp current for the indicator position
  const clampedCurrent = Math.min(currentBRL, totalVisual);
  const indicatorPct = (clampedCurrent / totalVisual) * 100;

  // Which tier label to highlight
  const activeTierIdx =
    currentBRL <= tier1End ? 0 : currentBRL <= tier2End ? 1 : 2;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[color:var(--adflow-fg-muted)]">{label}</span>
        <span className="text-sm font-mono font-semibold text-[color:var(--adflow-fg)]">
          {formatFeeBRL(currentBRL)}
        </span>
      </div>

      {/* Segmented progress bar */}
      <div className="relative h-2 flex rounded-full overflow-hidden gap-px">
        {TIERS.map((tier, i) => {
          const widths = [tier1Width, tier2Width, tier3Width];
          const isFilled = activeTierIdx > i;
          const isActive = activeTierIdx === i;
          return (
            <div
              key={i}
              className={cn(
                "h-full rounded-sm",
                TIER_COLORS[i],
                isFilled ? "opacity-100" : isActive ? "opacity-70" : "opacity-20"
              )}
              style={{ width: `${widths[i]}%` }}
            />
          );
        })}

        {/* Current position indicator */}
        {currentBRL > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white opacity-90 rounded-full"
            style={{ left: `${Math.min(indicatorPct, 99)}%` }}
          />
        )}
      </div>

      {/* Tier legend */}
      <div className="flex gap-4 flex-wrap">
        {TIERS.map((tier, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-sm", TIER_COLORS[i])} />
            <span className={cn(
              "text-xs",
              activeTierIdx === i
                ? "text-[color:var(--adflow-fg)]"
                : "text-[color:var(--adflow-fg-muted)]"
            )}>
              {i === 0 ? "R$0–2k" : i === 1 ? "R$2k–5k" : "+R$5k"} → {tier.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
