"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import type { DualDayPoint } from "@/lib/dashboard/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function tickInterval(count: number) {
  if (count <= 7) return 0;
  if (count <= 14) return 1;
  if (count <= 31) return 4;
  return Math.floor(count / 10);
}

type Props = { data: DualDayPoint[] };

export function RoasSpendChart({ data }: Props) {
  const interval = tickInterval(data.length);
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4">
      <h3 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-4">ROAS & Spend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={interval}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            yAxisId="roas"
            orientation="left"
            tick={{ fill: "#10B981", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            width={36}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            tick={{ fill: "#F59E0B", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
            width={44}
          />
          <Tooltip
            contentStyle={{ background: "#13131F", border: "1px solid #1E1E2E", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "#F1F5F9", marginBottom: 4 }}
            formatter={(v, name) => {
              const n = typeof v === "number" ? v : 0;
              return name === "ROAS" ? [`${n.toFixed(2)}x`, "ROAS"] : [BRL.format(n), "Spend"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 8 }}
          />
          <Line yAxisId="roas" type="monotone" dataKey="primary" name="ROAS" stroke="#10B981" strokeWidth={2} dot={false} />
          <Line yAxisId="spend" type="monotone" dataKey="secondary" name="Spend" stroke="#F59E0B" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
