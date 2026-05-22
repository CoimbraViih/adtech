"use client";

import { cn } from "@/lib/utils";
import type { ScoreBreakdown } from "@/types/database";

type CreativeScoreProps = {
  score: number;
  breakdown?: ScoreBreakdown | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-[color:var(--adflow-success)]";
  if (score >= 60) return "text-[color:var(--adflow-warning)]";
  return "text-[color:var(--adflow-danger)]";
}

function scoreStroke(score: number): string {
  if (score >= 80) return "var(--adflow-success)";
  if (score >= 60) return "var(--adflow-warning)";
  return "var(--adflow-danger)";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  if (score >= 50) return "Regular";
  return "Fraco";
}

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  clarity: "Clareza",
  urgency: "Urgência",
  cta_strength: "Força do CTA",
  compliance: "Conformidade",
  relevance: "Relevância",
};

export function CreativeScore({ score, breakdown, size = "md", className }: CreativeScoreProps) {
  const radius = size === "lg" ? 44 : size === "md" ? 36 : 28;
  const stroke = size === "lg" ? 6 : size === "sm" ? 4 : 5;
  const viewBox = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const textSize =
    size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: viewBox, height: viewBox }}>
          <svg
            width={viewBox}
            height={viewBox}
            viewBox={`0 0 ${viewBox} ${viewBox}`}
            className="-rotate-90"
          >
            {/* Track */}
            <circle
              cx={viewBox / 2}
              cy={viewBox / 2}
              r={radius}
              fill="none"
              stroke="var(--adflow-border)"
              strokeWidth={stroke}
            />
            {/* Progress */}
            <circle
              cx={viewBox / 2}
              cy={viewBox / 2}
              r={radius}
              fill="none"
              stroke={scoreStroke(score)}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          {/* Center text — absolutely centered over SVG */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-bold tabular-nums leading-none", textSize, scoreColor(score))}>
              {score}
            </span>
            {size !== "sm" && (
              <span className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
                {scoreLabel(score)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && size !== "sm" && (
        <div className="space-y-2">
          {(Object.keys(breakdown) as (keyof ScoreBreakdown)[]).map((key) => {
            const val = breakdown[key];
            const pct = (val / 20) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[color:var(--adflow-fg-muted)]">
                    {BREAKDOWN_LABELS[key]}
                  </span>
                  <span className="tabular-nums text-[color:var(--adflow-fg)]">
                    {val}/20
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[color:var(--adflow-border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: scoreStroke(score),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
