# Dashboard Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty dashboard placeholder with a full cockpit+hub page: 6 KPI cards with period deltas, 3 Recharts charts (revenue bars, ROAS+Spend dual-line, Impressions+Conversions area), campaign status breakdown, hub cards for each section, top-5 campaigns table, and a shared date-range filter component (presets + date picker + comparison toggle) used across all dashboard sections.

**Architecture:** All data is derived from `MOCK_CAMPAIGNS` and `MOCK_CREATIVES` at build time (server component). The date filter lives in the URL (`?from=&to=&compare=prev_period|prev_year|none`). A new shared `GlobalDateFilter` client component replaces both the existing `DateRangePicker` in analytics and the new dashboard filter — it is extracted to `components/shared/global-date-filter.tsx` and imported everywhere. Mock time-series data is generated deterministically from the date range so charts look realistic without a database.

**Tech Stack:** Next.js 15 App Router (Server Components + URL params), Recharts (already installed), Tailwind CSS v4, TypeScript strict, existing `MOCK_CAMPAIGNS`/`MOCK_CREATIVES` mock data, `lucide-react` icons.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/shared/global-date-filter.tsx` | Unified date filter: presets + custom picker + compare toggle. Replaces `components/analytics/date-range-picker.tsx` usage. |
| Create | `lib/dashboard/mock-data.ts` | Derives dashboard aggregates and time-series from `MOCK_CAMPAIGNS`/`MOCK_CREATIVES` given a date range |
| Create | `components/dashboard/dashboard-kpi-strip.tsx` | 6 KPI cards row: Spend, Receita, ROAS, CPA, Conversões, CTR — with delta vs comparison period |
| Create | `components/dashboard/revenue-bar-chart.tsx` | Recharts BarChart — Receita por dia |
| Create | `components/dashboard/roas-spend-chart.tsx` | Recharts LineChart dual-axis — ROAS + Spend |
| Create | `components/dashboard/impressions-conversions-chart.tsx` | Recharts AreaChart — Impressões + Conversões |
| Create | `components/dashboard/campaign-status-hub.tsx` | Campaign status breakdown (ativa/pausada/draft/arquivada) + link to /campaigns |
| Create | `components/dashboard/section-hub-cards.tsx` | Hub cards row: Campanhas / Criativos / Pixel / Analytics summaries with links |
| Create | `components/dashboard/top-campaigns-table.tsx` | Top-5 campaigns by ROAS, compact table |
| Modify | `app/(dashboard)/dashboard/page.tsx` | Replace placeholder with full dashboard using all new components |
| Modify | `app/(dashboard)/analytics/page.tsx` | Replace `DateRangePicker` with `GlobalDateFilter` |
| Modify | `app/(dashboard)/campaigns/page.tsx` | Add `GlobalDateFilter` to header |
| Modify | `app/(dashboard)/creatives/page.tsx` | Add `GlobalDateFilter` to header |
| Modify | `app/(dashboard)/pixel/page.tsx` | Add `GlobalDateFilter` to header |

---

## Task 1: GlobalDateFilter shared component

This replaces `components/analytics/date-range-picker.tsx` with a richer version that adds "Hoje", "Todo o período", a custom date picker, and a comparison toggle.

**Files:**
- Create: `components/shared/global-date-filter.tsx`

- [ ] **Step 1: Create `components/shared/global-date-filter.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";

export type CompareMode = "prev_period" | "prev_year" | "none";

const PRESETS = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
] as const;

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return toIso(new Date());
}

function daysAgoIso(n: number) {
  return toIso(new Date(Date.now() - n * 86_400_000));
}

type Props = {
  currentFrom: string;
  currentTo: string;
  currentCompare: CompareMode;
};

export function GlobalDateFilter({ currentFrom, currentTo, currentCompare }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [showPicker, setShowPicker] = useState(false);
  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);

  function push(from: string, to: string, compare: CompareMode = currentCompare) {
    const next = new URLSearchParams(params.toString());
    next.set("from", from);
    next.set("to", to);
    next.set("compare", compare);
    router.replace(`${pathname}?${next.toString()}`);
    setShowPicker(false);
  }

  function applyPreset(days: number) {
    if (days === 0) {
      push(todayIso(), todayIso());
    } else {
      push(daysAgoIso(days), todayIso());
    }
  }

  function applyAllTime() {
    push("2020-01-01", todayIso(), "none");
  }

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      push(customFrom, customTo);
    }
  }

  function setCompare(compare: CompareMode) {
    push(currentFrom, currentTo, compare);
  }

  const activePreset = PRESETS.find((p) => {
    if (p.days === 0) return currentFrom === todayIso() && currentTo === todayIso();
    return currentFrom === daysAgoIso(p.days) && currentTo === todayIso();
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => applyPreset(p.days)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            activePreset?.label === p.label
              ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/10"
              : "border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:border-[color:var(--adflow-fg-muted)]"
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Todo o período */}
      <button
        onClick={applyAllTime}
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          currentFrom === "2020-01-01"
            ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/10"
            : "border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:border-[color:var(--adflow-fg-muted)]"
        }`}
      >
        Todo o período
      </button>

      {/* Custom picker toggle */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((s) => !s)}
          className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:border-[color:var(--adflow-fg-muted)] transition-colors"
        >
          <CalendarIcon className="w-3 h-3" />
          {!activePreset && currentFrom !== "2020-01-01"
            ? `${currentFrom} → ${currentTo}`
            : "Personalizado"}
          <ChevronDownIcon className="w-3 h-3" />
        </button>

        {showPicker && (
          <div className="absolute top-8 right-0 z-50 bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4 shadow-xl min-w-[260px] space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--adflow-fg-muted)]">De</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full text-xs bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-2 py-1.5 text-[color:var(--adflow-fg)] focus:outline-none focus:border-[color:var(--adflow-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--adflow-fg-muted)]">Até</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full text-xs bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded px-2 py-1.5 text-[color:var(--adflow-fg)] focus:outline-none focus:border-[color:var(--adflow-accent)]"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              className="w-full text-xs py-1.5 rounded bg-[color:var(--adflow-accent)] text-white disabled:opacity-40 hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* Compare toggle */}
      {currentCompare !== undefined && (
        <div className="flex items-center gap-1 ml-2 border-l border-[color:var(--adflow-border)] pl-2">
          <span className="text-xs text-[color:var(--adflow-fg-muted)]">vs</span>
          {(["prev_period", "prev_year", "none"] as CompareMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompare(mode)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                currentCompare === mode
                  ? "text-[color:var(--adflow-fg)] bg-[color:var(--adflow-border)]"
                  : "text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
              }`}
            >
              {mode === "prev_period" ? "período ant." : mode === "prev_year" ? "ano ant." : "desligado"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/shared/global-date-filter.tsx
git commit -m "feat(dashboard): GlobalDateFilter — presets, custom picker, compare toggle"
```

---

## Task 2: Dashboard mock data helpers

Generates deterministic time-series and aggregated KPIs from `MOCK_CAMPAIGNS` for a given date range. No real database needed.

**Files:**
- Create: `lib/dashboard/mock-data.ts`

- [ ] **Step 1: Create `lib/dashboard/mock-data.ts`**

```typescript
import { MOCK_CAMPAIGNS } from "@/lib/campaigns/mock-data";
import { MOCK_CREATIVES } from "@/lib/creatives/mock-data";

export type DayPoint = { date: string; value: number };
export type DualDayPoint = { date: string; primary: number; secondary: number };

export type DashboardKpis = {
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  conversions: number;
  ctr: number;
};

export type CampaignStatusCounts = {
  active: number;
  paused: number;
  draft: number;
  archived: number;
};

export type TopCampaign = {
  id: string;
  name: string;
  platform: string;
  roas: number;
  spend: number;
  conversions: number;
  status: string;
};

// Generates N evenly-spaced ISO date strings between from and to (inclusive)
function dateRange(from: string, to: string): string[] {
  const start = new Date(from);
  const end = new Date(to);
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Deterministic pseudo-random based on date string seed
function seeded(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const t = ((h >>> 0) / 0xffffffff);
  return min + t * (max - min);
}

export function getDashboardKpis(): DashboardKpis {
  const spend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const revenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const conversions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const clicks = MOCK_CAMPAIGNS.reduce((s, c) => s + c.clicks, 0);
  const impressions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);
  return {
    spend,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    conversions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

// Returns KPI delta % vs previous period (mock: always returns a fixed plausible delta)
export function getKpiDeltas(): DashboardKpis {
  return {
    spend: 5.4,
    revenue: 12.1,
    roas: 6.3,
    cpa: -4.2,       // negative = improvement (CPA went down)
    conversions: 8.7,
    ctr: 1.9,
  };
}

export function getCampaignStatusCounts(): CampaignStatusCounts {
  return {
    active: MOCK_CAMPAIGNS.filter((c) => c.status === "active").length,
    paused: MOCK_CAMPAIGNS.filter((c) => c.status === "paused").length,
    draft: MOCK_CAMPAIGNS.filter((c) => c.status === "draft").length,
    archived: MOCK_CAMPAIGNS.filter((c) => c.status === "archived").length,
  };
}

export function getTopCampaigns(n = 5): TopCampaign[] {
  return [...MOCK_CAMPAIGNS]
    .sort((a, b) => b.roas - a.roas)
    .slice(0, n)
    .map((c) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      roas: c.roas,
      spend: c.spend,
      conversions: c.conversions,
      status: c.status,
    }));
}

export function getRevenueByDay(from: string, to: string): DayPoint[] {
  const days = dateRange(from, to);
  const totalRevenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const base = totalRevenue / Math.max(days.length, 1);
  return days.map((date) => ({
    date,
    value: Math.round(seeded(date + "rev", base * 0.6, base * 1.4)),
  }));
}

export function getRoasAndSpendByDay(from: string, to: string): DualDayPoint[] {
  const days = dateRange(from, to);
  const totalSpend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const avgRoas = MOCK_CAMPAIGNS.reduce((s, c) => s + c.roas, 0) / MOCK_CAMPAIGNS.length;
  const baseSpend = totalSpend / Math.max(days.length, 1);
  return days.map((date) => ({
    date,
    primary: Math.round(seeded(date + "roas", avgRoas * 0.7, avgRoas * 1.3) * 100) / 100,
    secondary: Math.round(seeded(date + "spend", baseSpend * 0.6, baseSpend * 1.4)),
  }));
}

export function getImpressionsAndConversionsByDay(from: string, to: string): DualDayPoint[] {
  const days = dateRange(from, to);
  const totalImpressions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);
  const totalConversions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const baseImp = totalImpressions / Math.max(days.length, 1);
  const baseConv = totalConversions / Math.max(days.length, 1);
  return days.map((date) => ({
    date,
    primary: Math.round(seeded(date + "imp", baseImp * 0.6, baseImp * 1.4)),
    secondary: Math.round(seeded(date + "conv", baseConv * 0.5, baseConv * 1.5)),
  }));
}

export function getCreativesSummary() {
  const copies = MOCK_CREATIVES.filter((c) => c.type === "copy");
  const scores = copies.map((c) => c.score).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return {
    total: copies.length,
    approved: copies.filter((c) => c.status === "approved").length,
    avgScore: avgScore ? Math.round(avgScore) : null,
  };
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/mock-data.ts
git commit -m "feat(dashboard): mock data helpers — KPIs, time-series, status counts"
```

---

## Task 3: Dashboard KPI strip

**Files:**
- Create: `components/dashboard/dashboard-kpi-strip.tsx`

- [ ] **Step 1: Create `components/dashboard/dashboard-kpi-strip.tsx`**

```typescript
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DashboardKpis } from "@/lib/dashboard/mock-data";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

type KpiDef = {
  label: string;
  value: string;
  delta: number;
  // true = lower is better (CPA)
  invertDelta?: boolean;
};

function Delta({ delta, invert }: { delta: number; invert?: boolean }) {
  const good = invert ? delta < 0 : delta > 0;
  const bad = invert ? delta > 0 : delta < 0;
  if (delta === 0) return <span className="flex items-center gap-1 text-[color:var(--adflow-fg-muted)] text-xs"><Minus className="w-3 h-3" /> estável</span>;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${good ? "text-[color:var(--adflow-success)]" : bad ? "text-[color:var(--adflow-danger)]" : "text-[color:var(--adflow-fg-muted)]"}`}>
      {good ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

type Props = { kpis: DashboardKpis; deltas: DashboardKpis; showDelta: boolean };

export function DashboardKpiStrip({ kpis, deltas, showDelta }: Props) {
  const cards: KpiDef[] = [
    { label: "Spend Total", value: BRL.format(kpis.spend), delta: deltas.spend },
    { label: "Receita", value: BRL.format(kpis.revenue), delta: deltas.revenue },
    { label: "ROAS", value: `${kpis.roas.toFixed(2)}x`, delta: deltas.roas },
    { label: "CPA", value: BRL.format(kpis.cpa), delta: deltas.cpa, invertDelta: true },
    { label: "Conversões", value: NUM.format(kpis.conversions), delta: deltas.conversions },
    { label: "CTR", value: `${kpis.ctr.toFixed(2)}%`, delta: deltas.ctr },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-2">
          <span className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide font-medium">{c.label}</span>
          <span className="text-xl font-semibold text-[color:var(--adflow-fg)] font-mono tabular-nums">{c.value}</span>
          {showDelta && <Delta delta={c.delta} invert={c.invertDelta} />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/dashboard-kpi-strip.tsx
git commit -m "feat(dashboard): 6-card KPI strip with delta indicators"
```

---

## Task 4: Revenue bar chart

**Files:**
- Create: `components/dashboard/revenue-bar-chart.tsx`

- [ ] **Step 1: Create `components/dashboard/revenue-bar-chart.tsx`**

```typescript
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DayPoint } from "@/lib/dashboard/mock-data";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Thins the labels so they don't overlap: show only every Nth label
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
            tickFormatter={(v: string) => v.slice(5)} // "MM-DD"
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
            formatter={(v: number) => [BRL.format(v), "Receita"]}
          />
          <Bar dataKey="value" fill="#3B82F6" radius={[2, 2, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/revenue-bar-chart.tsx
git commit -m "feat(dashboard): revenue-by-day bar chart"
```

---

## Task 5: ROAS + Spend dual-line chart

**Files:**
- Create: `components/dashboard/roas-spend-chart.tsx`

- [ ] **Step 1: Create `components/dashboard/roas-spend-chart.tsx`**

```typescript
"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import type { DualDayPoint } from "@/lib/dashboard/mock-data";

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
          {/* Left axis: ROAS */}
          <YAxis
            yAxisId="roas"
            orientation="left"
            tick={{ fill: "#10B981", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            width={36}
          />
          {/* Right axis: Spend */}
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
            formatter={(v: number, name: string) =>
              name === "ROAS" ? [`${v.toFixed(2)}x`, "ROAS"] : [BRL.format(v), "Spend"]
            }
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/roas-spend-chart.tsx
git commit -m "feat(dashboard): ROAS + Spend dual-axis line chart"
```

---

## Task 6: Impressions + Conversions area chart

**Files:**
- Create: `components/dashboard/impressions-conversions-chart.tsx`

- [ ] **Step 1: Create `components/dashboard/impressions-conversions-chart.tsx`**

```typescript
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
            formatter={(v: number, name: string) => [NUM.format(v), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 8 }} />
          <Area yAxisId="imp" type="monotone" dataKey="primary" name="Impressões" stroke="#3B82F6" strokeWidth={2} fill="url(#gradImp)" dot={false} />
          <Area yAxisId="conv" type="monotone" dataKey="secondary" name="Conversões" stroke="#E8390E" strokeWidth={2} fill="url(#gradConv)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/impressions-conversions-chart.tsx
git commit -m "feat(dashboard): impressions + conversions area chart"
```

---

## Task 7: Campaign status hub card

**Files:**
- Create: `components/dashboard/campaign-status-hub.tsx`

- [ ] **Step 1: Create `components/dashboard/campaign-status-hub.tsx`**

```typescript
import Link from "next/link";
import { ArrowRight, Play, Pause, FileText, Archive } from "lucide-react";
import type { CampaignStatusCounts } from "@/lib/dashboard/mock-data";

type Props = { counts: CampaignStatusCounts };

const STATUS_ROWS = [
  { key: "active" as const, label: "Ativas", icon: Play, color: "text-[color:var(--adflow-success)]", dot: "bg-[color:var(--adflow-success)]" },
  { key: "paused" as const, label: "Pausadas", icon: Pause, color: "text-[color:var(--adflow-warning)]", dot: "bg-[color:var(--adflow-warning)]" },
  { key: "draft" as const, label: "Rascunhos", icon: FileText, color: "text-[color:var(--adflow-fg-muted)]", dot: "bg-[color:var(--adflow-fg-muted)]" },
  { key: "archived" as const, label: "Arquivadas", icon: Archive, color: "text-[color:var(--adflow-border)]", dot: "bg-[color:var(--adflow-border)]" },
];

export function CampaignStatusHub({ counts }: Props) {
  const total = counts.active + counts.paused + counts.draft + counts.archived;
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[color:var(--adflow-fg)]">Campanhas</h3>
        <span className="text-xs text-[color:var(--adflow-fg-muted)]">{total} total</span>
      </div>

      {/* Mini donut via stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {STATUS_ROWS.map((s) => {
          const pct = total > 0 ? (counts[s.key] / total) * 100 : 0;
          return pct > 0 ? (
            <div key={s.key} className={`${s.dot} h-full`} style={{ width: `${pct}%` }} />
          ) : null;
        })}
      </div>

      <div className="space-y-2">
        {STATUS_ROWS.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-[color:var(--adflow-fg-muted)]">{s.label}</span>
            </div>
            <span className={`text-sm font-semibold tabular-nums ${s.color}`}>{counts[s.key]}</span>
          </div>
        ))}
      </div>

      <Link
        href="/campaigns"
        className="flex items-center gap-1 text-xs text-[color:var(--adflow-accent)] hover:underline mt-auto"
      >
        Ver campanhas <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/campaign-status-hub.tsx
git commit -m "feat(dashboard): campaign status hub card with stacked bar"
```

---

## Task 8: Section hub cards row

**Files:**
- Create: `components/dashboard/section-hub-cards.tsx`

- [ ] **Step 1: Create `components/dashboard/section-hub-cards.tsx`**

```typescript
import Link from "next/link";
import { ArrowRight, Wand2, Radio, BarChart2 } from "lucide-react";

type HubCardProps = {
  title: string;
  icon: React.ElementType;
  stats: { label: string; value: string }[];
  href: string;
  accentColor?: string;
};

function HubCard({ title, icon: Icon, stats, href, accentColor = "var(--adflow-data)" }: HubCardProps) {
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
        <span className="text-sm font-medium text-[color:var(--adflow-fg)]">{title}</span>
      </div>
      <div className="space-y-1.5">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--adflow-fg-muted)]">{s.label}</span>
            <span className="text-xs font-semibold text-[color:var(--adflow-fg)] tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs mt-auto"
        style={{ color: accentColor }}
      >
        Abrir <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

type Props = {
  creatives: { total: number; approved: number; avgScore: number | null };
  pixelEvents: number;
  pixelCount: number;
  analyticsConversions: number;
  analyticsRevenue: number;
};

export function SectionHubCards({ creatives, pixelEvents, pixelCount, analyticsConversions, analyticsRevenue }: Props) {
  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const NUM = new Intl.NumberFormat("pt-BR");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <HubCard
        title="AI Creative Studio"
        icon={Wand2}
        accentColor="var(--adflow-accent)"
        href="/creatives"
        stats={[
          { label: "Copies geradas", value: NUM.format(creatives.total) },
          { label: "Aprovadas", value: NUM.format(creatives.approved) },
          { label: "Score médio", value: creatives.avgScore !== null ? `${creatives.avgScore}/100` : "—" },
        ]}
      />
      <HubCard
        title="Pixel & Tracking"
        icon={Radio}
        accentColor="var(--adflow-success)"
        href="/pixel"
        stats={[
          { label: "Pixels ativos", value: NUM.format(pixelCount) },
          { label: "Eventos capturados", value: NUM.format(pixelEvents) },
        ]}
      />
      <HubCard
        title="Analytics"
        icon={BarChart2}
        accentColor="var(--adflow-data)"
        href="/analytics"
        stats={[
          { label: "Conversões rastreadas", value: NUM.format(analyticsConversions) },
          { label: "Receita atribuída", value: BRL.format(analyticsRevenue) },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/section-hub-cards.tsx
git commit -m "feat(dashboard): section hub cards — Criativos, Pixel, Analytics"
```

---

## Task 9: Top campaigns table

**Files:**
- Create: `components/dashboard/top-campaigns-table.tsx`

- [ ] **Step 1: Create `components/dashboard/top-campaigns-table.tsx`**

```typescript
import Link from "next/link";
import type { TopCampaign } from "@/lib/dashboard/mock-data";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  programmatic: "Prog.",
};

const STATUS_STYLE: Record<string, string> = {
  active: "text-[color:var(--adflow-success)] bg-[color:var(--adflow-success)]/10",
  paused: "text-[color:var(--adflow-warning)] bg-[color:var(--adflow-warning)]/10",
  draft: "text-[color:var(--adflow-fg-muted)] bg-[color:var(--adflow-border)]/30",
  archived: "text-[color:var(--adflow-fg-muted)] bg-[color:var(--adflow-border)]/30",
};

type Props = { campaigns: TopCampaign[] };

export function TopCampaignsTable({ campaigns }: Props) {
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--adflow-border)]">
        <h3 className="text-sm font-medium text-[color:var(--adflow-fg)]">Top campanhas por ROAS</h3>
        <Link href="/campaigns" className="text-xs text-[color:var(--adflow-accent)] hover:underline">
          Ver todas →
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--adflow-border)]">
            {["Campanha", "Plataforma", "Status", "ROAS", "Spend", "Conversões"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr
              key={c.id}
              className={`border-b border-[color:var(--adflow-border)] last:border-0 hover:bg-[color:var(--adflow-border)]/20 transition-colors ${i % 2 === 0 ? "" : "bg-[color:var(--adflow-base)]/40"}`}
            >
              <td className="px-4 py-2.5">
                <Link href={`/campaigns/${c.id}`} className="text-[color:var(--adflow-fg)] hover:text-[color:var(--adflow-accent)] transition-colors font-medium truncate max-w-[200px] block">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-[color:var(--adflow-fg-muted)] text-xs">{PLATFORM_LABEL[c.platform] ?? c.platform}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[c.status] ?? ""}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono tabular-nums text-[color:var(--adflow-success)] font-semibold">{c.roas.toFixed(2)}x</td>
              <td className="px-4 py-2.5 font-mono tabular-nums text-[color:var(--adflow-fg-muted)]">{BRL.format(c.spend)}</td>
              <td className="px-4 py-2.5 font-mono tabular-nums text-[color:var(--adflow-fg-muted)]">{NUM.format(c.conversions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/top-campaigns-table.tsx
git commit -m "feat(dashboard): top-5 campaigns by ROAS table"
```

---

## Task 10: Dashboard page — wire everything together

Replace `app/(dashboard)/dashboard/page.tsx` with the full cockpit+hub.

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Rewrite `app/(dashboard)/dashboard/page.tsx`**

```typescript
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
import { DashboardKpiStrip } from "@/components/dashboard/dashboard-kpi-strip";
import { RevenueBarChart } from "@/components/dashboard/revenue-bar-chart";
import { RoasSpendChart } from "@/components/dashboard/roas-spend-chart";
import { ImpressionsConversionsChart } from "@/components/dashboard/impressions-conversions-chart";
import { CampaignStatusHub } from "@/components/dashboard/campaign-status-hub";
import { SectionHubCards } from "@/components/dashboard/section-hub-cards";
import { TopCampaignsTable } from "@/components/dashboard/top-campaigns-table";
import {
  getDashboardKpis,
  getKpiDeltas,
  getCampaignStatusCounts,
  getTopCampaigns,
  getRevenueByDay,
  getRoasAndSpendByDay,
  getImpressionsAndConversionsByDay,
  getCreativesSummary,
} from "@/lib/dashboard/mock-data";

type SearchParams = { from?: string; to?: string; compare?: string };

const VALID_COMPARES = ["prev_period", "prev_year", "none"] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  const _workspaceId = session.workspace.id;

  const sp = await searchParams;
  const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare: CompareMode = VALID_COMPARES.includes(sp.compare as CompareMode)
    ? (sp.compare as CompareMode)
    : "prev_period";

  const kpis = getDashboardKpis();
  const deltas = getKpiDeltas();
  const statusCounts = getCampaignStatusCounts();
  const topCampaigns = getTopCampaigns(5);
  const revenueData = getRevenueByDay(dateFrom, dateTo);
  const roasSpendData = getRoasAndSpendByDay(dateFrom, dateTo);
  const impConvData = getImpressionsAndConversionsByDay(dateFrom, dateTo);
  const creatives = getCreativesSummary();

  return (
    <div className="space-y-6">
      {/* Header + date filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">Dashboard</h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {dateFrom} → {dateTo}
            {compare !== "none" && (
              <span className="ml-2 text-[color:var(--adflow-fg-muted)]/60">
                · vs {compare === "prev_period" ? "período anterior" : "ano anterior"}
              </span>
            )}
          </p>
        </div>
        <Suspense>
          <GlobalDateFilter
            currentFrom={dateFrom}
            currentTo={dateTo}
            currentCompare={compare}
          />
        </Suspense>
      </div>

      {/* KPI strip */}
      <DashboardKpiStrip kpis={kpis} deltas={deltas} showDelta={compare !== "none"} />

      {/* Charts row 1: Revenue | ROAS+Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueBarChart data={revenueData} />
        <RoasSpendChart data={roasSpendData} />
      </div>

      {/* Chart row 2: Impressions + Conversions full width */}
      <ImpressionsConversionsChart data={impConvData} />

      {/* Hub row: Campaign status + section cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <CampaignStatusHub counts={statusCounts} />
        <div className="lg:col-span-3">
          <SectionHubCards
            creatives={creatives}
            pixelEvents={1_243}
            pixelCount={2}
            analyticsConversions={247}
            analyticsRevenue={48_750}
          />
        </div>
      </div>

      {/* Top campaigns */}
      <TopCampaignsTable campaigns={topCampaigns} />
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -30
```
Fix any errors before committing.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): full cockpit+hub page — KPIs, charts, campaign status, hub cards"
```

---

## Task 11: Add GlobalDateFilter to all other sections

Replace or add the date filter in Analytics, Campaigns, Creatives, and Pixel pages.

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx`
- Modify: `app/(dashboard)/campaigns/page.tsx`
- Modify: `app/(dashboard)/creatives/page.tsx`
- Modify: `app/(dashboard)/pixel/page.tsx`

- [ ] **Step 1: Read each page to understand current header structure**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && head -30 app/\(dashboard\)/analytics/page.tsx && echo "---" && head -30 app/\(dashboard\)/campaigns/page.tsx && echo "---" && head -20 app/\(dashboard\)/creatives/page.tsx && echo "---" && head -20 app/\(dashboard\)/pixel/page.tsx
```

- [ ] **Step 2: Update `app/(dashboard)/analytics/page.tsx`**

Replace the existing `DateRangePicker` import and usage with `GlobalDateFilter`. Find these lines in the file:

```typescript
import { DateRangePicker } from "@/components/analytics/date-range-picker";
```
Replace with:
```typescript
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
```

Find where `searchParams` is read. Add `compare` extraction after `model`:
```typescript
const compare: CompareMode = (["prev_period", "prev_year", "none"] as CompareMode[]).includes(sp.compare as CompareMode)
  ? (sp.compare as CompareMode)
  : "prev_period";
```

Find the `<DateRangePicker currentFrom={dateFrom} currentTo={dateTo} />` usage and replace with:
```typescript
<GlobalDateFilter currentFrom={dateFrom} currentTo={dateTo} currentCompare={compare} />
```

Also update the `SearchParams` type to include `compare?: string`.

- [ ] **Step 3: Update `app/(dashboard)/campaigns/page.tsx`**

Read the file, find the page header section (`<div className="flex items-center justify-between">`), and add the GlobalDateFilter. The campaigns page is a Server Component — add these imports at the top:

```typescript
import { Suspense } from "react";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
```

Add `searchParams` prop to the page function:
```typescript
export default function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; compare?: string }>;
}) {
```

Make the function `async` and add at the top of the body:
```typescript
const sp = await searchParams;
const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
const compare: CompareMode = (["prev_period", "prev_year", "none"] as CompareMode[]).includes(sp.compare as CompareMode)
  ? (sp.compare as CompareMode)
  : "prev_period";
```

Add to the header JSX (below the existing `<Link>` button for "Nova campanha"):
```typescript
<Suspense>
  <GlobalDateFilter currentFrom={dateFrom} currentTo={dateTo} currentCompare={compare} />
</Suspense>
```

- [ ] **Step 4: Update `app/(dashboard)/creatives/page.tsx`** — same pattern as campaigns (Step 3 above).

- [ ] **Step 5: Update `app/(dashboard)/pixel/page.tsx`** — same pattern as campaigns (Step 3 above).

- [ ] **Step 6: Run TypeScript check**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech" && npx tsc --noEmit 2>&1 | head -30
```
Fix all errors. Common issues:
- The `campaigns/page.tsx` may already be a function that reads MOCK_CAMPAIGNS directly — make sure `async` is added properly
- The `creatives/page.tsx` and `pixel/page.tsx` may also need `async` added

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/analytics/page.tsx app/(dashboard)/campaigns/page.tsx app/(dashboard)/creatives/page.tsx app/(dashboard)/pixel/page.tsx
git commit -m "feat(dashboard): add GlobalDateFilter to all dashboard sections"
```

---

## Self-Review

**Spec coverage:**
- [x] GlobalDateFilter: presets (Hoje/7/30/90 dias), Todo o período, custom picker, compare toggle → Task 1
- [x] Dashboard mock data helpers (time-series, KPIs, status counts) → Task 2
- [x] 6 KPI cards with delta indicators → Task 3
- [x] Revenue bar chart (Receita por dia) → Task 4
- [x] ROAS + Spend dual-axis line chart → Task 5
- [x] Impressões + Conversões area chart → Task 6
- [x] Campaign status breakdown (ativa/pausada/draft/arquivada) + stacked bar → Task 7
- [x] Section hub cards (Criativos, Pixel, Analytics) → Task 8
- [x] Top-5 campaigns by ROAS table → Task 9
- [x] Dashboard page wiring → Task 10
- [x] GlobalDateFilter added to Analytics, Campaigns, Creatives, Pixel → Task 11

**No placeholders, no TBDs. All code is complete.**
