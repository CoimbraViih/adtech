"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AttributionModel } from "@/types/database";

const MODELS: { value: AttributionModel; label: string }[] = [
  { value: "last_click", label: "Último Clique" },
  { value: "linear", label: "Linear" },
  { value: "time_decay", label: "Decaimento Temporal" },
];

type Props = { current: AttributionModel };

export function AttributionModelSelector({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(model: AttributionModel) {
    const next = new URLSearchParams(params.toString());
    next.set("model", model);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">Modelo:</span>
      {MODELS.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            current === m.value
              ? "border-accent text-accent bg-accent/10"
              : "border-border text-muted hover:border-muted"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
