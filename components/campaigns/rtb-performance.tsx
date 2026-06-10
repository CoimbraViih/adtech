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

// Deterministic seed helper
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Bid landscape histogram (deterministic, no real-time data yet)
function getBidLandscape(campaignId: string) {
  const seed = seedFromId(campaignId);
  const buckets = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38];
  const peaks = [(seed % 3) + 2, ((seed >> 4) % 3) + 5];
  const baseCounts = [180, 320, 560, 740, 620, 480, 310, 190, 90, 40];
  return buckets.map((cpm, i) => {
    const boost = peaks.includes(i) ? 1 + ((seed >> (i * 2)) % 3) * 0.25 : 1;
    return { cpm, count: Math.round(baseCounts[i] * boost) };
  });
}

// Win-rate time series (deterministic, no real-time data yet)
const WIN_RATE_BASE = [
  { winRate: 0.38, bids: 4200 }, { winRate: 0.40, bids: 4350 }, { winRate: 0.37, bids: 4100 },
  { winRate: 0.41, bids: 4500 }, { winRate: 0.43, bids: 4700 }, { winRate: 0.39, bids: 4250 },
  { winRate: 0.42, bids: 4600 }, { winRate: 0.44, bids: 4800 }, { winRate: 0.36, bids: 4050 },
  { winRate: 0.38, bids: 4200 }, { winRate: 0.41, bids: 4500 }, { winRate: 0.45, bids: 4900 },
  { winRate: 0.43, bids: 4700 }, { winRate: 0.40, bids: 4400 }, { winRate: 0.38, bids: 4200 },
  { winRate: 0.42, bids: 4600 }, { winRate: 0.46, bids: 5000 }, { winRate: 0.44, bids: 4800 },
  { winRate: 0.41, bids: 4500 }, { winRate: 0.39, bids: 4300 }, { winRate: 0.43, bids: 4700 },
  { winRate: 0.45, bids: 4900 }, { winRate: 0.47, bids: 5100 }, { winRate: 0.44, bids: 4800 },
  { winRate: 0.42, bids: 4600 }, { winRate: 0.40, bids: 4400 }, { winRate: 0.43, bids: 4700 },
  { winRate: 0.46, bids: 5000 }, { winRate: 0.48, bids: 5200 }, { winRate: 0.45, bids: 4900 },
];

function getWinRateTimeSeries(campaignId: string) {
  const offset = seedFromId(campaignId) % 5;
  const today = new Date();
  return WIN_RATE_BASE.map((row, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (29 - i));
    return {
      date: d.toISOString().slice(0, 10),
      winRate: +(row.winRate + (offset - 2) * 0.01).toFixed(4),
      bids: row.bids + (offset - 2) * 50,
    };
  });
}

type RtbPerformanceProps = {
  campaignId: string;
};

export function RtbPerformance({ campaignId }: RtbPerformanceProps) {
  const landscape = getBidLandscape(campaignId);
  const timeSeries = getWinRateTimeSeries(campaignId);

  const landscapeData = landscape.map((b) => ({
    cpm: `R$${b.cpm}–${b.cpm + 4}`,
    bids: b.count,
  }));

  const timeSeriesData = timeSeries.map((p) => {
    const d = new Date(p.date + "T00:00:00");
    return {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      "Win Rate (%)": +(p.winRate * 100).toFixed(1),
      Bids: p.bids,
    };
  });

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
