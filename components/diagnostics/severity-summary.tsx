"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AiDiagnostic } from "@/types/database";

const COLORS = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
};

export function SeveritySummary({ diagnostics }: { diagnostics: AiDiagnostic[] }) {
  const counts = diagnostics.reduce(
    (acc, d) => {
      acc[d.severity] = (acc[d.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = [
    { name: "Crítico", count: counts.critical ?? 0, color: COLORS.critical },
    { name: "Atenção", count: counts.warning ?? 0, color: COLORS.warning },
    { name: "Info", count: counts.info ?? 0, color: COLORS.info },
  ];

  return (
    <div className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4">
      <p className="text-xs text-[color:var(--adflow-fg-muted)] mb-3 font-medium uppercase tracking-wide">
        Diagnósticos por severidade
      </p>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#6B7280", fontSize: 12 }}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: "var(--adflow-surface)",
              border: "1px solid var(--adflow-border)",
              borderRadius: 6,
            }}
            labelStyle={{ color: "white" }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
          <Bar dataKey="count" radius={3}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
