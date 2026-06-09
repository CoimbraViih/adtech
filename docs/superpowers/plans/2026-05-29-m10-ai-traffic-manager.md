# M11 — AI Traffic Manager (Campaign Diagnostics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AdFlow's AI Traffic Manager — an automated campaign failure-analysis engine that inspects campaign / ad set / ad metrics, detects underperformance against benchmarks, and produces actionable diagnostics with GPT-4o-written recommendations. This is the analysis half of the platform's closed optimization loop (M5 captures performance → M10 diagnoses → M3 improves creatives → M8 acts). For the MVP this is **human-in-the-loop**: the engine surfaces recommendation cards the user approves or dismisses; it never mutates a live campaign automatically (that escalates to M8).

**Architecture:** A library of **diagnostic skills** (`lib/ai/diagnostics/skills/`), each a pure, declarative rule following one contract: `requiredMetrics`, a deterministic `shouldTrigger(ctx)` heuristic, and an `analyze(ctx)` step that builds a GPT-4o prompt and returns a structured `Diagnostic`. A server-side `engine.ts` loads a campaign's metrics (campaigns + ad_sets + ads, joined with effective benchmarks), runs every registered skill's `shouldTrigger` cheaply (no LLM), and only sends triggered cases to GPT-4o for natural-language rationale + recommendation. Results persist to `ai_diagnostics` (workspace-scoped, RLS). The dashboard view lists open diagnostics as severity-ranked cards with Apply-intent / Dismiss actions. Benchmarks live in `campaign_benchmarks` — seeded with market defaults, overridable per workspace, and later calibrated from the workspace's own history.

**Key design principle:** rules first, LLM second. Determinism decides *whether* a campaign is failing and *which* failure class applies (cheap, testable, no hallucination over numbers). GPT-4o only writes the human explanation and concrete next step for cases that already tripped a rule.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL + RLS), OpenAI GPT-4o via existing `lib/ai/openai.ts` (structured outputs / JSON schema), Recharts (severity summary), Vitest, Playwright. No ML for MVP — deterministic thresholds + LLM narration.

---

## Dependencies

- **M2 (Campaigns):** `campaigns`, `ad_sets`, `ads` tables with denormalized metrics (`spend`, `impressions`, `clicks`, `conversions`, `revenue`, `cpa`, `roas`, `ctr`, `cpc`). ✅ exists (`004_campaigns.sql`).
- **M4 (Pixel):** conversion truth for the "tracking broken" diagnostic. ✅ exists (`006_pixel.sql`).
- **M5 (Analytics):** `conversion_sessions` / `daily_event_counts` views for trend deltas. ✅ exists (`007_analytics_views.sql`).
- **Existing AI helper:** `lib/ai/openai.ts` (mirror `scoreCreative` / `checkPolicy` patterns for the OpenAI call + JSON parsing).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/015_ai_diagnostics.sql` | `campaign_benchmarks` + `ai_diagnostics` tables, enums, RLS, seed defaults |
| Modify | `types/database.ts` | Diagnostic, benchmark, skill, and severity types |
| Create | `lib/ai/diagnostics/types.ts` | `Skill`, `CampaignContext`, `Diagnostic` contracts |
| Create | `lib/ai/diagnostics/benchmarks.ts` | Resolve effective benchmark (workspace override → market default) |
| Create | `lib/ai/diagnostics/context.ts` | Build `CampaignContext` (metrics + benchmarks + trend deltas) from Supabase |
| Create | `lib/ai/diagnostics/skills/low-ctr.ts` | CTR below benchmark → creative/audience mismatch |
| Create | `lib/ai/diagnostics/skills/high-cpa.ts` | CPA above target with volume → offer/page/audience review |
| Create | `lib/ai/diagnostics/skills/creative-fatigue.ts` | High frequency + declining CTR → rotate creative |
| Create | `lib/ai/diagnostics/skills/spend-no-conversion.ts` | Spend with zero conversions → tracking/targeting break |
| Create | `lib/ai/diagnostics/skills/click-no-convert.ts` | Good CTR, low CVR → landing page / offer problem |
| Create | `lib/ai/diagnostics/skills/learning-phase.ts` | Too few conversions → still in learning, hold changes |
| Create | `lib/ai/diagnostics/skills/index.ts` | Skill registry (array of all skills) |
| Create | `lib/ai/diagnostics/engine.ts` | Orchestrator: context → run skills → persist diagnostics |
| Create | `lib/ai/diagnostics/llm.ts` | GPT-4o call w/ JSON schema → `{ rationale, suggested_action }` |
| Create | `app/api/ai/diagnostics/run/route.ts` | POST — run engine for a campaign/workspace |
| Create | `app/api/ai/diagnostics/[id]/route.ts` | PATCH — update diagnostic status (acknowledged/applied/dismissed) |
| Create | `app/(dashboard)/analytics/diagnostics/page.tsx` | Server Component: diagnostics list |
| Create | `components/diagnostics/diagnostic-card.tsx` | Client Component: card w/ severity, rationale, action, Apply/Dismiss |
| Create | `components/diagnostics/severity-summary.tsx` | Counts by severity (Recharts) |
| Create | `components/diagnostics/run-diagnostics-button.tsx` | Client Component: trigger a run |
| Modify | `components/layout/sidebar.tsx` | Add "Diagnostics" nav entry under Analytics |
| Create | `tests/unit/diagnostics-skills.test.ts` | Unit tests for every skill's `shouldTrigger` |
| Create | `tests/unit/diagnostics-benchmarks.test.ts` | Unit tests for benchmark resolution |
| Create | `tests/e2e/diagnostics.spec.ts` | E2E: run, render cards, dismiss |

---

## Task 1: Database — benchmarks & diagnostics tables

**Files:**
- Create: `supabase/migrations/015_ai_diagnostics.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/015_ai_diagnostics.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- M10: AI Traffic Manager — Campaign Diagnostics
-- Tables: campaign_benchmarks, ai_diagnostics
-- ─────────────────────────────────────────────────────────────────────────────

-- ── enums ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE diagnostic_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diagnostic_status AS ENUM ('open', 'acknowledged', 'applied', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diagnostic_entity AS ENUM ('campaign', 'ad_set', 'ad');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── campaign_benchmarks ──────────────────────────────────────────────────────
-- Effective threshold = workspace override (workspace_id NOT NULL) else market
-- default (workspace_id NULL). Keyed by platform + objective + metric.
CREATE TABLE IF NOT EXISTS campaign_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL = global default
  platform        campaign_platform NOT NULL,
  objective       campaign_objective NOT NULL,
  metric          TEXT NOT NULL,            -- 'ctr' | 'cpa' | 'roas' | 'frequency' | 'cvr'
  target_value    NUMERIC(14, 4) NOT NULL,  -- the goal/threshold
  comparator      TEXT NOT NULL DEFAULT 'gte' CHECK (comparator IN ('gte', 'lte')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_benchmarks_unique_idx
  ON campaign_benchmarks (COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), platform, objective, metric);

-- ── ai_diagnostics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_diagnostics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type      diagnostic_entity NOT NULL,
  entity_id        UUID NOT NULL,            -- campaign/ad_set/ad id (no FK: polymorphic)
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  skill_id         TEXT NOT NULL,            -- e.g. 'low-ctr'
  severity         diagnostic_severity NOT NULL DEFAULT 'warning',
  status           diagnostic_status NOT NULL DEFAULT 'open',
  title            TEXT NOT NULL,
  rationale        TEXT NOT NULL,            -- GPT-4o explanation
  suggested_action TEXT NOT NULL,            -- GPT-4o next step
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, -- numbers that triggered the rule
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_diagnostics_workspace_idx ON ai_diagnostics(workspace_id);
CREATE INDEX IF NOT EXISTS ai_diagnostics_campaign_idx  ON ai_diagnostics(campaign_id);
CREATE INDEX IF NOT EXISTS ai_diagnostics_status_idx    ON ai_diagnostics(status);
-- avoid duplicate open diagnostics for the same entity+skill
CREATE UNIQUE INDEX IF NOT EXISTS ai_diagnostics_open_unique_idx
  ON ai_diagnostics(entity_type, entity_id, skill_id)
  WHERE status = 'open';

-- ── updated_at triggers ────────────────────────────────────────────────────────
CREATE TRIGGER set_campaign_benchmarks_updated_at BEFORE UPDATE ON campaign_benchmarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_ai_diagnostics_updated_at BEFORE UPDATE ON ai_diagnostics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE campaign_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_diagnostics      ENABLE ROW LEVEL SECURITY;

-- benchmarks: read global defaults (workspace_id IS NULL) OR own-workspace overrides
CREATE POLICY campaign_benchmarks_select ON campaign_benchmarks FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
-- only members may write workspace-level overrides (never the global rows)
CREATE POLICY campaign_benchmarks_write ON campaign_benchmarks FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

-- diagnostics: workspace-scoped read for any member, write for member+
CREATE POLICY ai_diagnostics_select ON ai_diagnostics FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY ai_diagnostics_write ON ai_diagnostics FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

-- ── seed market-default benchmarks (workspace_id NULL) ──────────────────────────
-- Conservative starting points; calibrate per-workspace later.
INSERT INTO campaign_benchmarks (workspace_id, platform, objective, metric, target_value, comparator) VALUES
  (NULL, 'meta',   'conversions', 'ctr',       0.0100, 'gte'),
  (NULL, 'meta',   'conversions', 'frequency', 3.5000, 'lte'),
  (NULL, 'meta',   'conversions', 'roas',      2.0000, 'gte'),
  (NULL, 'google', 'conversions', 'ctr',       0.0200, 'gte'),
  (NULL, 'google', 'conversions', 'roas',      2.0000, 'gte')
ON CONFLICT DO NOTHING;
```

> **Note:** Confirm the `set_updated_at()` trigger function name matches the one defined in `001_initial_schema.sql`. Also confirm the `campaign_platform` and `campaign_objective` enum values referenced here exist (`meta`, `google`, `conversions`). Adjust seed rows to match actual enum members before applying.

- [ ] **Step 2: Verify file exists**

```bash
ls supabase/migrations/015_ai_diagnostics.sql
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/015_ai_diagnostics.sql
git commit -m "feat(m10): ai_diagnostics + campaign_benchmarks tables with RLS and seed defaults"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `types/database.ts`
- Create: `lib/ai/diagnostics/types.ts`

- [ ] **Step 1: Append DB row types to `types/database.ts`**

```typescript
// ─── M10: AI Traffic Manager ──────────────────────────────────────────────────

export type DiagnosticSeverity = "info" | "warning" | "critical";
export type DiagnosticStatus = "open" | "acknowledged" | "applied" | "dismissed";
export type DiagnosticEntity = "campaign" | "ad_set" | "ad";

export type CampaignBenchmark = {
  id: string;
  workspace_id: string | null;
  platform: string;
  objective: string;
  metric: string;
  target_value: number;
  comparator: "gte" | "lte";
  created_at: string;
  updated_at: string;
};

export type AiDiagnostic = {
  id: string;
  workspace_id: string;
  entity_type: DiagnosticEntity;
  entity_id: string;
  campaign_id: string | null;
  skill_id: string;
  severity: DiagnosticSeverity;
  status: DiagnosticStatus;
  title: string;
  rationale: string;
  suggested_action: string;
  metrics_snapshot: Record<string, number>;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Create the skill contract in `lib/ai/diagnostics/types.ts`**

```typescript
import type { DiagnosticSeverity, DiagnosticEntity } from "@/types/database";

/** Metrics + resolved benchmarks for one entity under analysis. */
export type CampaignContext = {
  workspaceId: string;
  entityType: DiagnosticEntity;
  entityId: string;
  campaignId: string | null;
  name: string;
  platform: string;
  objective: string;
  // current denormalized metrics
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number | null;
  cpa: number | null;
  roas: number | null;
  frequency: number | null; // reach-derived; null if unavailable
  cvr: number | null;        // conversions / clicks
  // 7-day trend deltas (percent change), null if insufficient history
  ctrDelta7d: number | null;
  // resolved benchmark lookup: metric -> { target, comparator }
  benchmarks: Record<string, { target: number; comparator: "gte" | "lte" }>;
};

/** What a skill returns before LLM narration. */
export type SkillFinding = {
  severity: DiagnosticSeverity;
  title: string;
  /** machine summary handed to the LLM to write rationale + action */
  evidence: string;
  metricsSnapshot: Record<string, number>;
};

export type Skill = {
  id: string;               // 'low-ctr'
  label: string;            // 'CTR below benchmark'
  requiredMetrics: string[];
  /** cheap, deterministic — no LLM. Returns null when not triggered. */
  shouldTrigger: (ctx: CampaignContext) => SkillFinding | null;
};
```

- [ ] **Step 3: Commit**

```bash
git add types/database.ts lib/ai/diagnostics/types.ts
git commit -m "feat(m10): diagnostic types and skill contract"
```

---

## Task 3: Benchmark resolution

**Files:**
- Create: `lib/ai/diagnostics/benchmarks.ts`
- Create: `tests/unit/diagnostics-benchmarks.test.ts`

- [ ] **Step 1: Implement `resolveBenchmarks`**

`lib/ai/diagnostics/benchmarks.ts` — fetch all rows matching `(platform, objective)` where `workspace_id IS NULL OR workspace_id = :ws`, then collapse to one map per metric, preferring the workspace override over the global default:

```typescript
import { createClient } from "@/lib/supabase/server";

export async function resolveBenchmarks(
  workspaceId: string,
  platform: string,
  objective: string,
): Promise<Record<string, { target: number; comparator: "gte" | "lte" }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_benchmarks")
    .select("workspace_id, metric, target_value, comparator")
    .eq("platform", platform)
    .eq("objective", objective)
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);
  if (error) throw error;

  const map: Record<string, { target: number; comparator: "gte" | "lte"; ws: boolean }> = {};
  for (const row of data ?? []) {
    const isWs = row.workspace_id !== null;
    const existing = map[row.metric];
    if (!existing || (isWs && !existing.ws)) {
      map[row.metric] = { target: Number(row.target_value), comparator: row.comparator, ws: isWs };
    }
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, { target: v.target, comparator: v.comparator }]),
  );
}
```

- [ ] **Step 2: Unit test** override-wins-over-default in `tests/unit/diagnostics-benchmarks.test.ts` (mock the Supabase client; assert workspace row beats global for the same metric, and global is used when no override exists).

- [ ] **Step 3: Commit**

```bash
git add lib/ai/diagnostics/benchmarks.ts tests/unit/diagnostics-benchmarks.test.ts
git commit -m "feat(m10): benchmark resolution (workspace override over market default)"
```

---

## Task 4: Diagnostic skills (the rule library)

**Files:**
- Create: the six skill files + `lib/ai/diagnostics/skills/index.ts`
- Create: `tests/unit/diagnostics-skills.test.ts`

Each skill is a pure function. Example — `lib/ai/diagnostics/skills/low-ctr.ts`:

```typescript
import type { Skill } from "../types";

export const lowCtr: Skill = {
  id: "low-ctr",
  label: "CTR below benchmark",
  requiredMetrics: ["ctr", "impressions"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["ctr"];
    if (!bench || ctx.ctr == null || ctx.impressions < 1000) return null; // need volume
    const failing = bench.comparator === "gte" ? ctx.ctr < bench.target : ctx.ctr > bench.target;
    if (!failing) return null;
    // healthy CVR → problem is the ad, not the page
    const cvrOk = ctx.cvr == null || ctx.cvr >= 0.01;
    return {
      severity: ctx.ctr < bench.target * 0.5 ? "critical" : "warning",
      title: "CTR below target",
      evidence:
        `CTR ${(ctx.ctr * 100).toFixed(2)}% vs target ${(bench.target * 100).toFixed(2)}% ` +
        `over ${ctx.impressions} impressions; CVR ${cvrOk ? "healthy" : "also low"}. ` +
        `Likely creative or audience mismatch.`,
      metricsSnapshot: { ctr: ctx.ctr, ctr_target: bench.target, impressions: ctx.impressions },
    };
  },
};
```

- [ ] **Step 1: Implement all six skills** following the same shape:
  - `low-ctr.ts` — CTR < benchmark with volume → creative/audience.
  - `high-cpa.ts` — `cpa > benchmark` (comparator `lte`) with conversions > 0 → offer/page/audience.
  - `creative-fatigue.ts` — `frequency > benchmark` AND `ctrDelta7d <= -0.20` → rotate creative (critical if frequency very high).
  - `spend-no-conversion.ts` — `spend >= 3 * cpa_target` (or fixed floor) AND `conversions == 0` → tracking break / targeting; severity `critical`.
  - `click-no-convert.ts` — `ctr >= benchmark` but `cvr < 0.005` with clicks > 100 → landing page / offer problem.
  - `learning-phase.ts` — `conversions < 50` in trailing window AND campaign age < 7d → `info`, hold changes.
- [ ] **Step 2: Build the registry** `lib/ai/diagnostics/skills/index.ts`:

```typescript
import type { Skill } from "../types";
import { lowCtr } from "./low-ctr";
import { highCpa } from "./high-cpa";
import { creativeFatigue } from "./creative-fatigue";
import { spendNoConversion } from "./spend-no-conversion";
import { clickNoConvert } from "./click-no-convert";
import { learningPhase } from "./learning-phase";

export const SKILLS: Skill[] = [
  lowCtr, highCpa, creativeFatigue, spendNoConversion, clickNoConvert, learningPhase,
];
```

- [ ] **Step 3: Unit-test every skill** in `tests/unit/diagnostics-skills.test.ts` — for each, one fixture that triggers and one that does not. Assert `shouldTrigger` is pure (same input → same output) and respects volume floors. This is the most important test file in the milestone: the rules are the product's correctness surface.
- [ ] **Step 4: Commit**

```bash
git add lib/ai/diagnostics/skills tests/unit/diagnostics-skills.test.ts
git commit -m "feat(m10): six diagnostic skills with deterministic trigger rules + unit tests"
```

---

## Task 5: LLM narration

**Files:**
- Create: `lib/ai/diagnostics/llm.ts`

- [ ] **Step 1: Implement `narrateDiagnostic`** mirroring `scoreCreative` in `lib/ai/openai.ts`. Input: the `SkillFinding.evidence` + entity name/platform. Output via JSON schema: `{ rationale: string, suggested_action: string }`. System prompt frames the model as a senior Brazilian paid-traffic manager writing concise, concrete recommendations in pt-BR. Temperature low (≤ 0.3). Hard rule in the prompt: **do not invent numbers — only use the evidence provided.** On API error, fall back to using `evidence` as the rationale and a generic action so a diagnostic is still produced.

- [ ] **Step 2: Commit**

```bash
git add lib/ai/diagnostics/llm.ts
git commit -m "feat(m10): GPT-4o diagnostic narration with structured output + safe fallback"
```

---

## Task 6: Context builder + engine

**Files:**
- Create: `lib/ai/diagnostics/context.ts`
- Create: `lib/ai/diagnostics/engine.ts`

- [ ] **Step 1: `context.ts`** — given a `workspaceId` (and optional `campaignId`), fetch campaigns (+ ad_sets, ads) with their denormalized metrics, compute derived `cvr` (`conversions/clicks`) and `frequency` (if reach available), pull 7-day CTR delta from `daily_event_counts`/campaign history, call `resolveBenchmarks`, and return a `CampaignContext[]` (one per entity to analyze). Start with campaign-level only; ad_set/ad granularity can be a follow-up.

- [ ] **Step 2: `engine.ts`** — `runDiagnostics(workspaceId, opts)`:
  1. Build contexts via `context.ts`.
  2. For each context, run every `SKILLS[i].shouldTrigger(ctx)`; collect findings.
  3. For each finding, call `narrateDiagnostic`.
  4. Upsert into `ai_diagnostics` (the partial unique index prevents duplicate `open` rows for the same entity+skill — use `onConflict` ignore or update `metrics_snapshot`).
  5. Return the created/updated diagnostics.
  Keep LLM calls bounded (e.g. cap findings per run, `Promise.all` with a small concurrency limit) to control cost and latency.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/diagnostics/context.ts lib/ai/diagnostics/engine.ts
git commit -m "feat(m10): campaign context builder and diagnostics engine orchestrator"
```

---

## Task 7: API routes

**Files:**
- Create: `app/api/ai/diagnostics/run/route.ts`
- Create: `app/api/ai/diagnostics/[id]/route.ts`

- [ ] **Step 1: `run/route.ts` (POST)** — auth via `supabase.auth.getUser()` (never `getSession()`); validate the caller is a member of the target workspace and has role `member`+; read `{ workspaceId, campaignId? }` from body; call `runDiagnostics`; return `{ diagnostics }`. Errors return `{ error: string }` with the right status; never leak Supabase/OpenAI internals.

- [ ] **Step 2: `[id]/route.ts` (PATCH)** — update a diagnostic's `status` to `acknowledged | applied | dismissed`. Validate the status enum and workspace membership. (Setting `applied` here only records intent — actually pushing changes to Meta/Google is M8's job; link the two in a follow-up.)

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/diagnostics
git commit -m "feat(m10): diagnostics run + status-update API routes with auth guards"
```

---

## Task 8: Dashboard UI

**Files:**
- Create: `app/(dashboard)/analytics/diagnostics/page.tsx`
- Create: `components/diagnostics/diagnostic-card.tsx`
- Create: `components/diagnostics/severity-summary.tsx`
- Create: `components/diagnostics/run-diagnostics-button.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Page (Server Component)** — fetch open `ai_diagnostics` for the active workspace ordered by severity (`critical` → `warning` → `info`) then `created_at desc`; render `SeveritySummary` + a list of `DiagnosticCard`s + the `RunDiagnosticsButton`. Empty state: "No issues detected — run an analysis."

- [ ] **Step 2: `DiagnosticCard` (Client Component)** — show severity chip (use design tokens: `--color-danger` critical, `--color-warning` warning, `--color-data` info), title, campaign name, `rationale`, a highlighted `suggested_action`, and the `metrics_snapshot` in a compact JetBrains-Mono row. Two actions: **Apply** (PATCH → `applied`) and **Dismiss** (PATCH → `dismissed`), optimistic UI. Dark-mode only, data-dense, Linear-style — no hero sections.

- [ ] **Step 3: `SeveritySummary`** — small Recharts bar/segmented counts by severity.

- [ ] **Step 4: `RunDiagnosticsButton` (Client Component)** — POST to `/api/ai/diagnostics/run`, show a spinner, refresh on success.

- [ ] **Step 5: Sidebar** — add a "Diagnostics" entry nested under Analytics.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/analytics/diagnostics components/diagnostics components/layout/sidebar.tsx
git commit -m "feat(m10): diagnostics dashboard — cards, severity summary, run button, nav"
```

---

## Task 9: E2E + verification

**Files:**
- Create: `tests/e2e/diagnostics.spec.ts`

- [ ] **Step 1: E2E (Playwright)** — seed a failing campaign fixture, log in, open `/analytics/diagnostics`, click Run, assert at least one card renders with a severity chip and a suggested action, dismiss it, assert it disappears.

- [ ] **Step 2: Run the suites**

```bash
npm test                       # unit — skills + benchmarks must pass
npm run test:e2e -- diagnostics
```

- [ ] **Step 3: Manual verification checklist**
  - [ ] A campaign with CTR under benchmark and ≥1000 impressions produces a `low-ctr` diagnostic.
  - [ ] A campaign with spend but zero conversions produces a `critical` `spend-no-conversion` diagnostic.
  - [ ] Re-running does **not** create duplicate `open` rows (partial unique index holds).
  - [ ] A non-member of the workspace gets 403 from both routes (RLS + route guard).
  - [ ] LLM rationale contains no numbers absent from `metrics_snapshot` (spot-check a few).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/diagnostics.spec.ts
git commit -m "test(m10): e2e diagnostics flow + verification"
```

---

## Out of Scope (future work)

- **Auto-apply / write-back** to Meta & Google Ads APIs — escalate `applied` diagnostics into M8 automation actions (with guardrails for the learning phase).
- **History-calibrated benchmarks** — replace seeded market defaults with per-workspace rolling baselines once enough data accrues.
- **Ad-set / ad-level granularity** and cross-entity diagnostics (budget reallocation across ad sets by marginal efficiency).
- **Scheduled runs** — a cron/scheduled job that runs diagnostics daily and notifies via the M8 alert channels.
- **ClickHouse** trend queries for large-scale CTR-delta computation.

---

## Milestone Registration

Add to the milestones table in `CLAUDE.md`:

```
| M10 | AI Traffic Manager (Campaign Diagnostics) | Planned | docs/superpowers/plans/2026-05-29-m10-ai-traffic-manager.md |
```
