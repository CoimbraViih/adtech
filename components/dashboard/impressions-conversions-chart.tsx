"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import type { DualDayPoint } from "@/lib/dashboard/mock-data";

const NUM = new Intl.NumberFormat("pt-BR");

function tickInterval(count: number) {
  if (count <= 7) return 0;
  if (count <= 14) return 1;
  if (count <= 31) return 4;
  return Math.floor(count / 10);
}

type Props = { data: DualDayPoint[] };

export function ImpressionsConversionsChart({ data }: Props) {
  const interval = tickInterval(data.length);
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4">
      <h3 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-4">Impressões & Conversões</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E8390E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E8390E" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            yAxisId="imp"
            orientation="left"
            tick={{ fill: "#3B82F6", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            width={40}
          />
          <YAxis
            yAxisId="conv"
            orientation="right"
            tick={{ fill: "#E8390E", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{ background: "#13131F", border: "1px solid #1E1E2E", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "#F1F5F9", marginBottom: 4 }}
            formatter={(v: unknown) => [NUM.format(v as number), ""]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 8 }} />
          <Area yAxisId="imp" type="monotone" dataKey="primary" name="Impressões" stroke="#3B82F6" strokeWidth={2} fill="url(#gradImp)" dot={false} />
          <Area yAxisId="conv" type="monotone" dataKey="secondary" name="Conversões" stroke="#E8390E" strokeWidth={2} fill="url(#gradConv)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
