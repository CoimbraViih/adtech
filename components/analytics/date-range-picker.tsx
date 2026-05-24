"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

type Props = { currentFrom: string; currentTo: string };

export function DateRangePicker({ currentFrom, currentTo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400_000);
    const next = new URLSearchParams(params.toString());
    next.set("from", toIso(from));
    next.set("to", toIso(to));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => applyPreset(p.days)}
          className="text-xs px-3 py-1 rounded-full border border-border text-muted hover:border-muted transition-colors"
        >
          {p.label}
        </button>
      ))}
      <span className="text-xs text-muted ml-2">
        {currentFrom} → {currentTo}
      </span>
    </div>
  );
}
