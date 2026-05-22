"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { CampaignMetricSnapshot } from "@/types/database";

type Tab = "roas_spend" | "clicks" | "conversions";

const TABS: { id: Tab; label: string }[] = [
  { id: "roas_spend", label: "ROAS & Gasto" },
  { id: "clicks", label: "Cliques & Impressões" },
  { id: "conversions", label: "Conversões" },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatCurrency(val: number) {
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const COLORS = {
  data: "#3B82F6",
  accent: "#E8390E",
  success: "#10B981",
  warning: "#F59E0B",
  purple: "#8B5CF6",
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
            {entry.name.toLowerCase().includes("gasto")
              ? formatCurrency(entry.value)
              : entry.name.toLowerCase().includes("roas")
              ? `${entry.value.toFixed(2)}x`
              : entry.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}

type CampaignChartsProps = {
  snapshots: CampaignMetricSnapshot[];
};

export function CampaignCharts({ snapshots }: CampaignChartsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("roas_spend");

  const data = snapshots.map((s) => ({
    ...s,
    date: formatDate(s.date),
    impressions_k: +(s.impressions / 1000).toFixed(1),
  }));

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-[color:var(--adflow-border)] pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === tab.id
                ? "bg-[color:var(--adflow-accent)]/10 text-[color:var(--adflow-accent)] font-medium"
                : "text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
            )}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[color:var(--adflow-fg-muted)]">Últimos 30 dias</span>
      </div>

      {/* Charts */}
      <div className="h-64">
        {activeTab === "roas_spend" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                tickFormatter={(v: number) => `${v}x`}
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `R$${v}`}
                width={50}
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
                dataKey="roas"
                name="ROAS"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spend"
                name="Gasto"
                stroke={COLORS.data}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeTab === "clicks" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}k`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "var(--adflow-fg-muted)" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="left"
                dataKey="clicks"
                name="Cliques"
                fill={COLORS.data}
                opacity={0.85}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="impressions_k"
                name="Impressões (k)"
                fill={COLORS.purple}
                opacity={0.6}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === "conversions" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--adflow-fg-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}x`}
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
                dataKey="conversions"
                name="Conversões"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cpa"
                name="CPA"
                stroke={COLORS.warning}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
