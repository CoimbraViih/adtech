"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { FunnelStep } from "@/types/database";

type Props = { steps: FunnelStep[] };

const ACCENT = "#E8390E";
const MUTED = "#6B7280";

export function FunnelChart({ steps }: Props) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-border bg-surface text-muted text-sm">
        Nenhum dado de funil disponível para o período selecionado.
      </div>
    );
  }

  const data = steps.map((s) => ({ name: s.label, count: s.count, drop: Math.round(s.drop_off_rate * 100) }));

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-white mb-4">Funil de Conversão</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 32 }}>
          <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fill: MUTED, fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#13131F", border: "1px solid #1E1E2E", borderRadius: 6 }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: MUTED }}
            formatter={(value: unknown, _: unknown, entry: unknown) => {
              const numValue = value as number;
              const typedEntry = entry as { payload: { drop: number } };
              return [`${numValue.toLocaleString("pt-BR")} (${typedEntry.payload.drop}% drop-off)`, "Contagem"];
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={i === data.length - 1 ? ACCENT : "#3B82F6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
