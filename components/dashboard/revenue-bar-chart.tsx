"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DayPoint } from "@/lib/dashboard/mock-data";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function tickInterval(count: number) {
  if (count <= 7) return 0;
  if (count <= 14) return 1;
  if (count <= 31) return 4;
  return Math.floor(count / 10);
}

type Props = { data: DayPoint[] };

export function RevenueBarChart({ data }: Props) {
  const interval = tickInterval(data.length);
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4">
      <h3 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-4">Receita por dia</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
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
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
            width={44}
          />
          <Tooltip
            contentStyle={{ background: "#13131F", border: "1px solid #1E1E2E", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "#F1F5F9", marginBottom: 4 }}
            itemStyle={{ color: "#94A3B8" }}
            formatter={(v: unknown) => [BRL.format(v as number), "Receita"]}
          />
          <Bar dataKey="value" fill="#3B82F6" radius={[2, 2, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
