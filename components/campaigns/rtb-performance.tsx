"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = {
  data: "var(--adflow-data)",
  success: "var(--adflow-success)",
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-3 text-xs shadow-lg">
      <p className="text-[color:var(--adflow-fg-muted)] mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[color:var(--adflow-fg-muted)]">{entry.name}:</span>
          <span className="font-medium text-[color:var(--adflow-fg)]">
            {entry.name === "Win Rate (%)"
              ? `${entry.value.toFixed(1)}%`
              : entry.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}

type BidLogEntry = {
  bid_cpm: number | null;
  outcome: string;
  created_at: string;
};

type RtbPerformanceProps = {
  bidLog: BidLogEntry[];
};

function buildLandscape(bidLog: BidLogEntry[]) {
  const buckets = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38];
  const counts = new Map<number, number>(buckets.map((b) => [b, 0]));
  for (const entry of bidLog) {
    if (entry.bid_cpm === null) continue;
    const bucket = buckets.reduce((prev, curr) =>
      Math.abs(curr - entry.bid_cpm!) < Math.abs(prev - entry.bid_cpm!) ? curr : prev
    );
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return buckets.map((b) => ({ cpm: `R$${b}–${b + 4}`, bids: counts.get(b) ?? 0 }));
}

function buildTimeSeries(bidLog: BidLogEntry[]) {
  const byDate = new Map<string, { wins: number; total: number }>();
  for (const entry of bidLog) {
    const date = entry.created_at.slice(0, 10);
    const existing = byDate.get(date) ?? { wins: 0, total: 0 };
    byDate.set(date, {
      wins: existing.wins + (entry.outcome === "win" ? 1 : 0),
      total: existing.total + 1,
    });
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { wins, total }]) => {
      const d = new Date(date + "T00:00:00");
      return {
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        "Win Rate (%)": total > 0 ? +((wins / total) * 100).toFixed(1) : 0,
        Bids: total,
      };
    });
}

export function RtbPerformance({ bidLog }: RtbPerformanceProps) {
  const landscapeData = buildLandscape(bidLog);

  const timeSeriesData = buildTimeSeries(bidLog);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart A — Bid Landscape */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <h3 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-4">
          Distribuição de Lances (CPM)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={landscapeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adflow-border)" vertical={false} />
            <XAxis
              dataKey="cpm"
              tick={{ fontSize: 10, fill: "var(--adflow-fg-muted)" }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="bids"
              name="Lances"
              fill={COLORS.data}
              opacity={0.85}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart B — Win Rate ao Longo do Tempo */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <h3 className="text-sm font-medium text-[color:var(--adflow-fg)] mb-4">
          Win Rate ao Longo do Tempo
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timeSeriesData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adflow-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "var(--adflow-fg-muted)" }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Win Rate (%)"
              stroke={COLORS.success}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Bids"
              stroke={COLORS.data}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
