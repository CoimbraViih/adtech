# M-ADS Fase 4 — Loop de Otimização: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o loop de otimização do AdFlow conectando métricas de campanha das 4 plataformas com conversões do pixel próprio — populando `campaign_metrics_daily`, expondo divergências no AI Traffic Manager e exibindo uma página de reconciliação em Analytics.

**Architecture:** (1) Uma nova tabela `campaign_metrics_daily` captura um snapshot diário por campanha de cada plataforma mais `pixel_conversions` do pixel server-side. (2) O sync existente (`lib/campaigns/sync.ts`) popula essa tabela após cada sincronização via `lib/analytics/cross-platform.ts`. (3) O `buildCampaignContexts` lê `pixel_conversions` da tabela para enriquecer o `CampaignContext`. (4) Uma nova skill `tracking-divergence` dispara quando o pixel vê < 50% das conversões da plataforma. (5) Uma página `/analytics/reconciliation` exibe a tabela de divergência por campanha.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL + RLS), Vitest, Playwright, shadcn/ui

---

## Mapa de arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| **Create** | `supabase/migrations/022_campaign_metrics_daily.sql` | Tabela `campaign_metrics_daily` + RLS + índices |
| **Modify** | `types/database.ts` | Adicionar `CampaignMetricsDaily` type |
| **Create** | `lib/analytics/cross-platform.ts` | `normalizeCampaignMetrics`, `reconcileWithPixel`, `upsertDailyMetrics`, `getReconciliationRows` |
| **Create** | `tests/unit/cross-platform-metrics.test.ts` | Testes de `normalizeCampaignMetrics` e `reconcileWithPixel` |
| **Modify** | `lib/campaigns/sync.ts` | Chamar `upsertDailyMetrics` após sync de cada plataforma |
| **Create** | `tests/unit/sync-metrics-daily.test.ts` | Verificar que sync chama upsert por plataforma |
| **Modify** | `lib/ai/diagnostics/types.ts` | Adicionar `pixelConversions` e `divergencePct` em `CampaignContext` |
| **Modify** | `lib/ai/diagnostics/context.ts` | Ler `pixel_conversions` de `campaign_metrics_daily` e preencher os novos campos |
| **Create** | `lib/ai/diagnostics/skills/tracking-divergence.ts` | Skill que dispara quando pixel < 50% das conversões |
| **Modify** | `lib/ai/diagnostics/skills/index.ts` | Registrar `trackingDivergence` no `SKILLS[]` |
| **Create** | `tests/unit/diagnostics-tracking-divergence.test.ts` | Trigger + não-trigger da skill |
| **Create** | `app/api/analytics/reconciliation/route.ts` | GET autenticado: retorna `ReconciliationRow[]` |
| **Create** | `app/(dashboard)/analytics/reconciliation/page.tsx` | Server Component: tabela de divergência |
| **Modify** | `components/layout/nav-items.ts` | Adicionar link "Reconciliação" sob Analytics |
| **Create** | `tests/e2e/analytics-reconciliation.spec.ts` | Página renderiza, header visível, link na nav |

---

## Task 1: Migration + tipos + biblioteca cross-platform

**Files:**
- Create: `supabase/migrations/022_campaign_metrics_daily.sql`
- Modify: `types/database.ts`
- Create: `lib/analytics/cross-platform.ts`
- Create: `tests/unit/cross-platform-metrics.test.ts`

---

- [ ] **Step 1.1: Escrever o teste unitário para as funções puras**

Criar `tests/unit/cross-platform-metrics.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  normalizeCampaignMetrics,
  reconcileWithPixel,
} from "@/lib/analytics/cross-platform";

describe("normalizeCampaignMetrics", () => {
  it("mapeia campanhas para rows normalizadas", () => {
    const rows = normalizeCampaignMetrics("ws-1", "meta", "2026-06-04", [
      { externalId: "c1", spend: 1000, impressions: 50000, clicks: 500, conversions: 10, revenue: 5000 },
      { externalId: "c2", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].campaignExternalId).toBe("c1");
    expect(rows[0].spend).toBe(1000);
    expect(rows[0].pixelConversions).toBe(0);
    expect(rows[1].roas).toBeNull();
  });

  it("calcula roas quando spend > 0 e revenue > 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "meta", "2026-06-04", [
      { externalId: "x", spend: 100, impressions: 0, clicks: 0, conversions: 2, revenue: 400 },
    ]);
    expect(r.roas).toBeCloseTo(4);
  });

  it("define roas como null quando spend é 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "meta", "2026-06-04", [
      { externalId: "x", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    ]);
    expect(r.roas).toBeNull();
  });

  it("define roas como null quando revenue é 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "google", "2026-06-04", [
      { externalId: "x", spend: 100, impressions: 0, clicks: 0, conversions: 5, revenue: 0 },
    ]);
    expect(r.roas).toBeNull();
  });

  it("calcula cpa quando conversions > 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "google", "2026-06-04", [
      { externalId: "x", spend: 500, impressions: 0, clicks: 0, conversions: 5, revenue: 0 },
    ]);
    expect(r.cpa).toBeCloseTo(100);
  });

  it("define cpa como null quando conversions é 0", () => {
    const [r] = normalizeCampaignMetrics("ws", "tiktok", "2026-06-04", [
      { externalId: "x", spend: 100, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    ]);
    expect(r.cpa).toBeNull();
  });

  it("preserva workspaceId, platform e date em todos os rows", () => {
    const rows = normalizeCampaignMetrics("ws-99", "linkedin", "2026-01-15", [
      { externalId: "x", spend: 50, impressions: 0, clicks: 0, conversions: 1, revenue: 200 },
    ]);
    expect(rows[0].workspaceId).toBe("ws-99");
    expect(rows[0].platform).toBe("linkedin");
    expect(rows[0].date).toBe("2026-01-15");
  });
});

describe("reconcileWithPixel", () => {
  it("calcula divergencePct corretamente", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "meta", spend: 500, platformConversions: 10, pixelConversions: 3 },
    ]);
    expect(r.divergencePct).toBeCloseTo(0.7); // (10 - 3) / 10
  });

  it("retorna divergencePct null quando platformConversions é 0", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "meta", spend: 0, platformConversions: 0, pixelConversions: 0 },
    ]);
    expect(r.divergencePct).toBeNull();
  });

  it("retorna divergencePct 0 quando pixel bate plataforma", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "c1", platform: "google", spend: 100, platformConversions: 5, pixelConversions: 5 },
    ]);
    expect(r.divergencePct).toBeCloseTo(0);
  });

  it("passa adiante todos os campos de entrada", () => {
    const [r] = reconcileWithPixel([
      { campaignExternalId: "abc", platform: "linkedin", spend: 200, platformConversions: 8, pixelConversions: 4 },
    ]);
    expect(r.campaignExternalId).toBe("abc");
    expect(r.platformConversions).toBe(8);
    expect(r.pixelConversions).toBe(4);
  });

  it("processa múltiplas rows independentemente", () => {
    const rows = reconcileWithPixel([
      { campaignExternalId: "a", platform: "meta", spend: 100, platformConversions: 10, pixelConversions: 2 },
      { campaignExternalId: "b", platform: "google", spend: 200, platformConversions: 0, pixelConversions: 0 },
    ]);
    expect(rows[0].divergencePct).toBeCloseTo(0.8);
    expect(rows[1].divergencePct).toBeNull();
  });
});
```

- [ ] **Step 1.2: Rodar teste para confirmar que falha**

```
npx vitest run tests/unit/cross-platform-metrics.test.ts
```

Resultado esperado: FAIL — `Cannot find module '@/lib/analytics/cross-platform'`

- [ ] **Step 1.3: Criar a migration `022_campaign_metrics_daily.sql`**

Criar `supabase/migrations/022_campaign_metrics_daily.sql`:

```sql
-- supabase/migrations/022_campaign_metrics_daily.sql
-- M-ADS Fase 4: daily metrics snapshot per campaign per platform.
--
-- One row per (workspace_id, campaign_external_id, platform, date).
-- Populated by lib/campaigns/sync.ts after each platform sync run.
-- pixel_conversions is updated by the pixel fanout adapter (initially 0,
-- incremented when a purchase/lead pixel event arrives for the campaign).
--
-- Using campaign_external_id (the platform's own campaign ID) rather than a
-- campaigns.id FK because campaign upserts are still stubbed TODO(M-ADS-backend)
-- and rows may arrive before the campaigns table row exists.

CREATE TABLE IF NOT EXISTS campaign_metrics_daily (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Platform-assigned campaign identifier (matches campaigns.external_id).
  campaign_external_id  TEXT          NOT NULL,
  platform              TEXT          NOT NULL,
  -- Date of the metrics snapshot (UTC day boundary).
  date                  DATE          NOT NULL,
  -- Aggregated platform-reported metrics for the day.
  spend                 NUMERIC(14,2) NOT NULL DEFAULT 0,
  impressions           BIGINT        NOT NULL DEFAULT 0,
  clicks                BIGINT        NOT NULL DEFAULT 0,
  conversions           INTEGER       NOT NULL DEFAULT 0,
  revenue               NUMERIC(14,2) NOT NULL DEFAULT 0,
  roas                  NUMERIC(8,4),
  cpa                   NUMERIC(10,2),
  -- Conversions captured by the AdFlow server-side pixel for this campaign.
  pixel_conversions     INTEGER       NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique constraint: exactly one row per campaign per platform per day.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cmd_campaign_platform_date
  ON campaign_metrics_daily (workspace_id, campaign_external_id, platform, date);

-- Fast workspace-scoped range queries (e.g. last 30 days for reconciliation).
CREATE INDEX IF NOT EXISTS idx_cmd_workspace_date
  ON campaign_metrics_daily (workspace_id, date DESC);

-- updated_at auto-maintenance trigger (same pattern as other tables).
CREATE OR REPLACE TRIGGER set_campaign_metrics_daily_updated_at
  BEFORE UPDATE ON campaign_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE campaign_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Workspace members can read metrics for workspaces they belong to.
DROP POLICY IF EXISTS "cmd: workspace members can read" ON campaign_metrics_daily;
CREATE POLICY "cmd: workspace members can read"
  ON campaign_metrics_daily FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- The sync worker and pixel adapter run under the service role which bypasses
-- RLS entirely — no explicit INSERT/UPDATE policy is needed.
DROP POLICY IF EXISTS "cmd: service role can write" ON campaign_metrics_daily;
CREATE POLICY "cmd: service role can write"
  ON campaign_metrics_daily FOR ALL
  WITH CHECK (auth.role() = 'service_role');

-- Owners and admins can delete stale history.
DROP POLICY IF EXISTS "cmd: owners and admins can delete" ON campaign_metrics_daily;
CREATE POLICY "cmd: owners and admins can delete"
  ON campaign_metrics_daily FOR DELETE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN organization_members om
        ON om.organization_id = w.organization_id
       AND om.user_id = auth.uid()
       AND om.role IN ('owner', 'admin')
    )
  );
```

- [ ] **Step 1.4: Adicionar `CampaignMetricsDaily` em `types/database.ts`**

Localizar o bloco de `SyncRun` em `types/database.ts` (por volta da linha 616) e adicionar após o bloco:

```typescript
// ── Campaign Metrics Daily (M-ADS Fase 4) ─────────────────────────────────────

export type CampaignMetricsDaily = {
  id: string;
  workspace_id: string;
  campaign_external_id: string;
  platform: CampaignPlatform;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
  pixel_conversions: number;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 1.5: Criar `lib/analytics/cross-platform.ts`**

```typescript
import { createServiceClient } from "@/lib/supabase/service";

// ── Input/output types ────────────────────────────────────────────────────────

export type NormalizedCampaignMetrics = {
  workspaceId: string;
  campaignExternalId: string;
  platform: string;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
  pixelConversions: number; // always 0 at sync time; updated by pixel fanout
};

export type ReconciliationRow = {
  campaignExternalId: string;
  platform: string;
  spend: number;
  platformConversions: number;
  pixelConversions: number;
  /** (platformConversions - pixelConversions) / platformConversions. null when platformConversions === 0. */
  divergencePct: number | null;
};

// ── Pure functions (no I/O — easy to unit-test) ───────────────────────────────

export function normalizeCampaignMetrics(
  workspaceId: string,
  platform: string,
  date: string,
  campaigns: Array<{
    externalId: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>
): NormalizedCampaignMetrics[] {
  return campaigns.map((c) => ({
    workspaceId,
    campaignExternalId: c.externalId,
    platform,
    date,
    spend: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    revenue: c.revenue,
    roas: c.spend > 0 && c.revenue > 0 ? c.revenue / c.spend : null,
    cpa: c.conversions > 0 ? c.spend / c.conversions : null,
    pixelConversions: 0,
  }));
}

export function reconcileWithPixel(
  rows: Array<{
    campaignExternalId: string;
    platform: string;
    spend: number;
    platformConversions: number;
    pixelConversions: number;
  }>
): ReconciliationRow[] {
  return rows.map((r) => ({
    ...r,
    divergencePct:
      r.platformConversions > 0
        ? (r.platformConversions - r.pixelConversions) / r.platformConversions
        : null,
  }));
}

// ── I/O helpers ───────────────────────────────────────────────────────────────

export async function upsertDailyMetrics(rows: NormalizedCampaignMetrics[]): Promise<void> {
  if (rows.length === 0) return;
  const db = createServiceClient();
  const records = rows.map((r) => ({
    workspace_id: r.workspaceId,
    campaign_external_id: r.campaignExternalId,
    platform: r.platform,
    date: r.date,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    revenue: r.revenue,
    roas: r.roas,
    cpa: r.cpa,
    pixel_conversions: r.pixelConversions,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db
    .from("campaign_metrics_daily")
    .upsert(records, { onConflict: "workspace_id,campaign_external_id,platform,date" });
  if (error) throw new Error(`[cross-platform] upsertDailyMetrics: ${error.message}`);
}

export async function getReconciliationRows(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<ReconciliationRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("campaign_metrics_daily")
    .select("campaign_external_id, platform, spend, conversions, pixel_conversions")
    .eq("workspace_id", workspaceId)
    .gte("date", dateFrom)
    .lte("date", dateTo);
  if (error) throw new Error(`[cross-platform] getReconciliationRows: ${error.message}`);
  const rows = (data ?? []) as Array<{
    campaign_external_id: string;
    platform: string;
    spend: number;
    conversions: number;
    pixel_conversions: number;
  }>;
  return reconcileWithPixel(
    rows.map((r) => ({
      campaignExternalId: r.campaign_external_id,
      platform: r.platform,
      spend: Number(r.spend),
      platformConversions: Number(r.conversions),
      pixelConversions: Number(r.pixel_conversions),
    }))
  );
}
```

- [ ] **Step 1.6: Rodar o teste — deve passar agora**

```
npx vitest run tests/unit/cross-platform-metrics.test.ts
```

Resultado esperado: PASS — 11 testes

- [ ] **Step 1.7: Rodar toda a suite para confirmar zero regressão**

```
npx vitest run
```

Resultado esperado: todos os testes anteriores passando + 11 novos

- [ ] **Step 1.8: Verificar TypeScript**

```
npx tsc --noEmit
```

Resultado esperado: zero erros

- [ ] **Step 1.9: Commit**

```bash
git add supabase/migrations/022_campaign_metrics_daily.sql \
        types/database.ts \
        lib/analytics/cross-platform.ts \
        tests/unit/cross-platform-metrics.test.ts
git commit -m "feat(m-ads-f4): campaign_metrics_daily migration, CampaignMetricsDaily type, cross-platform lib"
```

---

## Task 2: Populando `campaign_metrics_daily` no sync

**Files:**
- Modify: `lib/campaigns/sync.ts`
- Create: `tests/unit/sync-metrics-daily.test.ts`

---

- [ ] **Step 2.1: Escrever o teste primeiro**

Criar `tests/unit/sync-metrics-daily.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all platform clients — we only care about the metrics upsert call.
vi.mock("@/lib/meta/client", () => ({
  listMetaCampaigns: vi.fn().mockResolvedValue([
    { id: "meta-1", name: "Meta Campaign", status: "ACTIVE", daily_budget: "10000" },
  ]),
  getMetaAccountInsights: vi.fn().mockResolvedValue({
    "meta-1": {
      spend: "500.00",
      impressions: "20000",
      clicks: "400",
      actions: [{ action_type: "purchase", value: "10" }],
      purchase_roas: [{ value: "2.5" }],
    },
  }),
  listMetaAdSets: vi.fn().mockResolvedValue([]),
  listMetaAds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/google/client", () => ({
  listGoogleCampaigns: vi.fn().mockResolvedValue([]),
  getGoogleAccountMetrics: vi.fn().mockResolvedValue({}),
  listGoogleAdGroups: vi.fn().mockResolvedValue([]),
  listGoogleAds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/tiktok/client", () => ({
  listTikTokCampaigns: vi.fn().mockResolvedValue([]),
  getTikTokBatchInsights: vi.fn().mockResolvedValue({}),
  listTikTokAdGroups: vi.fn().mockResolvedValue([]),
  listTikTokAds: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/linkedin/client", () => ({
  listLinkedInCampaigns: vi.fn().mockResolvedValue([]),
  getLinkedInAccountInsights: vi.fn().mockResolvedValue({}),
  listLinkedInCreatives: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/integrations/credentials", () => ({
  getCredentialField: vi.fn().mockResolvedValue("tok"),
}));

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }), upsert: mockUpsert }),
  }),
}));

const mockUpsertDailyMetrics = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analytics/cross-platform", () => ({
  normalizeCampaignMetrics: vi.fn((workspaceId, platform, date, campaigns) =>
    campaigns.map((c: { externalId: string }) => ({ workspaceId, campaignExternalId: c.externalId, platform, date }))
  ),
  upsertDailyMetrics: mockUpsertDailyMetrics,
}));

import { syncCampaignsFromPlatform } from "@/lib/campaigns/sync";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsertDailyMetrics.mockResolvedValue(undefined);
});

describe("syncCampaignsFromPlatform — metrics daily upsert", () => {
  it("chama upsertDailyMetrics para Meta quando há campanhas", async () => {
    await syncCampaignsFromPlatform("ws-1", "org-1");
    expect(mockUpsertDailyMetrics).toHaveBeenCalledTimes(1);
    const [rows] = mockUpsertDailyMetrics.mock.calls[0];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].platform).toBe("meta");
  });

  it("não chama upsertDailyMetrics quando não há campanhas (Google mock vazio)", async () => {
    // Google mock retorna [] — não deve haver call para google
    await syncCampaignsFromPlatform("ws-1", "org-1");
    const calls = mockUpsertDailyMetrics.mock.calls;
    const googleCalls = calls.filter(([rows]) => rows[0]?.platform === "google");
    expect(googleCalls).toHaveLength(0);
  });

  it("falha silenciosa de upsertDailyMetrics não interrompe o sync", async () => {
    mockUpsertDailyMetrics.mockRejectedValueOnce(new Error("DB down"));
    const results = await syncCampaignsFromPlatform("ws-1", "org-1");
    const metaResult = results.find((r) => r.platform === "meta");
    // sync de campanhas ainda deve reportar sucesso
    expect(metaResult?.error).toBeNull();
  });
});
```

- [ ] **Step 2.2: Rodar teste para confirmar que falha**

```
npx vitest run tests/unit/sync-metrics-daily.test.ts
```

Resultado esperado: FAIL — `upsertDailyMetrics` nunca chamada

- [ ] **Step 2.3: Modificar `lib/campaigns/sync.ts`**

**Adicionar import no topo** (após os imports existentes dos clients):

```typescript
import { normalizeCampaignMetrics, upsertDailyMetrics } from "@/lib/analytics/cross-platform";
```

**Adicionar helper** após a função `recordSyncRun`:

```typescript
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
```

**No bloco Meta**, logo após o `for (const mc of metaCampaigns)` loop principal (antes do bloco de ad sets) e antes do `results.push`, adicionar:

```typescript
      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      try {
        const metricsInput = metaCampaigns.map((mc) => {
          const ins = insightsByid[mc.id];
          const spend = ins ? parseFloat(ins.spend) : 0;
          const impressions = ins ? parseInt(ins.impressions, 10) : 0;
          const clicks = ins ? parseInt(ins.clicks, 10) : 0;
          const purchases = ins?.actions?.find((a: { action_type: string }) => a.action_type === "purchase");
          const conversions = purchases ? parseInt(purchases.value, 10) : 0;
          const roasEntry = ins?.purchase_roas?.[0];
          const revenue = roasEntry ? parseFloat(roasEntry.value) * spend : 0;
          return { externalId: mc.id, spend, impressions, clicks, conversions, revenue };
        });
        await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "meta", todayIso(), metricsInput));
      } catch (metricsErr) {
        console.warn("[sync/meta] upsertDailyMetrics failed (non-fatal):", metricsErr);
      }
```

**No bloco Google**, logo antes do `results.push({ platform: "google", ... })`, adicionar:

```typescript
      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      try {
        const metricsInput = googleCampaigns.map((gc) => {
          const row = metricsByid[gc.id];
          const m = row?.metrics;
          const spend = m ? parseInt(m.costMicros, 10) / 1_000_000 : 0;
          const impressions = m ? parseInt(m.impressions, 10) : 0;
          const clicks = m ? parseInt(m.clicks, 10) : 0;
          const conversions = m ? parseInt(m.conversions, 10) : 0;
          const revenue = m ? parseFloat(m.conversionsValue) : 0;
          return { externalId: gc.id, spend, impressions, clicks, conversions, revenue };
        });
        await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "google", todayIso(), metricsInput));
      } catch (metricsErr) {
        console.warn("[sync/google] upsertDailyMetrics failed (non-fatal):", metricsErr);
      }
```

**No bloco TikTok**, logo antes do `const runStatus = partialError ? ...` para TikTok, adicionar:

```typescript
      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      try {
        const metricsInput = tiktokCampaigns.map((tc) => {
          const ins = insightsByid[tc.id] ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
          return { externalId: tc.id, spend: ins.spend, impressions: ins.impressions, clicks: ins.clicks, conversions: ins.conversions, revenue: 0 };
        });
        await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "tiktok", todayIso(), metricsInput));
      } catch (metricsErr) {
        console.warn("[sync/tiktok] upsertDailyMetrics failed (non-fatal):", metricsErr);
      }
```

**No bloco LinkedIn**, logo antes do `const runStatus = partialError ? ...` para LinkedIn, adicionar:

```typescript
      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      try {
        const metricsInput = linkedinCampaigns.map((lc) => {
          const ins = insightsByid[lc.id] ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
          return { externalId: lc.id, spend: ins.spend, impressions: ins.impressions, clicks: ins.clicks, conversions: ins.conversions, revenue: 0 };
        });
        await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "linkedin", todayIso(), metricsInput));
      } catch (metricsErr) {
        console.warn("[sync/linkedin] upsertDailyMetrics failed (non-fatal):", metricsErr);
      }
```

- [ ] **Step 2.4: Rodar o teste — deve passar**

```
npx vitest run tests/unit/sync-metrics-daily.test.ts
```

Resultado esperado: PASS — 3 testes

- [ ] **Step 2.5: Rodar toda a suite**

```
npx vitest run
```

Resultado esperado: todos os testes anteriores passando + 3 novos

- [ ] **Step 2.6: Verificar TypeScript**

```
npx tsc --noEmit
```

Resultado esperado: zero erros

- [ ] **Step 2.7: Commit**

```bash
git add lib/campaigns/sync.ts \
        tests/unit/sync-metrics-daily.test.ts
git commit -m "feat(m-ads-f4): wire upsertDailyMetrics into sync for all 4 platforms"
```

---

## Task 3: Skill `tracking-divergence` + extensão do CampaignContext

**Files:**
- Modify: `lib/ai/diagnostics/types.ts`
- Modify: `lib/ai/diagnostics/context.ts`
- Create: `lib/ai/diagnostics/skills/tracking-divergence.ts`
- Modify: `lib/ai/diagnostics/skills/index.ts`
- Create: `tests/unit/diagnostics-tracking-divergence.test.ts`

---

- [ ] **Step 3.1: Escrever o teste da skill**

Criar `tests/unit/diagnostics-tracking-divergence.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { trackingDivergence } from "@/lib/ai/diagnostics/skills/tracking-divergence";
import type { CampaignContext } from "@/lib/ai/diagnostics/types";

function makeCtx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    workspaceId: "ws-1",
    organizationId: "org-1",
    entityType: "campaign",
    entityId: "camp-1",
    campaignId: "camp-1",
    name: "Test Campaign",
    platform: "meta",
    objective: "sales",
    spend: 500,
    impressions: 20000,
    clicks: 200,
    conversions: 10,
    revenue: 2000,
    ctr: 0.01,
    cpa: 50,
    roas: 4,
    frequency: null,
    cvr: 0.05,
    ctrDelta7d: null,
    benchmarks: {},
    pixelConversions: 3,   // < 50% of 10 → trigger
    divergencePct: 0.7,
    ...overrides,
  };
}

describe("trackingDivergence skill", () => {
  it("dispara quando pixel_conversions < 50% das conversões da plataforma", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx());
    expect(finding).not.toBeNull();
    expect(finding?.severity).toBe("warning");
  });

  it("não dispara quando pixelConversions é null", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ pixelConversions: null }))).toBeNull();
  });

  it("não dispara quando conversões da plataforma é 0", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ conversions: 0 }))).toBeNull();
  });

  it("não dispara quando spend está abaixo do threshold (R$100)", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ spend: 50 }))).toBeNull();
  });

  it("não dispara quando cobertura do pixel >= 50% (5 de 10)", () => {
    expect(trackingDivergence.shouldTrigger(makeCtx({ pixelConversions: 5 }))).toBeNull();
  });

  it("não dispara quando cobertura do pixel é exatamente 50%", () => {
    // boundary: coverage = 5/10 = 0.5 — threshold is strict <
    expect(trackingDivergence.shouldTrigger(makeCtx({ pixelConversions: 5, conversions: 10 }))).toBeNull();
  });

  it("dispara quando spend está exatamente no threshold (R$100)", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx({ spend: 100, conversions: 10, pixelConversions: 3 }));
    expect(finding).not.toBeNull();
  });

  it("inclui metrics_snapshot com campos obrigatórios", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx());
    expect(finding?.metricsSnapshot).toMatchObject({
      platform_conversions: 10,
      pixel_conversions: 3,
    });
    expect(typeof finding?.metricsSnapshot.coverage_pct).toBe("number");
  });

  it("evidence menciona a cobertura em porcentagem", () => {
    const finding = trackingDivergence.shouldTrigger(makeCtx({ conversions: 10, pixelConversions: 2 }));
    expect(finding?.evidence).toContain("20%"); // 2/10 = 20%
  });
});
```

- [ ] **Step 3.2: Rodar teste para confirmar que falha**

```
npx vitest run tests/unit/diagnostics-tracking-divergence.test.ts
```

Resultado esperado: FAIL — `Cannot find module .../tracking-divergence`

- [ ] **Step 3.3: Estender `CampaignContext` em `lib/ai/diagnostics/types.ts`**

Localizar o tipo `CampaignContext` e adicionar os dois campos ao final da definição (antes do `}`):

```typescript
  /** Conversions captured by the AdFlow server-side pixel for this campaign.
   *  Summed over the last 30 days from campaign_metrics_daily.
   *  null when no metrics daily rows exist for the campaign yet. */
  pixelConversions: number | null;
  /** (platformConversions - pixelConversions) / platformConversions.
   *  null when platformConversions === 0 or pixelConversions is null. */
  divergencePct: number | null;
```

O tipo completo ficará:

```typescript
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
  pixelConversions: number | null;
  divergencePct: number | null;
};
```

- [ ] **Step 3.4: Atualizar `lib/ai/diagnostics/context.ts` para preencher os novos campos**

Substituir o arquivo inteiro com a versão atualizada que lê `campaign_metrics_daily`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveBenchmarks } from "./benchmarks";
import type { CampaignContext } from "./types";
import type { Campaign } from "@/types/database";

export async function buildCampaignContexts(
  workspaceId: string,
  organizationId: string,
  campaignId?: string,
): Promise<CampaignContext[]> {
  const supabase = await createServerSupabaseClient();

  // ── Fetch campaigns ──────────────────────────────────────────────────────────
  let query = supabase
    .from("campaigns")
    .select(
      "id, name, platform, objective, spend, impressions, clicks, conversions, revenue, cpa, roas, ctr, status, external_id",
    )
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  if (campaignId) {
    query = query.eq("id", campaignId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const campaigns = ((data as unknown[]) ?? []) as (Campaign & { external_id: string | null })[];

  // ── Fetch pixel conversions from campaign_metrics_daily (last 30 days) ───────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const { data: metricsData } = await supabase
    .from("campaign_metrics_daily")
    .select("campaign_external_id, platform, pixel_conversions, conversions")
    .eq("workspace_id", workspaceId)
    .gte("date", thirtyDaysAgo);

  // Aggregate pixel_conversions and platform conversions per (external_id, platform).
  type AggMetrics = { pixelConversions: number; platformConversions: number };
  const pixelByKey = new Map<string, AggMetrics>();
  for (const row of (metricsData ?? []) as Array<{
    campaign_external_id: string;
    platform: string;
    pixel_conversions: number;
    conversions: number;
  }>) {
    const key = `${row.campaign_external_id}:${row.platform}`;
    const cur = pixelByKey.get(key) ?? { pixelConversions: 0, platformConversions: 0 };
    pixelByKey.set(key, {
      pixelConversions: cur.pixelConversions + Number(row.pixel_conversions),
      platformConversions: cur.platformConversions + Number(row.conversions),
    });
  }

  // ── Pre-resolve benchmarks ───────────────────────────────────────────────────
  const uniqueKeys = [...new Set(campaigns.map((r) => `${r.platform}:${r.objective}`))];
  const benchmarkCache: Record<string, Record<string, { target: number; comparator: "gte" | "lte" }>> = {};
  for (const key of uniqueKeys) {
    const [platform, objective] = key.split(":");
    benchmarkCache[key] = await resolveBenchmarks(workspaceId, platform, objective);
  }

  // ── Build contexts ───────────────────────────────────────────────────────────
  return campaigns.map((row) => {
    const cacheKey = `${row.platform}:${row.objective}`;
    const benchmarks = benchmarkCache[cacheKey] ?? {};
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversions ?? 0);
    const cvr = clicks > 0 ? conversions / clicks : null;

    // Look up pixel metrics by external_id + platform.
    const metricKey = row.external_id ? `${row.external_id}:${row.platform}` : null;
    const pixelMetrics = metricKey ? pixelByKey.get(metricKey) : undefined;
    const pixelConversions = pixelMetrics?.pixelConversions ?? null;
    const divergencePct =
      pixelMetrics && pixelMetrics.platformConversions > 0
        ? (pixelMetrics.platformConversions - pixelMetrics.pixelConversions) /
          pixelMetrics.platformConversions
        : null;

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
      frequency: null,
      cvr,
      ctrDelta7d: null,
      benchmarks,
      pixelConversions,
      divergencePct,
    } satisfies CampaignContext;
  });
}
```

- [ ] **Step 3.5: Criar `lib/ai/diagnostics/skills/tracking-divergence.ts`**

```typescript
import type { Skill } from "../types";

const SPEND_THRESHOLD = 100; // R$100 minimum spend to avoid noise on tiny campaigns
const COVERAGE_THRESHOLD = 0.5; // pixel must capture at least 50% of platform conversions

export const trackingDivergence: Skill = {
  id: "tracking-divergence",
  label: "Divergência de rastreamento",
  requiredMetrics: ["conversions", "pixelConversions", "spend"],
  shouldTrigger(ctx) {
    if (ctx.pixelConversions == null) return null;
    if (ctx.conversions === 0) return null;
    if (ctx.spend < SPEND_THRESHOLD) return null;
    const coverage = ctx.pixelConversions / ctx.conversions;
    if (coverage >= COVERAGE_THRESHOLD) return null;
    return {
      severity: "warning",
      title: "Divergência de rastreamento detectada",
      evidence:
        `Pixel server-side registrou ${ctx.pixelConversions} conversões vs ` +
        `${ctx.conversions} reportadas pela plataforma ` +
        `(${(coverage * 100).toFixed(0)}% de cobertura). ` +
        `Verifique a instalação do pixel e o mapeamento de eventos de conversão.`,
      metricsSnapshot: {
        platform_conversions: ctx.conversions,
        pixel_conversions: ctx.pixelConversions,
        coverage_pct: coverage,
        spend: ctx.spend,
      },
    };
  },
};
```

- [ ] **Step 3.6: Registrar a skill em `lib/ai/diagnostics/skills/index.ts`**

```typescript
import type { Skill } from "../types";
import { lowCtr } from "./low-ctr";
import { highCpa } from "./high-cpa";
import { creativeFatigue } from "./creative-fatigue";
import { spendNoConversion } from "./spend-no-conversion";
import { clickNoConvert } from "./click-no-convert";
import { learningPhase } from "./learning-phase";
import { trackingDivergence } from "./tracking-divergence";

export const SKILLS: Skill[] = [
  spendNoConversion,
  highCpa,
  creativeFatigue,
  lowCtr,
  clickNoConvert,
  learningPhase,
  trackingDivergence,
];
```

- [ ] **Step 3.7: Rodar o teste da skill**

```
npx vitest run tests/unit/diagnostics-tracking-divergence.test.ts
```

Resultado esperado: PASS — 9 testes

- [ ] **Step 3.8: Verificar que os testes de skills existentes ainda passam**

```
npx vitest run tests/unit/diagnostics-skills.test.ts tests/unit/diagnostics-benchmarks.test.ts
```

Resultado esperado: PASS

- [ ] **Step 3.9: Rodar toda a suite**

```
npx vitest run
```

Resultado esperado: todos anteriores + 9 novos + 3 (Task 2) + 11 (Task 1)

- [ ] **Step 3.10: Verificar TypeScript**

```
npx tsc --noEmit
```

Resultado esperado: zero erros

- [ ] **Step 3.11: Commit**

```bash
git add lib/ai/diagnostics/types.ts \
        lib/ai/diagnostics/context.ts \
        lib/ai/diagnostics/skills/tracking-divergence.ts \
        lib/ai/diagnostics/skills/index.ts \
        tests/unit/diagnostics-tracking-divergence.test.ts
git commit -m "feat(m-ads-f4): tracking-divergence skill + pixel_conversions in CampaignContext"
```

---

## Task 4: API de reconciliação + página de dashboard + link na sidebar

**Files:**
- Create: `app/api/analytics/reconciliation/route.ts`
- Create: `app/(dashboard)/analytics/reconciliation/page.tsx`
- Modify: `components/layout/nav-items.ts`
- Create: `tests/e2e/analytics-reconciliation.spec.ts`

---

- [ ] **Step 4.1: Escrever o teste E2E**

Criar `tests/e2e/analytics-reconciliation.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Analytics Reconciliation page", () => {
  test("renderiza o heading da página de reconciliação", async ({ page }) => {
    await page.goto("/analytics/reconciliation");
    await expect(
      page.getByRole("heading", { name: "Reconciliação de Conversões" })
    ).toBeVisible();
  });

  test("mostra tabela ou estado vazio (nunca erro 500)", async ({ page }) => {
    const response = await page.goto("/analytics/reconciliation");
    expect(response?.status()).toBeLessThan(500);
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText("Nenhum dado disponível")
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test("link Reconciliação está visível na sidebar quando em /analytics", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("link", { name: /Reconcilia/i })).toBeVisible();
  });
});
```

- [ ] **Step 4.2: Criar o route handler `app/api/analytics/reconciliation/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getReconciliationRows } from "@/lib/analytics/cross-platform";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateTo =
    searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const dateFrom =
    searchParams.get("from") ??
    new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  try {
    const rows = await getReconciliationRows(session.workspace.id, dateFrom, dateTo);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/analytics/reconciliation]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4.3: Criar a página `app/(dashboard)/analytics/reconciliation/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { getReconciliationRows } from "@/lib/analytics/cross-platform";
import type { ReconciliationRow } from "@/lib/analytics/cross-platform";

export default async function ReconciliationPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const dateTo = new Date().toISOString().slice(0, 10);
  const dateFrom = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  let rows: ReconciliationRow[] = [];
  try {
    rows = await getReconciliationRows(session.workspace.id, dateFrom, dateTo);
  } catch {
    // graceful degradation — show empty state, never 500
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
          Reconciliação de Conversões
        </h1>
        <p className="text-sm text-[color:var(--adflow-muted)] mt-1">
          Conversões reportadas pelas plataformas vs capturadas pelo pixel AdFlow
          — últimos 30 dias.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-[color:var(--adflow-border)] p-8 text-center">
          <p className="text-sm text-[color:var(--adflow-muted)]">
            Nenhum dado disponível. Sincronize campanhas para começar a coletar
            métricas diárias.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--adflow-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--adflow-surface)] border-b border-[color:var(--adflow-border)]">
              <tr>
                <th className="text-left px-4 py-2.5 text-[color:var(--adflow-muted)] font-medium">
                  Campanha
                </th>
                <th className="text-left px-4 py-2.5 text-[color:var(--adflow-muted)] font-medium">
                  Plataforma
                </th>
                <th className="text-right px-4 py-2.5 text-[color:var(--adflow-muted)] font-medium">
                  Gasto
                </th>
                <th className="text-right px-4 py-2.5 text-[color:var(--adflow-muted)] font-medium">
                  Conv. Plataforma
                </th>
                <th className="text-right px-4 py-2.5 text-[color:var(--adflow-muted)] font-medium">
                  Conv. Pixel
                </th>
                <th className="text-right px-4 py-2.5 text-[color:var(--adflow-muted)] font-medium">
                  Divergência
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pct = row.divergencePct;
                const pctLabel =
                  pct == null ? "—" : `${(pct * 100).toFixed(0)}%`;
                const pctColor =
                  pct == null
                    ? "text-[color:var(--adflow-muted)]"
                    : pct > 0.3
                    ? "text-[color:var(--color-danger)]"
                    : pct > 0.1
                    ? "text-[color:var(--color-warning)]"
                    : "text-[color:var(--color-success)]";
                return (
                  <tr
                    key={i}
                    className="border-b border-[color:var(--adflow-border)] last:border-0"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--adflow-muted)]">
                      {row.campaignExternalId}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{row.platform}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.spend.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.platformConversions}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.pixelConversions}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium tabular-nums ${pctColor}`}
                    >
                      {pctLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4.4: Adicionar o link "Reconciliação" em `components/layout/nav-items.ts`**

O arquivo usa `lucide-react`. O ícone adequado é `GitCompareArrows` (disponível desde lucide-react 0.358). Substituir o conteúdo do arquivo:

```typescript
import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  BarChart3,
  GitCompareArrows,
  Radio,
  FileText,
  Zap,
  Settings,
  Layers,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** When true, marks this item active for any route starting with `href` */
  matchPrefix?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",      href: "/dashboard",                      icon: LayoutDashboard },
  { label: "Campanhas",      href: "/campaigns",                      icon: Megaphone },
  { label: "Programático",   href: "/campaigns/programmatic",         icon: Layers },
  { label: "Audiências",     href: "/audiences",                      icon: Users },
  { label: "Criativos",      href: "/creatives",                      icon: Sparkles },
  { label: "Analytics",      href: "/analytics",                      icon: BarChart3 },
  { label: "Reconciliação",  href: "/analytics/reconciliation",       icon: GitCompareArrows },
  { label: "Pixel",          href: "/pixel",                          icon: Radio },
  { label: "Landing Pages",  href: "/landing-pages",                  icon: FileText },
  { label: "Automação",      href: "/automation",                     icon: Zap },
  { label: "Configurações",  href: "/settings",                       icon: Settings, matchPrefix: true },
];
```

> **Nota:** Se `GitCompareArrows` não estiver disponível na versão de lucide-react do projeto, use `ArrowLeftRight` como substituto — troque o import e o campo `icon` para `ArrowLeftRight`.

- [ ] **Step 4.5: Verificar TypeScript**

```
npx tsc --noEmit
```

Resultado esperado: zero erros. Se `GitCompareArrows` não existir, substituir por `ArrowLeftRight` no import e no NAV_ITEMS.

- [ ] **Step 4.6: Rodar toda a suite de unit tests**

```
npx vitest run
```

Resultado esperado: todos os testes anteriores passando

- [ ] **Step 4.7: Commit**

```bash
git add app/api/analytics/reconciliation/route.ts \
        "app/(dashboard)/analytics/reconciliation/page.tsx" \
        components/layout/nav-items.ts \
        tests/e2e/analytics-reconciliation.spec.ts
git commit -m "feat(m-ads-f4): reconciliation API, dashboard page, sidebar nav link"
```

---

## Commit final e atualização do plano

- [ ] **Step 5.1: Rodar a suite completa uma última vez**

```
npx vitest run
```

Resultado esperado: PASS — todos os testes incluindo os ~23 novos desta fase

- [ ] **Step 5.2: Verificar TypeScript**

```
npx tsc --noEmit
```

Resultado esperado: zero erros

- [ ] **Step 5.3: Atualizar `docs/PLAN.md`**

Localizar o bloco `### Fase 4` em `docs/PLAN.md` e:
- Marcar todos os `- [ ]` como `- [x]`
- Atualizar a linha de status na tabela de Entregáveis:
  ```
  | 4 | `campaign_metrics_daily` populado; skill `tracking-divergence` ativa no AI Traffic Manager; página de reconciliação visível | ✅ PR mergeado — NNN/NNN testes |
  ```
- Atualizar a overview table no topo: `M-ADS | ... | ✅ Done (Fases 1–4)`

- [ ] **Step 5.4: Atualizar `CLAUDE.md`**

Localizar a linha:
```
| M-ADS | Ads Integrations Improvement (Meta/Google/TikTok/LinkedIn) | ✅ Done (Fases 1–3) | ...
```

Substituir por:
```
| M-ADS | Ads Integrations Improvement (Meta/Google/TikTok/LinkedIn) | ✅ Done (Fases 1–4) | ...
```

E na seção `### M-ADS — Integrations Architecture`, adicionar ao bloco **Completed**:
```
- `campaign_metrics_daily` populado pelo sync; `getReconciliationRows` expõe divergência pixel×plataforma
- Skill `tracking-divergence` no AI Traffic Manager: dispara quando pixel < 50% da plataforma
- Página `/analytics/reconciliation` com tabela de divergência por campanha
```

- [ ] **Step 5.5: Commit de documentação**

```bash
git add docs/PLAN.md CLAUDE.md
git commit -m "docs(plan): mark M-ADS Fase 4 done — attribution loop complete"
```

---

## Self-review checklist

### Cobertura de spec (PLAN.md Fase 4)

| Requisito do PLAN.md | Task que implementa |
|---------------------|-------------------|
| `lib/analytics/cross-platform.ts` — `normalizeCampaignMetrics` + `reconcileWithPixel` | Task 1 Step 1.5 |
| Migration `022_campaign_metrics_daily.sql` | Task 1 Step 1.3 |
| `lib/ai/diagnostics/context.ts` — estender com `crossPlatformMetrics` + `pixelReconciliation` | Task 3 Step 3.4 |
| `lib/ai/diagnostics/skills/tracking-divergence.ts` | Task 3 Step 3.5 |
| `app/(dashboard)/analytics/reconciliation/page.tsx` | Task 4 Step 4.3 |
| Testes `cross-platform-metrics` | Task 1 Step 1.1 |
| Testes `diagnostics-tracking-divergence` | Task 3 Step 3.1 |
| Testes E2E `analytics-reconciliation` | Task 4 Step 4.1 |
| Sidebar: link "Reconciliação" sob Analytics | Task 4 Step 4.4 |

### Type consistency

- `NormalizedCampaignMetrics.campaignExternalId` — usado em `upsertDailyMetrics` (registros), `normalizeCampaignMetrics` (retorno), `context.ts` (lookup key)
- `ReconciliationRow.campaignExternalId` — produzido por `reconcileWithPixel`, consumido pela página
- `CampaignContext.pixelConversions: number | null` — produzido por `context.ts`, consumido por `trackingDivergence.shouldTrigger`
- `Skill.requiredMetrics` é apenas informacional (não enforced em runtime) — `"pixelConversions"` listado é consistente com o campo do context

### Placeholders / TODOs

Nenhum TBD ou TODO pendente no código desta fase. O padrão `TODO(M-ADS-backend)` do sync.ts para os upserts de campanhas é pré-existente e intencional — não é introduzido por esta fase.
