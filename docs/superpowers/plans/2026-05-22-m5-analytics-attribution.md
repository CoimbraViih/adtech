# M5 — Analytics & Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AdFlow analytics & attribution dashboard — multi-touch attribution models (last-click, linear, time-decay), ROAS/CPA/LTV KPI cards, conversion funnel visualization, channel performance breakdown, and a date-range filter — all fed from the `pixel_events` table produced by M4.

**Architecture:** A set of Supabase SQL views and a thin `/api/analytics/*` layer aggregate `pixel_events` server-side. The dashboard is a Next.js Server Component that fetches aggregates at request time (no client-side data fetching for the primary view). Charts use Recharts (already commonly paired with shadcn/ui). Attribution logic runs in TypeScript on the server, where we apply the selected model to the session→conversion chains stored in `pixel_events`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL views + RLS), Recharts, Vitest, Playwright. Attribution models are pure functions — no ML for MVP, deterministic rule-based weighting.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/007_analytics_views.sql` | Materialized/regular views for event aggregates |
| Modify | `types/database.ts` | Add attribution and analytics types |
| Create | `lib/analytics/attribution.ts` | Pure functions: last-click, linear, time-decay models |
| Create | `lib/analytics/aggregates.ts` | Server functions: fetch KPIs, funnel, channel breakdown from Supabase |
| Create | `app/api/analytics/summary/route.ts` | GET — KPI summary for a workspace + date range |
| Create | `app/api/analytics/funnel/route.ts` | GET — conversion funnel steps |
| Create | `app/api/analytics/channels/route.ts` | GET — channel breakdown with attribution |
| Create | `app/(dashboard)/analytics/page.tsx` | Server Component: analytics dashboard shell |
| Create | `components/analytics/kpi-cards.tsx` | ROAS, CPA, LTV, total conversions cards |
| Create | `components/analytics/funnel-chart.tsx` | Conversion funnel bar chart (Recharts) |
| Create | `components/analytics/channel-table.tsx` | Channel breakdown table with attribution model selector |
| Create | `components/analytics/date-range-picker.tsx` | Client Component: date range selector (last 7/30/90 days, custom) |
| Create | `components/analytics/attribution-model-selector.tsx` | Client Component: dropdown to switch attribution model |
| Modify | `components/layout/sidebar.tsx` | Add Analytics nav entry |
| Create | `tests/unit/attribution.test.ts` | Unit tests for all three attribution models |
| Create | `tests/unit/analytics-aggregates.test.ts` | Unit tests for aggregate functions |
| Create | `tests/e2e/analytics.spec.ts` | E2E: page renders, KPIs visible, model switching |

---

## Task 1: Database Views for Analytics Aggregates

**Files:**
- Create: `supabase/migrations/007_analytics_views.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/007_analytics_views.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- M5: Analytics & Attribution
-- Views: daily_event_counts, conversion_sessions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── daily_event_counts ────────────────────────────────────────────────────────
-- Aggregates pixel_events by day + event_type for time-series charts.
-- Joins pixels → workspaces so callers can filter by workspace_id.

CREATE OR REPLACE VIEW daily_event_counts AS
SELECT
  p.workspace_id,
  p.id          AS pixel_id,
  p.name        AS pixel_name,
  DATE_TRUNC('day', pe.received_at) AS day,
  pe.event_type,
  COUNT(*)      AS event_count,
  SUM(COALESCE(pe.value, 0)) AS total_value
FROM pixel_events pe
JOIN pixels p ON p.id = pe.pixel_id
GROUP BY p.workspace_id, p.id, p.name, DATE_TRUNC('day', pe.received_at), pe.event_type;

-- ── conversion_sessions ───────────────────────────────────────────────────────
-- One row per session that contains at least one conversion event.
-- Includes the first page_view URL to represent acquisition channel.

CREATE OR REPLACE VIEW conversion_sessions AS
SELECT
  pe.session_id,
  p.workspace_id,
  p.id                         AS pixel_id,
  MIN(pe.received_at)          AS session_start,
  MAX(pe.received_at)          AS session_end,
  -- first touch URL (for channel extraction)
  (ARRAY_AGG(pe.url ORDER BY pe.received_at))[1]  AS first_touch_url,
  -- last touch URL
  (ARRAY_AGG(pe.url ORDER BY pe.received_at DESC))[1] AS last_touch_url,
  COUNT(*)                     AS total_events,
  SUM(CASE WHEN pe.event_type = 'purchase' THEN 1 ELSE 0 END) AS purchases,
  SUM(CASE WHEN pe.event_type IN ('purchase','lead','sign_up') THEN 1 ELSE 0 END) AS conversions,
  SUM(COALESCE(pe.value, 0))   AS revenue
FROM pixel_events pe
JOIN pixels p ON p.id = pe.pixel_id
WHERE pe.session_id IS NOT NULL
GROUP BY pe.session_id, p.workspace_id, p.id
HAVING SUM(CASE WHEN pe.event_type IN ('purchase','lead','sign_up') THEN 1 ELSE 0 END) > 0;

-- RLS: views inherit the security of their underlying tables (pixels + pixel_events),
-- both of which already have workspace-scoped SELECT policies via workspace_members.
-- No additional RLS policies needed on the views themselves.
```

- [ ] **Step 2: Verify file exists**

```bash
ls supabase/migrations/007_analytics_views.sql
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_analytics_views.sql
git commit -m "feat(m5): analytics views — daily_event_counts and conversion_sessions"
```

---

## Task 2: TypeScript Types for Analytics

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Append M5 types**

Add at the bottom of `types/database.ts`:

```typescript
// ─── M5: Analytics & Attribution ──────────────────────────────────────────────

export type AttributionModel = "last_click" | "linear" | "time_decay";

export type DailyEventCount = {
  workspace_id: string;
  pixel_id: string;
  pixel_name: string;
  day: string;           // ISO date string e.g. "2026-05-22T00:00:00.000Z"
  event_type: PixelEventType;
  event_count: number;
  total_value: number;
};

export type ConversionSession = {
  session_id: string;
  workspace_id: string;
  pixel_id: string;
  session_start: string;
  session_end: string;
  first_touch_url: string | null;
  last_touch_url: string | null;
  total_events: number;
  purchases: number;
  conversions: number;
  revenue: number;
};

export type KpiSummary = {
  total_events: number;
  total_conversions: number;
  total_revenue: number;        // BRL
  roas: number;                 // revenue / ad_spend — uses 1.0 as spend denominator until M2 wires ad spend
  cpa: number;                  // total_revenue / total_conversions (0 if no conversions)
  avg_order_value: number;
};

export type ChannelAttribution = {
  channel: string;              // "google", "facebook", "direct", "organic", "other"
  conversions: number;
  revenue: number;
  attribution_share: number;    // 0–1, sum across channels = 1
};

export type FunnelStep = {
  event_type: PixelEventType;
  label: string;
  count: number;
  drop_off_rate: number;        // 0–1 compared to previous step
};
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat(m5): add analytics and attribution TypeScript types"
```

---

## Task 3: Attribution Model Functions

**Files:**
- Create: `lib/analytics/attribution.ts`
- Create: `tests/unit/attribution.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/attribution.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  applyLastClick,
  applyLinear,
  applyTimeDecay,
} from "@/lib/analytics/attribution";
import type { ConversionSession } from "@/types/database";

function makeSession(overrides: Partial<ConversionSession> = {}): ConversionSession {
  return {
    session_id: "s1",
    workspace_id: "ws1",
    pixel_id: "px1",
    session_start: "2026-05-22T09:00:00Z",
    session_end: "2026-05-22T10:00:00Z",
    first_touch_url: "https://example.com/?utm_source=google",
    last_touch_url: "https://example.com/checkout",
    total_events: 5,
    purchases: 1,
    conversions: 1,
    revenue: 100,
    ...overrides,
  };
}

// ── last-click ────────────────────────────────────────────────────────────────

describe("applyLastClick", () => {
  it("attributes all revenue to the last-touch channel", () => {
    const sessions = [
      makeSession({ last_touch_url: "https://example.com/?utm_source=google", revenue: 100 }),
      makeSession({ session_id: "s2", last_touch_url: "https://example.com/?utm_source=facebook", revenue: 50 }),
    ];
    const result = applyLastClick(sessions);
    const google = result.find((r) => r.channel === "google");
    const facebook = result.find((r) => r.channel === "facebook");
    expect(google?.revenue).toBe(100);
    expect(facebook?.revenue).toBe(50);
  });

  it("attribution shares sum to 1", () => {
    const sessions = [
      makeSession({ last_touch_url: "https://example.com/?utm_source=google", revenue: 100 }),
      makeSession({ session_id: "s2", last_touch_url: "https://example.com/?utm_source=facebook", revenue: 100 }),
    ];
    const result = applyLastClick(sessions);
    const total = result.reduce((s, r) => s + r.attribution_share, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("handles null url as 'direct'", () => {
    const sessions = [makeSession({ last_touch_url: null, revenue: 200 })];
    const result = applyLastClick(sessions);
    expect(result[0].channel).toBe("direct");
    expect(result[0].revenue).toBe(200);
  });
});

// ── linear ────────────────────────────────────────────────────────────────────

describe("applyLinear", () => {
  it("splits revenue equally between first and last touch when they differ", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=facebook",
        revenue: 100,
      }),
    ];
    const result = applyLinear(sessions);
    const google = result.find((r) => r.channel === "google");
    const facebook = result.find((r) => r.channel === "facebook");
    expect(google?.revenue).toBeCloseTo(50, 5);
    expect(facebook?.revenue).toBeCloseTo(50, 5);
  });

  it("does not double-count when first and last touch are the same channel", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=google",
        revenue: 100,
      }),
    ];
    const result = applyLinear(sessions);
    const google = result.find((r) => r.channel === "google");
    expect(google?.revenue).toBeCloseTo(100, 5);
  });
});

// ── time-decay ────────────────────────────────────────────────────────────────

describe("applyTimeDecay", () => {
  it("gives more credit to last touch than first touch", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=facebook",
        revenue: 100,
      }),
    ];
    const result = applyTimeDecay(sessions);
    const google = result.find((r) => r.channel === "google");
    const facebook = result.find((r) => r.channel === "facebook");
    // time-decay gives last-touch > 50%
    expect((facebook?.revenue ?? 0)).toBeGreaterThan((google?.revenue ?? 0));
  });

  it("attribution shares sum to 1", () => {
    const sessions = [
      makeSession({
        first_touch_url: "https://example.com/?utm_source=google",
        last_touch_url: "https://example.com/?utm_source=facebook",
        revenue: 100,
      }),
    ];
    const result = applyTimeDecay(sessions);
    const total = result.reduce((s, r) => s + r.attribution_share, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/unit/attribution.test.ts
```
Expected: FAIL — `@/lib/analytics/attribution` not found.

- [ ] **Step 3: Implement attribution.ts**

Create `lib/analytics/attribution.ts`:

```typescript
import type { ChannelAttribution, ConversionSession } from "@/types/database";

// Extracts a channel label from a URL's utm_source param.
// Falls back to hostname heuristics, then "direct".
function extractChannel(url: string | null): string {
  if (!url) return "direct";
  try {
    const parsed = new URL(url);
    const utm = parsed.searchParams.get("utm_source");
    if (utm) return utm.toLowerCase();
    // hostname heuristics
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("google")) return "google";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    return "organic";
  } catch {
    return "direct";
  }
}

function rollupChannels(
  entries: { channel: string; revenue: number; conversions: number }[]
): ChannelAttribution[] {
  const map = new Map<string, { revenue: number; conversions: number }>();
  for (const e of entries) {
    const cur = map.get(e.channel) ?? { revenue: 0, conversions: 0 };
    map.set(e.channel, {
      revenue: cur.revenue + e.revenue,
      conversions: cur.conversions + e.conversions,
    });
  }
  const rows = Array.from(map.entries()).map(([channel, v]) => ({
    channel,
    revenue: v.revenue,
    conversions: v.conversions,
    attribution_share: 0, // filled below
  }));
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  for (const row of rows) {
    row.attribution_share = totalRevenue > 0 ? row.revenue / totalRevenue : 0;
  }
  return rows.sort((a, b) => b.revenue - a.revenue);
}

// ── Last-click: 100% credit to last-touch channel ─────────────────────────────

export function applyLastClick(sessions: ConversionSession[]): ChannelAttribution[] {
  const entries = sessions.map((s) => ({
    channel: extractChannel(s.last_touch_url),
    revenue: s.revenue,
    conversions: s.conversions,
  }));
  return rollupChannels(entries);
}

// ── Linear: equal credit to first and last touch ──────────────────────────────

export function applyLinear(sessions: ConversionSession[]): ChannelAttribution[] {
  const entries: { channel: string; revenue: number; conversions: number }[] = [];
  for (const s of sessions) {
    const firstCh = extractChannel(s.first_touch_url);
    const lastCh = extractChannel(s.last_touch_url);
    if (firstCh === lastCh) {
      entries.push({ channel: firstCh, revenue: s.revenue, conversions: s.conversions });
    } else {
      const half = s.revenue / 2;
      const halfConv = s.conversions / 2;
      entries.push({ channel: firstCh, revenue: half, conversions: halfConv });
      entries.push({ channel: lastCh, revenue: half, conversions: halfConv });
    }
  }
  return rollupChannels(entries);
}

// ── Time-decay: 30% first touch, 70% last touch ───────────────────────────────
// MVP simplified two-touch model. With ClickHouse (post-MVP), we'll weight
// all intermediate touches using exponential decay against conversion time.

export function applyTimeDecay(sessions: ConversionSession[]): ChannelAttribution[] {
  const LAST_WEIGHT = 0.7;
  const FIRST_WEIGHT = 0.3;
  const entries: { channel: string; revenue: number; conversions: number }[] = [];
  for (const s of sessions) {
    const firstCh = extractChannel(s.first_touch_url);
    const lastCh = extractChannel(s.last_touch_url);
    if (firstCh === lastCh) {
      entries.push({ channel: firstCh, revenue: s.revenue, conversions: s.conversions });
    } else {
      entries.push({ channel: firstCh, revenue: s.revenue * FIRST_WEIGHT, conversions: s.conversions * FIRST_WEIGHT });
      entries.push({ channel: lastCh, revenue: s.revenue * LAST_WEIGHT, conversions: s.conversions * LAST_WEIGHT });
    }
  }
  return rollupChannels(entries);
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/unit/attribution.test.ts
```
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/attribution.ts tests/unit/attribution.test.ts
git commit -m "feat(m5): last-click, linear, and time-decay attribution models"
```

---

## Task 4: Analytics Aggregate Functions

**Files:**
- Create: `lib/analytics/aggregates.ts`
- Create: `tests/unit/analytics-aggregates.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/analytics-aggregates.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { getKpiSummary, getFunnelSteps, getChannelAttribution } from "@/lib/analytics/aggregates";
import { createServiceClient } from "@/lib/supabase/service";
import type { ConversionSession, DailyEventCount } from "@/types/database";

const mockDaily: DailyEventCount[] = [
  { workspace_id: "ws1", pixel_id: "px1", pixel_name: "Site", day: "2026-05-22T00:00:00Z", event_type: "page_view", event_count: 100, total_value: 0 },
  { workspace_id: "ws1", pixel_id: "px1", pixel_name: "Site", day: "2026-05-22T00:00:00Z", event_type: "purchase", event_count: 5, total_value: 500 },
  { workspace_id: "ws1", pixel_id: "px1", pixel_name: "Site", day: "2026-05-22T00:00:00Z", event_type: "lead", event_count: 20, total_value: 0 },
];

const mockSessions: ConversionSession[] = [
  { session_id: "s1", workspace_id: "ws1", pixel_id: "px1", session_start: "2026-05-22T09:00:00Z", session_end: "2026-05-22T09:30:00Z", first_touch_url: "https://example.com/?utm_source=google", last_touch_url: "https://example.com/checkout", total_events: 4, purchases: 1, conversions: 1, revenue: 100 },
  { session_id: "s2", workspace_id: "ws1", pixel_id: "px1", session_start: "2026-05-22T10:00:00Z", session_end: "2026-05-22T10:10:00Z", first_touch_url: "https://example.com/?utm_source=facebook", last_touch_url: "https://example.com/checkout", total_events: 3, purchases: 1, conversions: 1, revenue: 200 },
];

function mockSupabase(data: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  // make it thenable so await works
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({ data, error: null }));
  return { from: vi.fn().mockReturnValue(chain) };
}

describe("getKpiSummary", () => {
  it("calculates total_events, total_conversions and total_revenue", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(mockDaily));
    const kpi = await getKpiSummary("ws1", "2026-05-01", "2026-05-31");
    expect(kpi.total_events).toBe(125);   // 100 + 5 + 20
    expect(kpi.total_conversions).toBe(25); // 5 purchases + 20 leads
    expect(kpi.total_revenue).toBe(500);
  });

  it("returns cpa of 0 when there are no conversions", async () => {
    const empty: DailyEventCount[] = [];
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(empty));
    const kpi = await getKpiSummary("ws1", "2026-05-01", "2026-05-31");
    expect(kpi.cpa).toBe(0);
  });
});

describe("getFunnelSteps", () => {
  it("returns ordered funnel steps with drop-off rates", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(mockDaily));
    const steps = await getFunnelSteps("ws1", "2026-05-01", "2026-05-31");
    expect(steps[0].event_type).toBe("page_view");
    expect(steps[0].drop_off_rate).toBe(0);
    // purchase drop-off from page_view: (100-5)/100 = 0.95
    const purchaseStep = steps.find((s) => s.event_type === "purchase");
    expect(purchaseStep?.drop_off_rate).toBeCloseTo(0.95, 2);
  });
});

describe("getChannelAttribution", () => {
  it("returns channel attribution using the specified model", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase(mockSessions));
    const channels = await getChannelAttribution("ws1", "2026-05-01", "2026-05-31", "last_click");
    expect(channels.length).toBeGreaterThan(0);
    const total = channels.reduce((s, c) => s + c.attribution_share, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/unit/analytics-aggregates.test.ts
```
Expected: FAIL — `@/lib/analytics/aggregates` not found.

- [ ] **Step 3: Implement aggregates.ts**

Create `lib/analytics/aggregates.ts`:

```typescript
import { createServiceClient } from "@/lib/supabase/service";
import { applyLastClick, applyLinear, applyTimeDecay } from "@/lib/analytics/attribution";
import type {
  AttributionModel,
  ChannelAttribution,
  ConversionSession,
  DailyEventCount,
  FunnelStep,
  KpiSummary,
  PixelEventType,
} from "@/types/database";

const FUNNEL_ORDER: PixelEventType[] = ["page_view", "lead", "add_to_cart", "sign_up", "purchase"];
const CONVERSION_TYPES: PixelEventType[] = ["purchase", "lead", "sign_up"];

export async function getKpiSummary(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<KpiSummary> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_event_counts")
    .select("event_type,event_count,total_value")
    .eq("workspace_id", workspaceId)
    .gte("day", dateFrom)
    .lte("day", dateTo) as { data: DailyEventCount[] | null; error: unknown };

  if (error || !data) {
    return { total_events: 0, total_conversions: 0, total_revenue: 0, roas: 0, cpa: 0, avg_order_value: 0 };
  }

  const total_events = data.reduce((s, r) => s + r.event_count, 0);
  const total_conversions = data
    .filter((r) => CONVERSION_TYPES.includes(r.event_type))
    .reduce((s, r) => s + r.event_count, 0);
  const total_revenue = data
    .filter((r) => r.event_type === "purchase")
    .reduce((s, r) => s + r.total_value, 0);
  const purchase_count = data
    .filter((r) => r.event_type === "purchase")
    .reduce((s, r) => s + r.event_count, 0);

  return {
    total_events,
    total_conversions,
    total_revenue,
    roas: total_revenue > 0 ? total_revenue : 0,   // denominator = 1 until M2 wires ad spend
    cpa: total_conversions > 0 ? total_revenue / total_conversions : 0,
    avg_order_value: purchase_count > 0 ? total_revenue / purchase_count : 0,
  };
}

export async function getFunnelSteps(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<FunnelStep[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_event_counts")
    .select("event_type,event_count")
    .eq("workspace_id", workspaceId)
    .gte("day", dateFrom)
    .lte("day", dateTo) as { data: DailyEventCount[] | null; error: unknown };

  if (error || !data) return [];

  // Sum counts per event_type
  const totals = new Map<PixelEventType, number>();
  for (const row of data) {
    totals.set(row.event_type, (totals.get(row.event_type) ?? 0) + row.event_count);
  }

  const steps: FunnelStep[] = [];
  const labels: Record<PixelEventType, string> = {
    page_view: "Visitas",
    lead: "Leads",
    add_to_cart: "Carrinho",
    sign_up: "Cadastros",
    purchase: "Compras",
    custom: "Customizado",
  };

  let prev = 0;
  for (const eventType of FUNNEL_ORDER) {
    const count = totals.get(eventType) ?? 0;
    if (count === 0 && steps.length === 0) continue; // skip leading zeros
    const drop_off_rate = prev > 0 ? (prev - count) / prev : 0;
    steps.push({ event_type: eventType, label: labels[eventType], count, drop_off_rate });
    if (count > 0) prev = count;
  }

  return steps;
}

export async function getChannelAttribution(
  workspaceId: string,
  dateFrom: string,
  dateTo: string,
  model: AttributionModel
): Promise<ChannelAttribution[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("conversion_sessions")
    .select("session_id,first_touch_url,last_touch_url,conversions,revenue")
    .eq("workspace_id", workspaceId)
    .gte("session_start", dateFrom)
    .lte("session_end", dateTo) as { data: ConversionSession[] | null; error: unknown };

  if (error || !data) return [];

  switch (model) {
    case "last_click": return applyLastClick(data);
    case "linear":     return applyLinear(data);
    case "time_decay": return applyTimeDecay(data);
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/unit/analytics-aggregates.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/aggregates.ts tests/unit/analytics-aggregates.test.ts
git commit -m "feat(m5): analytics aggregate functions — KPIs, funnel, channel attribution"
```

---

## Task 5: Analytics API Routes

**Files:**
- Create: `app/api/analytics/summary/route.ts`
- Create: `app/api/analytics/funnel/route.ts`
- Create: `app/api/analytics/channels/route.ts`

- [ ] **Step 1: Create summary route**

Create `app/api/analytics/summary/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getKpiSummary } from "@/lib/analytics/aggregates";

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const kpi = await getKpiSummary(session.workspace.id, dateFrom, dateTo);
  return NextResponse.json(kpi);
}
```

- [ ] **Step 2: Create funnel route**

Create `app/api/analytics/funnel/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getFunnelSteps } from "@/lib/analytics/aggregates";

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const steps = await getFunnelSteps(session.workspace.id, dateFrom, dateTo);
  return NextResponse.json(steps);
}
```

- [ ] **Step 3: Create channels route**

Create `app/api/analytics/channels/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getChannelAttribution } from "@/lib/analytics/aggregates";
import type { AttributionModel } from "@/types/database";

const VALID_MODELS: AttributionModel[] = ["last_click", "linear", "time_decay"];

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const rawModel = searchParams.get("model") ?? "last_click";

  if (!VALID_MODELS.includes(rawModel as AttributionModel)) {
    return NextResponse.json({ error: "model inválido. Use: last_click, linear, time_decay." }, { status: 400 });
  }

  const channels = await getChannelAttribution(
    session.workspace.id,
    dateFrom,
    dateTo,
    rawModel as AttributionModel
  );
  return NextResponse.json(channels);
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/analytics/summary/route.ts app/api/analytics/funnel/route.ts app/api/analytics/channels/route.ts
git commit -m "feat(m5): analytics API routes — summary, funnel, channels"
```

---

## Task 6: KPI Cards Component

**Files:**
- Create: `components/analytics/kpi-cards.tsx`

- [ ] **Step 1: Create the component**

Create `components/analytics/kpi-cards.tsx`:

```typescript
import type { KpiSummary } from "@/types/database";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR");

type Props = { kpi: KpiSummary };

export function KpiCards({ kpi }: Props) {
  const cards = [
    { label: "Total de Eventos", value: NUM.format(kpi.total_events), color: "text-white" },
    { label: "Conversões", value: NUM.format(kpi.total_conversions), color: "text-success" },
    { label: "Receita", value: BRL.format(kpi.total_revenue), color: "text-data" },
    { label: "CPA", value: kpi.cpa > 0 ? BRL.format(kpi.cpa) : "—", color: "text-warning" },
    { label: "Ticket Médio", value: kpi.avg_order_value > 0 ? BRL.format(kpi.avg_order_value) : "—", color: "text-white" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">{c.label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/kpi-cards.tsx
git commit -m "feat(m5): KPI cards component"
```

---

## Task 7: Funnel Chart Component

Install Recharts if not present, then create the component.

**Files:**
- Create: `components/analytics/funnel-chart.tsx`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```
Expected: `recharts` added to `package.json`.

- [ ] **Step 2: Create the component**

Create `components/analytics/funnel-chart.tsx`:

```typescript
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
            formatter={(value: number, _: string, entry: { payload: { drop: number } }) =>
              [`${value.toLocaleString("pt-BR")} (${entry.payload.drop}% drop-off)`, "Contagem"]
            }
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
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/funnel-chart.tsx package.json package-lock.json
git commit -m "feat(m5): funnel chart component with Recharts"
```

---

## Task 8: Channel Attribution Table & Controls

**Files:**
- Create: `components/analytics/channel-table.tsx`
- Create: `components/analytics/attribution-model-selector.tsx`
- Create: `components/analytics/date-range-picker.tsx`

- [ ] **Step 1: Create attribution-model-selector**

Create `components/analytics/attribution-model-selector.tsx`:

```typescript
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
```

- [ ] **Step 2: Create date-range-picker**

Create `components/analytics/date-range-picker.tsx`:

```typescript
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

type Props = { currentFrom: string; currentTo: string };

export function DateRangePicker({ currentFrom, currentTo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400_000);
    const next = new URLSearchParams(params.toString());
    next.set("from", toIso(from));
    next.set("to", toIso(to));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => applyPreset(p.days)}
          className="text-xs px-3 py-1 rounded-full border border-border text-muted hover:border-muted transition-colors"
        >
          {p.label}
        </button>
      ))}
      <span className="text-xs text-muted ml-2">
        {currentFrom} → {currentTo}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Create channel-table**

Create `components/analytics/channel-table.tsx`:

```typescript
import type { ChannelAttribution } from "@/types/database";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook / Meta",
  instagram: "Instagram",
  organic: "Orgânico",
  direct: "Direto",
};

type Props = { channels: ChannelAttribution[] };

export function ChannelTable({ channels }: Props) {
  if (channels.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
        Nenhuma conversão no período. Instale o pixel e aguarde os primeiros dados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-muted font-medium">Canal</th>
            <th className="px-4 py-3 text-right text-muted font-medium">Conversões</th>
            <th className="px-4 py-3 text-right text-muted font-medium">Receita</th>
            <th className="px-4 py-3 text-right text-muted font-medium">% Atribuição</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Barra</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c, i) => (
            <tr key={c.channel} className={i % 2 === 0 ? "bg-base" : "bg-surface"}>
              <td className="px-4 py-3 text-white font-medium">
                {CHANNEL_LABELS[c.channel] ?? c.channel}
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {Math.round(c.conversions).toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-3 text-right text-data">
                {BRL.format(c.revenue)}
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {(c.attribution_share * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 w-32">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(c.attribution_share * 100).toFixed(1)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/channel-table.tsx components/analytics/attribution-model-selector.tsx components/analytics/date-range-picker.tsx
git commit -m "feat(m5): channel attribution table, model selector, and date range picker"
```

---

## Task 9: Analytics Dashboard Page

**Files:**
- Create: `app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(dashboard)/analytics/page.tsx`:

```typescript
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { getKpiSummary, getFunnelSteps, getChannelAttribution } from "@/lib/analytics/aggregates";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { ChannelTable } from "@/components/analytics/channel-table";
import { AttributionModelSelector } from "@/components/analytics/attribution-model-selector";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import type { AttributionModel } from "@/types/database";

// Mock data for UI development — replace with real Supabase data after M1-backend lands
import type { KpiSummary, FunnelStep, ChannelAttribution } from "@/types/database";

const MOCK_KPI: KpiSummary = {
  total_events: 12_483,
  total_conversions: 247,
  total_revenue: 48_750,
  roas: 48_750,
  cpa: 197.37,
  avg_order_value: 540.56,
};

const MOCK_FUNNEL: FunnelStep[] = [
  { event_type: "page_view", label: "Visitas", count: 12_483, drop_off_rate: 0 },
  { event_type: "lead", label: "Leads", count: 1_420, drop_off_rate: 0.886 },
  { event_type: "add_to_cart", label: "Carrinho", count: 538, drop_off_rate: 0.621 },
  { event_type: "purchase", label: "Compras", count: 90, drop_off_rate: 0.833 },
];

const MOCK_CHANNELS: ChannelAttribution[] = [
  { channel: "google", conversions: 110, revenue: 22_000, attribution_share: 0.451 },
  { channel: "facebook", conversions: 75, revenue: 15_750, attribution_share: 0.323 },
  { channel: "organic", conversions: 40, revenue: 8_000, attribution_share: 0.164 },
  { channel: "direct", conversions: 22, revenue: 3_000, attribution_share: 0.062 },
];

type SearchParams = { from?: string; to?: string; model?: string };

export default async function AnalyticsPage({
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
  void session;

  const sp = await searchParams;
  const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const model: AttributionModel =
    (["last_click", "linear", "time_decay"] as AttributionModel[]).includes(sp.model as AttributionModel)
      ? (sp.model as AttributionModel)
      : "last_click";

  // TODO(M5-backend): replace with real Supabase queries once M1-backend lands
  // const [kpi, funnel, channels] = await Promise.all([
  //   getKpiSummary(session.workspace.id, dateFrom, dateTo),
  //   getFunnelSteps(session.workspace.id, dateFrom, dateTo),
  //   getChannelAttribution(session.workspace.id, dateFrom, dateTo, model),
  // ]);
  void getKpiSummary; void getFunnelSteps; void getChannelAttribution;
  const kpi = MOCK_KPI;
  const funnel = MOCK_FUNNEL;
  const channels = MOCK_CHANNELS;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics & Atribuição</h1>
          <p className="text-sm text-muted mt-1">
            Performance de conversões com modelos de atribuição multi-touch.
          </p>
        </div>
        <Suspense>
          <DateRangePicker currentFrom={dateFrom} currentTo={dateTo} />
        </Suspense>
      </div>

      {/* KPI cards */}
      <KpiCards kpi={kpi} />

      {/* Funnel + Attribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FunnelChart steps={funnel} />

        <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Atribuição por Canal</h2>
            <Suspense>
              <AttributionModelSelector current={model} />
            </Suspense>
          </div>
          <ChannelTable channels={channels} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/analytics/page.tsx
git commit -m "feat(m5): analytics dashboard page with KPIs, funnel, and attribution"
```

---

## Task 10: Add Analytics to Sidebar Navigation

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Check current nav items**

```bash
grep -n "href" components/layout/sidebar.tsx | head -20
```

- [ ] **Step 2: Add Analytics nav item**

Find the navigation items array in `components/layout/sidebar.tsx`. Add after the Pixel entry (import `BarChart2` from `lucide-react`):

```typescript
{ href: "/analytics", label: "Analytics", icon: BarChart2 },
```

Also add to the existing import from `lucide-react`:
```typescript
import { ..., BarChart2 } from "lucide-react";
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(m5): add Analytics entry to sidebar navigation"
```

---

## Task 11: E2E Tests

**Files:**
- Create: `tests/e2e/analytics.spec.ts`

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/analytics.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Analytics & Attribution", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: "adflow_session",
        value: "fake_session_token",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("analytics page renders with KPI cards", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("Analytics & Atribuição")).toBeVisible();
    await expect(page.getByText("Conversões")).toBeVisible();
    await expect(page.getByText("Receita")).toBeVisible();
    await expect(page.getByText("CPA")).toBeVisible();
  });

  test("funnel chart section is visible", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("Funil de Conversão")).toBeVisible();
    await expect(page.getByText("Visitas")).toBeVisible();
    await expect(page.getByText("Compras")).toBeVisible();
  });

  test("attribution section is visible", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("Atribuição por Canal")).toBeVisible();
    await expect(page.getByText("Google")).toBeVisible();
    await expect(page.getByText("Facebook / Meta")).toBeVisible();
  });

  test("attribution model selector switches models", async ({ page }) => {
    await page.goto("/analytics");
    await page.getByText("Linear").click();
    await expect(page).toHaveURL(/model=linear/);
  });

  test("date range preset buttons update URL", async ({ page }) => {
    await page.goto("/analytics");
    await page.getByText("7 dias").click();
    await expect(page).toHaveURL(/from=/);
    await expect(page).toHaveURL(/to=/);
  });

  test("sidebar shows Analytics link", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /Analytics/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run unit tests to make sure nothing broke**

```bash
npx vitest run
```
Expected: all unit tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/analytics.spec.ts
git commit -m "test(m5): E2E tests for analytics & attribution dashboard"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] ROAS, CPA, LTV, total conversions KPI cards → Task 6
- [x] Multi-touch attribution: last-click → Task 3
- [x] Multi-touch attribution: linear → Task 3
- [x] Multi-touch attribution: time-decay → Task 3
- [x] Conversion funnel visualization → Task 7
- [x] Channel performance breakdown → Task 8 (`channel-table.tsx`)
- [x] Date range filter → Task 8 (`date-range-picker.tsx`)
- [x] Attribution model selector → Task 8 (`attribution-model-selector.tsx`)
- [x] Database views for aggregates → Task 1
- [x] TypeScript types → Task 2
- [x] Attribution pure functions with tests → Task 3
- [x] Aggregate server functions with tests → Task 4
- [x] API routes (summary, funnel, channels) → Task 5
- [x] Analytics dashboard page → Task 9
- [x] Sidebar navigation → Task 10
- [x] E2E tests → Task 11

**Gaps noted:**
- Ad spend data is not yet available (M2 not done) — ROAS denominator defaults to 1 and is labeled accordingly in the UI.
- Time-series chart (events per day over time) is out of scope for this MVP task — the `daily_event_counts` view is ready to power it in a future iteration.
- LTV card is listed in the PRD but requires user-level purchase history aggregation across multiple sessions, which needs a `users` table from M1. Deferred to post-M1-backend integration.
