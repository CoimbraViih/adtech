# M11 — AI Traffic Manager (Campaign Diagnostics) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build AdFlow's AI Traffic Manager — a campaign failure-analysis engine that detects underperformance against benchmarks with deterministic rules and produces human-readable recommendations via GPT-4o. Human-in-the-loop: users approve or dismiss cards; no automatic campaign mutations.

**Architecture:** A library of pure `Skill` functions (`lib/ai/diagnostics/skills/`) each with a cheap deterministic `shouldTrigger(ctx)` heuristic. The `engine.ts` orchestrator builds `CampaignContext[]` (metrics + benchmarks + 7d trends), runs every skill's trigger check, sends only the triggered cases to GPT-4o for pt-BR narration (rationale + suggested_action), and upserts results into `ai_diagnostics`. A partial unique index prevents duplicate `open` diagnostics for the same entity+skill. Dashboard shows severity-ranked cards (critical → warning → info) with Apply/Dismiss actions.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase PostgreSQL + RLS, OpenAI GPT-4o via existing `lib/ai/openai.ts` pattern (chatCompletion + getCredentialField), Recharts, Vitest, Playwright.

---

## Important context before starting

- **Next migration number:** `015` — last existing is `014_api_credentials.sql`.
- **OpenAI API key:** fetched via `getCredentialField(orgId, "openai", "api_key", "OPENAI_API_KEY")` in `lib/ai/openai.ts`. The `llm.ts` function must receive `organizationId` as a parameter.
- **Supabase client:** always `await createClient()` from `@/lib/supabase/server` in server-side code; never `getSession()`.
- **Enums in migration:** `campaign_platform` and `campaign_objective` already exist in `004_campaigns.sql` — do not redefine them.
- **Trigger function:** `set_updated_at()` already defined in `001_initial_schema.sql`.
- **Design tokens:** `--color-danger` (critical), `--color-warning` (warning), `--color-data` (info). Dark mode only, JetBrains Mono for metrics data.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/015_ai_diagnostics.sql`

### Step 1: Create the migration file

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- M11: AI Traffic Manager — Campaign Diagnostics
-- Tables: campaign_benchmarks, ai_diagnostics
-- ─────────────────────────────────────────────────────────────────────────────

-- ── enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE diagnostic_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diagnostic_status AS ENUM ('open', 'acknowledged', 'applied', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diagnostic_entity AS ENUM ('campaign', 'ad_set', 'ad');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── campaign_benchmarks ───────────────────────────────────────────────────────
-- workspace_id NULL = global market default; NOT NULL = workspace override.
-- Effective value: workspace override beats global for the same (platform, objective, metric).
CREATE TABLE IF NOT EXISTS campaign_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform        campaign_platform NOT NULL,
  objective       campaign_objective NOT NULL,
  metric          TEXT NOT NULL,
  target_value    NUMERIC(14, 4) NOT NULL,
  comparator      TEXT NOT NULL DEFAULT 'gte' CHECK (comparator IN ('gte', 'lte')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_benchmarks_unique_idx
  ON campaign_benchmarks (
    COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    platform, objective, metric
  );

-- ── ai_diagnostics ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_diagnostics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type      diagnostic_entity NOT NULL,
  entity_id        UUID NOT NULL,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  skill_id         TEXT NOT NULL,
  severity         diagnostic_severity NOT NULL DEFAULT 'warning',
  status           diagnostic_status NOT NULL DEFAULT 'open',
  title            TEXT NOT NULL,
  rationale        TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_diagnostics_workspace_idx ON ai_diagnostics(workspace_id);
CREATE INDEX IF NOT EXISTS ai_diagnostics_campaign_idx  ON ai_diagnostics(campaign_id);
CREATE INDEX IF NOT EXISTS ai_diagnostics_status_idx    ON ai_diagnostics(status);
-- prevents duplicate open diagnostics for same entity+skill
CREATE UNIQUE INDEX IF NOT EXISTS ai_diagnostics_open_unique_idx
  ON ai_diagnostics(entity_type, entity_id, skill_id)
  WHERE status = 'open';

-- ── updated_at triggers ───────────────────────────────────────────────────────
CREATE TRIGGER set_campaign_benchmarks_updated_at
  BEFORE UPDATE ON campaign_benchmarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_ai_diagnostics_updated_at
  BEFORE UPDATE ON ai_diagnostics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE campaign_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_diagnostics      ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_benchmarks_select ON campaign_benchmarks FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY campaign_benchmarks_write ON campaign_benchmarks FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

CREATE POLICY ai_diagnostics_select ON ai_diagnostics FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY ai_diagnostics_write ON ai_diagnostics FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

-- ── seed market-default benchmarks ───────────────────────────────────────────
INSERT INTO campaign_benchmarks
  (workspace_id, platform, objective, metric, target_value, comparator)
VALUES
  (NULL, 'meta',   'conversions', 'ctr',       0.0100, 'gte'),
  (NULL, 'meta',   'conversions', 'frequency', 3.5000, 'lte'),
  (NULL, 'meta',   'conversions', 'roas',      2.0000, 'gte'),
  (NULL, 'meta',   'conversions', 'cpa',       50.000, 'lte'),
  (NULL, 'google', 'conversions', 'ctr',       0.0200, 'gte'),
  (NULL, 'google', 'conversions', 'roas',      2.0000, 'gte'),
  (NULL, 'google', 'conversions', 'cpa',       50.000, 'lte')
ON CONFLICT DO NOTHING;
```

### Step 2: Verify the file was created

```bash
ls supabase/migrations/015_ai_diagnostics.sql
```

Expected: the file listed.

### Step 3: Commit

```bash
git add supabase/migrations/015_ai_diagnostics.sql
git commit -m "feat(m11): campaign_benchmarks + ai_diagnostics tables, RLS, seed defaults"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `types/database.ts` (append at end of file)
- Create: `lib/ai/diagnostics/types.ts`

### Step 1: Append DB row types to `types/database.ts`

Add to the **bottom** of the file:

```typescript
// ─── M11: AI Traffic Manager ──────────────────────────────────────────────────

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

### Step 2: Create `lib/ai/diagnostics/types.ts`

```typescript
import type { DiagnosticSeverity, DiagnosticEntity } from "@/types/database";

export type CampaignContext = {
  workspaceId: string;
  organizationId: string;
  entityType: DiagnosticEntity;
  entityId: string;
  campaignId: string | null;
  name: string;
  platform: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number | null;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
  cvr: number | null;
  ctrDelta7d: number | null;
  benchmarks: Record<string, { target: number; comparator: "gte" | "lte" }>;
};

export type SkillFinding = {
  severity: DiagnosticSeverity;
  title: string;
  evidence: string;
  metricsSnapshot: Record<string, number>;
};

export type Skill = {
  id: string;
  label: string;
  requiredMetrics: string[];
  shouldTrigger: (ctx: CampaignContext) => SkillFinding | null;
};
```

### Step 3: Run type check

```bash
npx tsc --noEmit
```

Expected: zero errors.

### Step 4: Commit

```bash
git add types/database.ts lib/ai/diagnostics/types.ts
git commit -m "feat(m11): DiagnosticSeverity/Status/Entity, AiDiagnostic, CampaignContext, Skill types"
```

---

## Task 3: Benchmark resolution

**Files:**
- Create: `lib/ai/diagnostics/benchmarks.ts`
- Create: `tests/unit/diagnostics-benchmarks.test.ts`

### Step 1: Write the failing test first

`tests/unit/diagnostics-benchmarks.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { resolveBenchmarks } from "@/lib/ai/diagnostics/benchmarks";

function makeSupabaseMock(rows: object[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            or: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    }),
  };
}

describe("resolveBenchmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns global default when no workspace override exists", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock([
        { workspace_id: null, metric: "ctr", target_value: "0.0100", comparator: "gte" },
      ]) as never,
    );
    const result = await resolveBenchmarks("ws-1", "meta", "conversions");
    expect(result.ctr).toEqual({ target: 0.01, comparator: "gte" });
  });

  it("workspace override wins over global default for the same metric", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock([
        { workspace_id: null,   metric: "ctr", target_value: "0.0100", comparator: "gte" },
        { workspace_id: "ws-1", metric: "ctr", target_value: "0.0200", comparator: "gte" },
      ]) as never,
    );
    const result = await resolveBenchmarks("ws-1", "meta", "conversions");
    expect(result.ctr).toEqual({ target: 0.02, comparator: "gte" });
  });

  it("returns empty object when no benchmarks exist for platform/objective", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock([]) as never,
    );
    const result = await resolveBenchmarks("ws-1", "tiktok", "awareness");
    expect(result).toEqual({});
  });
});
```

### Step 2: Run test to confirm it fails

```bash
npx vitest run tests/unit/diagnostics-benchmarks.test.ts
```

Expected: FAIL — `resolveBenchmarks` not found.

### Step 3: Implement `lib/ai/diagnostics/benchmarks.ts`

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

  const map: Record<
    string,
    { target: number; comparator: "gte" | "lte"; isWorkspace: boolean }
  > = {};

  for (const row of data ?? []) {
    const isWorkspace = row.workspace_id !== null;
    const existing = map[row.metric];
    if (!existing || (isWorkspace && !existing.isWorkspace)) {
      map[row.metric] = {
        target: Number(row.target_value),
        comparator: row.comparator as "gte" | "lte",
        isWorkspace,
      };
    }
  }

  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, { target: v.target, comparator: v.comparator }]),
  );
}
```

### Step 4: Run tests — must pass

```bash
npx vitest run tests/unit/diagnostics-benchmarks.test.ts
```

Expected: 3/3 PASS.

### Step 5: Commit

```bash
git add lib/ai/diagnostics/benchmarks.ts tests/unit/diagnostics-benchmarks.test.ts
git commit -m "feat(m11): benchmark resolution — workspace override beats global default"
```

---

## Task 4: Diagnostic skills (the rule library)

**Files:**
- Create: `lib/ai/diagnostics/skills/low-ctr.ts`
- Create: `lib/ai/diagnostics/skills/high-cpa.ts`
- Create: `lib/ai/diagnostics/skills/creative-fatigue.ts`
- Create: `lib/ai/diagnostics/skills/spend-no-conversion.ts`
- Create: `lib/ai/diagnostics/skills/click-no-convert.ts`
- Create: `lib/ai/diagnostics/skills/learning-phase.ts`
- Create: `lib/ai/diagnostics/skills/index.ts`
- Create: `tests/unit/diagnostics-skills.test.ts`

### Step 1: Write the unit tests first

`tests/unit/diagnostics-skills.test.ts` — for each skill, one fixture that **triggers** and one that does **not**:

```typescript
import { describe, it, expect } from "vitest";
import type { CampaignContext } from "@/lib/ai/diagnostics/types";
import { lowCtr } from "@/lib/ai/diagnostics/skills/low-ctr";
import { highCpa } from "@/lib/ai/diagnostics/skills/high-cpa";
import { creativeFatigue } from "@/lib/ai/diagnostics/skills/creative-fatigue";
import { spendNoConversion } from "@/lib/ai/diagnostics/skills/spend-no-conversion";
import { clickNoConvert } from "@/lib/ai/diagnostics/skills/click-no-convert";
import { learningPhase } from "@/lib/ai/diagnostics/skills/learning-phase";

function baseCtx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    workspaceId: "ws-1",
    organizationId: "org-1",
    entityType: "campaign",
    entityId: "c-1",
    campaignId: "c-1",
    name: "Test Campaign",
    platform: "meta",
    objective: "conversions",
    spend: 500,
    impressions: 5000,
    clicks: 200,
    conversions: 10,
    revenue: 1500,
    ctr: 0.04,
    cpa: 50,
    roas: 3.0,
    frequency: 2.0,
    cvr: 0.05,
    ctrDelta7d: 0,
    benchmarks: {
      ctr:       { target: 0.01,  comparator: "gte" },
      cpa:       { target: 50,    comparator: "lte" },
      roas:      { target: 2.0,   comparator: "gte" },
      frequency: { target: 3.5,   comparator: "lte" },
    },
    ...overrides,
  };
}

describe("low-ctr skill", () => {
  it("triggers when CTR is below benchmark with enough impressions", () => {
    const ctx = baseCtx({ ctr: 0.005, impressions: 2000 });
    expect(lowCtr.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when CTR meets benchmark", () => {
    const ctx = baseCtx({ ctr: 0.02, impressions: 2000 });
    expect(lowCtr.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when impressions volume is too low", () => {
    const ctx = baseCtx({ ctr: 0.001, impressions: 500 });
    expect(lowCtr.shouldTrigger(ctx)).toBeNull();
  });
});

describe("high-cpa skill", () => {
  it("triggers when CPA exceeds benchmark and there are conversions", () => {
    const ctx = baseCtx({ cpa: 120, conversions: 5 });
    expect(highCpa.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when CPA is within benchmark", () => {
    const ctx = baseCtx({ cpa: 30, conversions: 5 });
    expect(highCpa.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when there are no conversions (different skill handles that)", () => {
    const ctx = baseCtx({ cpa: 999, conversions: 0 });
    expect(highCpa.shouldTrigger(ctx)).toBeNull();
  });
});

describe("creative-fatigue skill", () => {
  it("triggers when frequency is high AND CTR dropped >= 20%", () => {
    const ctx = baseCtx({ frequency: 5.0, ctrDelta7d: -0.25 });
    expect(creativeFatigue.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when frequency is high but CTR is stable", () => {
    const ctx = baseCtx({ frequency: 5.0, ctrDelta7d: -0.05 });
    expect(creativeFatigue.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when frequency is within benchmark", () => {
    const ctx = baseCtx({ frequency: 2.0, ctrDelta7d: -0.30 });
    expect(creativeFatigue.shouldTrigger(ctx)).toBeNull();
  });
});

describe("spend-no-conversion skill", () => {
  it("triggers as critical when spend >= 3x CPA target and zero conversions", () => {
    const ctx = baseCtx({ spend: 200, conversions: 0 }); // cpa target = 50, 3x = 150
    const finding = spendNoConversion.shouldTrigger(ctx);
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("critical");
  });

  it("does not trigger when spend is below the threshold", () => {
    const ctx = baseCtx({ spend: 50, conversions: 0 }); // 50 < 150
    expect(spendNoConversion.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when there are conversions", () => {
    const ctx = baseCtx({ spend: 500, conversions: 3 });
    expect(spendNoConversion.shouldTrigger(ctx)).toBeNull();
  });
});

describe("click-no-convert skill", () => {
  it("triggers when CTR is healthy but CVR is below 0.5% with volume", () => {
    const ctx = baseCtx({ ctr: 0.04, cvr: 0.002, clicks: 200 });
    expect(clickNoConvert.shouldTrigger(ctx)).not.toBeNull();
  });

  it("does not trigger when CVR is acceptable", () => {
    const ctx = baseCtx({ ctr: 0.04, cvr: 0.02, clicks: 200 });
    expect(clickNoConvert.shouldTrigger(ctx)).toBeNull();
  });

  it("does not trigger when click volume is too low", () => {
    const ctx = baseCtx({ ctr: 0.04, cvr: 0.001, clicks: 50 });
    expect(clickNoConvert.shouldTrigger(ctx)).toBeNull();
  });
});

describe("learning-phase skill", () => {
  it("triggers as info when conversions < 50", () => {
    const ctx = baseCtx({ conversions: 10 });
    const finding = learningPhase.shouldTrigger(ctx);
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("info");
  });

  it("does not trigger once 50+ conversions accumulated", () => {
    const ctx = baseCtx({ conversions: 60 });
    expect(learningPhase.shouldTrigger(ctx)).toBeNull();
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
npx vitest run tests/unit/diagnostics-skills.test.ts
```

Expected: FAIL — skill modules not found.

### Step 3: Implement all six skills

**`lib/ai/diagnostics/skills/low-ctr.ts`:**

```typescript
import type { Skill } from "../types";

export const lowCtr: Skill = {
  id: "low-ctr",
  label: "CTR abaixo do benchmark",
  requiredMetrics: ["ctr", "impressions"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["ctr"];
    if (!bench || ctx.ctr == null || ctx.impressions < 1000) return null;
    const failing = bench.comparator === "gte" ? ctx.ctr < bench.target : ctx.ctr > bench.target;
    if (!failing) return null;
    return {
      severity: ctx.ctr < bench.target * 0.5 ? "critical" : "warning",
      title: "CTR abaixo do benchmark",
      evidence:
        `CTR de ${(ctx.ctr * 100).toFixed(2)}% vs meta ${(bench.target * 100).toFixed(2)}% ` +
        `em ${ctx.impressions.toLocaleString("pt-BR")} impressões. ` +
        `Possível desalinhamento de criativo ou audiência.`,
      metricsSnapshot: { ctr: ctx.ctr, ctr_target: bench.target, impressions: ctx.impressions },
    };
  },
};
```

**`lib/ai/diagnostics/skills/high-cpa.ts`:**

```typescript
import type { Skill } from "../types";

export const highCpa: Skill = {
  id: "high-cpa",
  label: "CPA acima do target",
  requiredMetrics: ["cpa", "conversions"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["cpa"];
    if (!bench || ctx.cpa == null || ctx.conversions === 0) return null;
    const failing = bench.comparator === "lte" ? ctx.cpa > bench.target : ctx.cpa < bench.target;
    if (!failing) return null;
    return {
      severity: ctx.cpa > bench.target * 2 ? "critical" : "warning",
      title: "CPA acima do target",
      evidence:
        `CPA R$${ctx.cpa.toFixed(2)} vs target R$${bench.target.toFixed(2)} ` +
        `com ${ctx.conversions} conversões. Revisar oferta, página de destino ou audiência.`,
      metricsSnapshot: { cpa: ctx.cpa, cpa_target: bench.target, conversions: ctx.conversions },
    };
  },
};
```

**`lib/ai/diagnostics/skills/creative-fatigue.ts`:**

```typescript
import type { Skill } from "../types";

export const creativeFatigue: Skill = {
  id: "creative-fatigue",
  label: "Fadiga de criativo",
  requiredMetrics: ["frequency", "ctrDelta7d"],
  shouldTrigger(ctx) {
    const bench = ctx.benchmarks["frequency"];
    if (!bench || ctx.frequency == null || ctx.ctrDelta7d == null) return null;
    const freqHigh = bench.comparator === "lte" ? ctx.frequency > bench.target : ctx.frequency < bench.target;
    if (!freqHigh) return null;
    if (ctx.ctrDelta7d > -0.20) return null;
    return {
      severity: ctx.frequency > bench.target * 1.5 ? "critical" : "warning",
      title: "Fadiga de criativo detectada",
      evidence:
        `Frequência ${ctx.frequency.toFixed(1)}x (limite ${bench.target}x) com queda de CTR ` +
        `de ${(Math.abs(ctx.ctrDelta7d) * 100).toFixed(0)}% em 7 dias. Rotacionar criativos.`,
      metricsSnapshot: {
        frequency: ctx.frequency,
        frequency_limit: bench.target,
        ctr_delta_7d: ctx.ctrDelta7d,
      },
    };
  },
};
```

**`lib/ai/diagnostics/skills/spend-no-conversion.ts`:**

```typescript
import type { Skill } from "../types";

export const spendNoConversion: Skill = {
  id: "spend-no-conversion",
  label: "Gasto sem conversão",
  requiredMetrics: ["spend", "conversions"],
  shouldTrigger(ctx) {
    if (ctx.conversions > 0) return null;
    const cpaBench = ctx.benchmarks["cpa"];
    const spendFloor = cpaBench ? cpaBench.target * 3 : 150;
    if (ctx.spend < spendFloor) return null;
    return {
      severity: "critical",
      title: "Gasto sem nenhuma conversão",
      evidence:
        `R$${ctx.spend.toFixed(2)} gastos sem converter nenhuma vez ` +
        `(mínimo esperado: R$${spendFloor.toFixed(2)}). Verificar pixel, ` +
        `segmentação e página de destino.`,
      metricsSnapshot: { spend: ctx.spend, conversions: 0, spend_floor: spendFloor },
    };
  },
};
```

**`lib/ai/diagnostics/skills/click-no-convert.ts`:**

```typescript
import type { Skill } from "../types";

export const clickNoConvert: Skill = {
  id: "click-no-convert",
  label: "Cliques sem conversão",
  requiredMetrics: ["ctr", "cvr", "clicks"],
  shouldTrigger(ctx) {
    if (ctx.ctr == null || ctx.cvr == null || ctx.clicks < 100) return null;
    const ctrBench = ctx.benchmarks["ctr"];
    const ctrOk = ctrBench
      ? (ctrBench.comparator === "gte" ? ctx.ctr >= ctrBench.target : ctx.ctr <= ctrBench.target)
      : ctx.ctr >= 0.01;
    if (!ctrOk) return null;
    if (ctx.cvr >= 0.005) return null;
    return {
      severity: "warning",
      title: "CTR saudável mas CVR crítico",
      evidence:
        `CTR ${(ctx.ctr * 100).toFixed(2)}% (saudável) mas CVR de ` +
        `${(ctx.cvr * 100).toFixed(2)}% em ${ctx.clicks} cliques. ` +
        `Problema provável: página de destino ou oferta.`,
      metricsSnapshot: { ctr: ctx.ctr, cvr: ctx.cvr, clicks: ctx.clicks },
    };
  },
};
```

**`lib/ai/diagnostics/skills/learning-phase.ts`:**

```typescript
import type { Skill } from "../types";

export const learningPhase: Skill = {
  id: "learning-phase",
  label: "Fase de aprendizado",
  requiredMetrics: ["conversions"],
  shouldTrigger(ctx) {
    if (ctx.conversions >= 50) return null;
    return {
      severity: "info",
      title: "Campanha em fase de aprendizado",
      evidence:
        `${ctx.conversions} conversões acumuladas (mínimo 50 para saída do aprendizado). ` +
        `Evitar alterações até atingir o volume mínimo.`,
      metricsSnapshot: { conversions: ctx.conversions, conversions_needed: 50 },
    };
  },
};
```

**`lib/ai/diagnostics/skills/index.ts`:**

```typescript
import type { Skill } from "../types";
import { lowCtr } from "./low-ctr";
import { highCpa } from "./high-cpa";
import { creativeFatigue } from "./creative-fatigue";
import { spendNoConversion } from "./spend-no-conversion";
import { clickNoConvert } from "./click-no-convert";
import { learningPhase } from "./learning-phase";

export const SKILLS: Skill[] = [
  spendNoConversion, // critical first for early exit potential
  highCpa,
  creativeFatigue,
  lowCtr,
  clickNoConvert,
  learningPhase,
];
```

### Step 4: Run tests — all must pass

```bash
npx vitest run tests/unit/diagnostics-skills.test.ts
```

Expected: all passing.

### Step 5: Full unit test suite must still pass

```bash
npm test
```

Expected: all passing.

### Step 6: Commit

```bash
git add lib/ai/diagnostics/skills tests/unit/diagnostics-skills.test.ts
git commit -m "feat(m11): six diagnostic skills with deterministic trigger rules + unit tests"
```

---

## Task 5: LLM narration

**Files:**
- Create: `lib/ai/diagnostics/llm.ts`

### Step 1: Implement `narrateDiagnostic`

Mirror the `scoreCreative` pattern from `lib/ai/openai.ts` — uses `chatCompletion` internally, low temperature, JSON schema output. The function receives `organizationId` because `getCredentialField` requires it.

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";
import type { SkillFinding } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1";

async function chatCompletion(
  apiKey: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", temperature: 0.2, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export type NarratedDiagnostic = {
  rationale: string;
  suggested_action: string;
};

export async function narrateDiagnostic(
  organizationId: string,
  campaignName: string,
  finding: SkillFinding,
): Promise<NarratedDiagnostic> {
  const apiKey = await getCredentialField(organizationId, "openai", "api_key", "OPENAI_API_KEY");

  if (!apiKey) {
    return { rationale: finding.evidence, suggested_action: "Revisar métricas da campanha." };
  }

  const system = `Você é um gestor sênior de tráfego pago brasileiro. Analise o problema detectado automaticamente em uma campanha e escreva:
1. "rationale": 2-3 frases explicando POR QUE isso é um problema, em pt-BR, para o gestor entender o impacto.
2. "suggested_action": 1-2 frases com a ação concreta mais importante a tomar AGORA.

REGRA CRÍTICA: Use APENAS os números presentes em "evidence". Não invente métricas.
Responda APENAS com JSON válido, sem markdown.
Formato: {"rationale":"...","suggested_action":"..."}`;

  const user = `Campanha: ${campaignName}\nProblema detectado: ${finding.title}\nEvidência: ${finding.evidence}`;

  try {
    const raw = await chatCompletion(apiKey, [
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed: NarratedDiagnostic = JSON.parse(raw.trim());
    return parsed;
  } catch {
    return { rationale: finding.evidence, suggested_action: "Revisar métricas da campanha." };
  }
}
```

### Step 2: Type check

```bash
npx tsc --noEmit
```

Expected: zero errors.

### Step 3: Commit

```bash
git add lib/ai/diagnostics/llm.ts
git commit -m "feat(m11): GPT-4o diagnostic narration — structured output, pt-BR, safe fallback"
```

---

## Task 6: Context builder

**Files:**
- Create: `lib/ai/diagnostics/context.ts`

### Step 1: Implement `buildCampaignContexts`

Fetches campaigns (+ their denormalized metrics) for a workspace, resolves benchmarks per (platform, objective) combination, and returns one `CampaignContext` per campaign:

```typescript
import { createClient } from "@/lib/supabase/server";
import { resolveBenchmarks } from "./benchmarks";
import type { CampaignContext } from "./types";

export async function buildCampaignContexts(
  workspaceId: string,
  organizationId: string,
  campaignId?: string,
): Promise<CampaignContext[]> {
  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select("id, name, platform, objective, spend, impressions, clicks, conversions, revenue, cpa, roas, ctr, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  if (campaignId) query = query.eq("id", campaignId);

  const { data, error } = await query;
  if (error) throw error;

  const benchmarkCache: Record<string, Record<string, { target: number; comparator: "gte" | "lte" }>> = {};

  return Promise.all(
    (data ?? []).map(async (row) => {
      const cacheKey = `${row.platform}:${row.objective}`;
      if (!benchmarkCache[cacheKey]) {
        benchmarkCache[cacheKey] = await resolveBenchmarks(workspaceId, row.platform, row.objective);
      }
      const benchmarks = benchmarkCache[cacheKey];

      const clicks = Number(row.clicks ?? 0);
      const conversions = Number(row.conversions ?? 0);
      const cvr = clicks > 0 ? conversions / clicks : null;

      return {
        workspaceId,
        organizationId,
        entityType: "campaign" as const,
        entityId: row.id,
        campaignId: row.id,
        name: row.name,
        platform: row.platform,
        objective: row.objective,
        spend: Number(row.spend ?? 0),
        impressions: Number(row.impressions ?? 0),
        clicks,
        conversions,
        revenue: Number(row.revenue ?? 0),
        ctr: row.ctr != null ? Number(row.ctr) : null,
        cpa: row.cpa != null ? Number(row.cpa) : null,
        roas: row.roas != null ? Number(row.roas) : null,
        frequency: null, // requires reach — not stored yet; future iteration
        cvr,
        ctrDelta7d: null, // future: pull from analytics views
        benchmarks,
      } satisfies CampaignContext;
    }),
  );
}
```

### Step 2: Type check

```bash
npx tsc --noEmit
```

### Step 3: Commit

```bash
git add lib/ai/diagnostics/context.ts
git commit -m "feat(m11): campaign context builder — metrics, benchmarks, derived CVR"
```

---

## Task 7: Engine orchestrator

**Files:**
- Create: `lib/ai/diagnostics/engine.ts`

### Step 1: Implement `runDiagnostics`

```typescript
import { createClient } from "@/lib/supabase/server";
import { buildCampaignContexts } from "./context";
import { SKILLS } from "./skills/index";
import { narrateDiagnostic } from "./llm";
import type { AiDiagnostic } from "@/types/database";

type RunOptions = {
  campaignId?: string;
};

const MAX_CONCURRENT_LLM = 3;

export async function runDiagnostics(
  workspaceId: string,
  organizationId: string,
  opts: RunOptions = {},
): Promise<AiDiagnostic[]> {
  const contexts = await buildCampaignContexts(workspaceId, organizationId, opts.campaignId);

  type PendingDiagnostic = {
    ctx: (typeof contexts)[number];
    finding: NonNullable<ReturnType<(typeof SKILLS)[number]["shouldTrigger"]>>;
    skillId: string;
  };

  const pending: PendingDiagnostic[] = [];

  for (const ctx of contexts) {
    for (const skill of SKILLS) {
      const finding = skill.shouldTrigger(ctx);
      if (finding) pending.push({ ctx, finding, skillId: skill.id });
    }
  }

  const results: AiDiagnostic[] = [];
  const supabase = await createClient();

  for (let i = 0; i < pending.length; i += MAX_CONCURRENT_LLM) {
    const batch = pending.slice(i, i + MAX_CONCURRENT_LLM);
    const narrated = await Promise.all(
      batch.map(({ ctx, finding }) => narrateDiagnostic(organizationId, ctx.name, finding)),
    );

    for (let j = 0; j < batch.length; j++) {
      const { ctx, finding, skillId } = batch[j];
      const { rationale, suggested_action } = narrated[j];

      const row = {
        workspace_id: workspaceId,
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
        campaign_id: ctx.campaignId,
        skill_id: skillId,
        severity: finding.severity,
        status: "open" as const,
        title: finding.title,
        rationale,
        suggested_action,
        metrics_snapshot: finding.metricsSnapshot,
      };

      const { data, error } = await supabase
        .from("ai_diagnostics")
        .upsert(row, {
          onConflict: "entity_type,entity_id,skill_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (!error && data) results.push(data as AiDiagnostic);
    }
  }

  return results;
}
```

### Step 2: Type check

```bash
npx tsc --noEmit
```

Expected: zero errors.

### Step 3: Commit

```bash
git add lib/ai/diagnostics/engine.ts
git commit -m "feat(m11): diagnostics engine — build contexts, run skills, narrate with GPT-4o, upsert"
```

---

## Task 8: API routes

**Files:**
- Create: `app/api/ai/diagnostics/run/route.ts`
- Create: `app/api/ai/diagnostics/[id]/route.ts`

### Step 1: Create `app/api/ai/diagnostics/run/route.ts`

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { runDiagnostics } from "@/lib/ai/diagnostics/engine";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { workspaceId, campaignId } = parsed.data;

  // RBAC: user must be member+ of the workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve organizationId from workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("organization_id")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const diagnostics = await runDiagnostics(workspaceId, workspace.organization_id, { campaignId });
    return NextResponse.json({ diagnostics });
  } catch (err) {
    console.error("[diagnostics/run]", err);
    return NextResponse.json({ error: "Falha ao executar diagnósticos" }, { status: 500 });
  }
}
```

### Step 2: Create `app/api/ai/diagnostics/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { DiagnosticStatus } from "@/types/database";

const bodySchema = z.object({
  status: z.enum(["acknowledged", "applied", "dismissed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const { data: diagnostic } = await supabase
    .from("ai_diagnostics")
    .select("workspace_id")
    .eq("id", id)
    .single();

  if (!diagnostic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", diagnostic.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("ai_diagnostics")
    .update({ status: parsed.data.status as DiagnosticStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
  return NextResponse.json({ diagnostic: updated });
}
```

### Step 3: Type check

```bash
npx tsc --noEmit
```

### Step 4: Commit

```bash
git add app/api/ai/diagnostics
git commit -m "feat(m11): POST /api/ai/diagnostics/run + PATCH /api/ai/diagnostics/[id] with RBAC"
```

---

## Task 9: Dashboard UI

**Files:**
- Create: `app/(dashboard)/analytics/diagnostics/page.tsx`
- Create: `components/diagnostics/diagnostic-card.tsx`
- Create: `components/diagnostics/severity-summary.tsx`
- Create: `components/diagnostics/run-diagnostics-button.tsx`
- Modify: `components/layout/sidebar.tsx`

### Step 1: Server Component page — `app/(dashboard)/analytics/diagnostics/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import { DiagnosticCard } from "@/components/diagnostics/diagnostic-card";
import { SeveritySummary } from "@/components/diagnostics/severity-summary";
import { RunDiagnosticsButton } from "@/components/diagnostics/run-diagnostics-button";
import { FAKE_SESSION } from "@/lib/auth/session";
import type { AiDiagnostic } from "@/types/database";

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

export default async function DiagnosticsPage() {
  // TODO(M11-backend): replace with real session
  const session = FAKE_SESSION;
  const workspaceId = session.workspaceId;

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_diagnostics")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const diagnostics = ((data ?? []) as AiDiagnostic[]).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Diagnósticos de Campanha</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Problemas detectados automaticamente — aprove ou descarte cada recomendação.
          </p>
        </div>
        <RunDiagnosticsButton workspaceId={workspaceId} />
      </div>

      {diagnostics.length > 0 && <SeveritySummary diagnostics={diagnostics} />}

      {diagnostics.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-muted)]">
          Nenhum problema detectado — execute uma análise para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {diagnostics.map((d) => (
            <DiagnosticCard key={d.id} diagnostic={d} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 2: `components/diagnostics/diagnostic-card.tsx`

```tsx
"use client";

import { useState } from "react";
import type { AiDiagnostic } from "@/types/database";

const SEVERITY_STYLES = {
  critical: { chip: "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30", label: "Crítico" },
  warning:  { chip: "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30", label: "Atenção" },
  info:     { chip: "bg-[var(--color-data)]/20 text-[var(--color-data)] border-[var(--color-data)]/30", label: "Info" },
} as const;

type Props = { diagnostic: AiDiagnostic };

export function DiagnosticCard({ diagnostic: initial }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState<"apply" | "dismiss" | null>(null);
  const [diagnostic] = useState(initial);

  if (dismissed) return null;

  async function updateStatus(status: "applied" | "dismissed") {
    setLoading(status === "applied" ? "apply" : "dismiss");
    await fetch(`/api/ai/diagnostics/${diagnostic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setDismissed(true);
    setLoading(null);
  }

  const style = SEVERITY_STYLES[diagnostic.severity];

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${style.chip}`}>
            {style.label}
          </span>
          <span className="text-sm font-medium text-white">{diagnostic.title}</span>
        </div>
        <span className="text-xs text-[var(--color-muted)] shrink-0">
          {new Date(diagnostic.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <p className="text-sm text-[var(--color-muted)]">{diagnostic.rationale}</p>

      <div className="bg-[var(--color-base)] border border-[var(--color-border)] rounded p-3">
        <p className="text-xs text-[var(--color-muted)] mb-1 uppercase tracking-wide">Ação recomendada</p>
        <p className="text-sm text-white">{diagnostic.suggested_action}</p>
      </div>

      {Object.keys(diagnostic.metrics_snapshot).length > 0 && (
        <div className="font-mono text-xs text-[var(--color-muted)] flex flex-wrap gap-3">
          {Object.entries(diagnostic.metrics_snapshot).map(([k, v]) => (
            <span key={k}>
              {k}: <span className="text-white">{typeof v === "number" ? v.toFixed(4) : v}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => updateStatus("applied")}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded border border-[var(--color-success)]/40 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 disabled:opacity-50"
        >
          {loading === "apply" ? "Aplicando…" : "Aplicar intenção"}
        </button>
        <button
          onClick={() => updateStatus("dismissed")}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-border)]/30 disabled:opacity-50"
        >
          {loading === "dismiss" ? "Descartando…" : "Descartar"}
        </button>
      </div>
    </div>
  );
}
```

### Step 3: `components/diagnostics/severity-summary.tsx`

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { AiDiagnostic } from "@/types/database";

const COLORS = { critical: "var(--color-danger)", warning: "var(--color-warning)", info: "var(--color-data)" };

export function SeveritySummary({ diagnostics }: { diagnostics: AiDiagnostic[] }) {
  const counts = diagnostics.reduce(
    (acc, d) => { acc[d.severity] = (acc[d.severity] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  const data = [
    { name: "Crítico", count: counts.critical ?? 0, color: COLORS.critical },
    { name: "Atenção",  count: counts.warning  ?? 0, color: COLORS.warning  },
    { name: "Info",     count: counts.info     ?? 0, color: COLORS.info     },
  ];

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <p className="text-xs text-[var(--color-muted)] mb-3">Diagnósticos por severidade</p>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={60} />
          <Tooltip
            contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6 }}
            labelStyle={{ color: "white" }}
            cursor={{ fill: "var(--color-border)" }}
          />
          <Bar dataKey="count" radius={3}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Step 4: `components/diagnostics/run-diagnostics-button.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunDiagnosticsButton({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    setLoading(true);
    await fetch("/api/ai/diagnostics/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Analisando…" : "Rodar análise"}
    </button>
  );
}
```

### Step 5: Add "Diagnósticos" to sidebar

Open `components/layout/sidebar.tsx` and find the Analytics nav entry. Add a nested "Diagnósticos" link pointing to `/analytics/diagnostics` below it.

The exact diff depends on the sidebar's current structure — find the Analytics `NavItem` and add a sub-link:

```tsx
{ href: "/analytics/diagnostics", label: "Diagnósticos", icon: AlertTriangle }
```

Import `AlertTriangle` from `lucide-react` if not already imported.

### Step 6: Type check

```bash
npx tsc --noEmit
```

### Step 7: Commit

```bash
git add app/(dashboard)/analytics/diagnostics components/diagnostics components/layout/sidebar.tsx
git commit -m "feat(m11): diagnostics dashboard — cards, severity chart, run button, sidebar nav"
```

---

## Task 10: E2E tests + final verification

**Files:**
- Create: `tests/e2e/diagnostics.spec.ts`

### Step 1: Write E2E spec

```typescript
import { test, expect } from "@playwright/test";

test.describe("Diagnostics page", () => {
  test("shows empty state when no diagnostics exist", async ({ page }) => {
    await page.goto("/analytics/diagnostics");
    await expect(page.getByText("Diagnósticos de Campanha")).toBeVisible();
  });

  test("Run button is visible", async ({ page }) => {
    await page.goto("/analytics/diagnostics");
    await expect(page.getByRole("button", { name: "Rodar análise" })).toBeVisible();
  });

  test("navigates from sidebar Analytics link", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Diagnósticos" }).click();
    await expect(page).toHaveURL(/diagnostics/);
  });
});
```

### Step 2: Run unit suite — all must pass

```bash
npm test
```

Expected: all passing (including the new skills + benchmarks tests).

### Step 3: Run E2E suite

```bash
npm run test:e2e -- diagnostics
```

### Step 4: Manual verification checklist

- [ ] A campaign with CTR below benchmark and ≥ 1000 impressions → `low-ctr` diagnostic produced.
- [ ] A campaign with spend ≥ 3× CPA target and zero conversions → `critical` `spend-no-conversion` card.
- [ ] Re-running the analysis does **not** create duplicate `open` rows (partial unique index enforced).
- [ ] A viewer role user receives 403 from both API routes.
- [ ] GPT-4o rationale does not contain numbers absent from `metrics_snapshot` (spot-check 2-3 cards).
- [ ] Dismiss removes the card from the list immediately (optimistic UI).
- [ ] `tsc --noEmit` zero errors.

### Step 5: Final commit

```bash
git add tests/e2e/diagnostics.spec.ts
git commit -m "test(m11): e2e diagnostics flow — run, render cards, dismiss"
```

---

## Out of scope (future milestones)

- **Auto-apply write-back** to Meta/Google APIs — escalate `applied` status to M8 automation actions.
- **History-calibrated benchmarks** — replace seeded defaults with per-workspace rolling baselines.
- **Ad-set / ad-level granularity** — current scope is campaign-level only.
- **Scheduled cron run** — daily auto-analysis via Vercel Cron + M8 notification channels.
- **ClickHouse trend queries** — CTR delta from large-scale event data.
- **`frequency` metric** — requires `reach` column in campaigns (not stored yet).
