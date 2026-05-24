"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";

export type CompareMode = "prev_period" | "prev_year" | "none";

const PRESETS = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
] as const;

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return toIso(new Date());
}

function daysAgoIso(n: number) {
  return toIso(new Date(Date.now() - n * 86_400_000));
}

type Props = {
  currentFrom: string;
  currentTo: string;
  currentCompare: CompareMode;
};

export function GlobalDateFilter({ currentFrom, currentTo, currentCompare }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [showPicker, setShowPicker] = useState(false);
  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);

  function push(from: string, to: string, compare: CompareMode = currentCompare) {
    const next = new URLSearchParams(params.toString());
    next.set("from", from);
    next.set("to", to);
    next.set("compare", compare);
    router.replace(`${pathname}?${next.toString()}`);
    setShowPicker(false);
  }

  function applyPreset(days: number) {
    if (days === 0) {
      push(todayIso(), todayIso());
    } else {
      push(daysAgoIso(days), todayIso());
    }
  }

  function applyAllTime() {
    push("2020-01-01", todayIso(), "none");
  }

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      push(customFrom, customTo);
    }
  }

  function setCompare(compare: CompareMode) {
    push(currentFrom, currentTo, compare);
  }

  const activePreset = PRESETS.find((p) => {
    if (p.days === 0) return currentFrom === todayIso() && currentTo === todayIso();
    return currentFrom === daysAgoIso(p.days) && currentTo === todayIso();
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => applyPreset(p.days)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            activePreset?.label === p.label
              ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/10"
              : "border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:border-[color:var(--adflow-fg-muted)]"
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Todo o período */}
      <button
        onClick={applyAllTime}
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          currentFrom === "2020-01-01"
            ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/10"
            : "border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:border-[color:var(--adflow-fg-muted)]"
        }`}
      >
        Todo o período
      </button>

      {/* Custom picker toggle */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((s) => !s)}
          className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:border-[color:var(--adflow-fg-muted)] transition-colors"
        >
          <CalendarIcon className="w-3 h-3" />
          {!activePreset && currentFrom !== "2020-01-01"
            ? `${currentFrom} → ${currentTo}`
            : "Personalizado"}
          <ChevronDownIcon className="w-3 h-3" />
        </button>

        {showPicker && (
          <div className="absolute top-8 right-0 z-50 bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4 shadow-xl min-w-[260px] space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--adflow-fg-muted)]">De</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full text-xs bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-2 py-1.5 text-[color:var(--adflow-fg)] focus:outline-none focus:border-[color:var(--adflow-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--adflow-fg-muted)]">Até</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full text-xs bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-2 py-1.5 text-[color:var(--adflow-fg)] focus:outline-none focus:border-[color:var(--adflow-accent)]"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              className="w-full text-xs py-1.5 rounded bg-[color:var(--adflow-accent)] text-white disabled:opacity-40 hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* Compare toggle */}
      {(
        <div className="flex items-center gap-1 ml-2 border-l border-[color:var(--adflow-border)] pl-2">
          <span className="text-xs text-[color:var(--adflow-fg-muted)]">vs</span>
          {(["prev_period", "prev_year", "none"] as CompareMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompare(mode)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                currentCompare === mode
                  ? "text-[color:var(--adflow-fg)] bg-[color:var(--adflow-border)]"
                  : "text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
              }`}
            >
              {mode === "prev_period" ? "período ant." : mode === "prev_year" ? "ano ant." : "desligado"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
