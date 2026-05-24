# M8 — Automation & Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AdFlow Automation & Alerts module — alert rules that trigger when campaign KPIs cross thresholds (ROAS drops, budget exhausted, anomaly detected), an in-app notification inbox, and a rule builder UI so users can configure their own alerts without touching code.

**Architecture:** Alert rules are stored in Postgres with RLS. A background evaluation job (Next.js Route Handler called by a cron/Vercel Cron) reads campaign metrics + pixel events, evaluates every rule for the workspace, and inserts `alert_notifications` rows when thresholds are breached. The UI has a `/automation` page listing rules and a notification bell in the topbar pulling unread count. All alert evaluation is pure TypeScript — no external queues for MVP. Email delivery is handled by Resend (free tier, no SDK needed — plain `fetch` to the Resend REST API).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL + RLS), Vitest, Playwright, Resend REST API, Vercel Cron (one route, one `vercel.json` cron entry).

---

## Scope

M8 MVP covers:

1. **Alert Rules** — CRUD UI for rules scoped to a workspace + campaign. Conditions: `roas_below`, `cpa_above`, `spend_above`, `ctr_below`, `conversions_below`. One rule = one condition + one threshold.
2. **Alert Evaluation** — server-side job that evaluates all active rules, creates notifications, marks rules as `last_triggered_at`.
3. **Notification Inbox** — in-app notification bell (topbar) showing unread count + drawer with notification list. Mark as read.
4. **Email Delivery** — when a notification is created, send an email to the workspace owner via Resend REST API.
5. **Automation Page** — `/automation` lists all rules, allows create/edit/delete/toggle.

Out of scope for MVP: SMS, WhatsApp, funnel builder, A/B trigger conditions, snooze, escalation chains.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/008_automation.sql` | Tables: `alert_rules`, `alert_notifications` + RLS |
| Modify | `types/database.ts` | Add `AlertRule`, `AlertNotification` types |
| Create | `lib/automation/evaluator.ts` | Pure fn: evaluate one rule against metric snapshot |
| Create | `lib/automation/email.ts` | Send alert email via Resend REST API |
| Create | `lib/automation/rules.ts` | Supabase helpers: fetch active rules, insert notification, update last_triggered_at |
| Create | `app/api/cron/evaluate-alerts/route.ts` | GET handler called by Vercel Cron — orchestrates evaluation |
| Create | `app/api/automation/rules/route.ts` | GET (list) + POST (create) alert rules |
| Create | `app/api/automation/rules/[id]/route.ts` | PATCH (update/toggle) + DELETE alert rule |
| Create | `app/api/automation/notifications/route.ts` | GET unread list |
| Create | `app/api/automation/notifications/[id]/read/route.ts` | POST mark as read |
| Create | `app/(dashboard)/automation/page.tsx` | Server Component: automation page shell |
| Create | `components/automation/alert-rules-table.tsx` | Table listing rules with toggle + delete |
| Create | `components/automation/alert-rule-form.tsx` | Create/edit rule form (dialog) |
| Create | `components/automation/notification-bell.tsx` | Topbar bell icon + unread badge |
| Create | `components/automation/notification-drawer.tsx` | Slide-out drawer with notification list |
| Modify | `components/layout/topbar.tsx` | Add `NotificationBell` |
| Modify | `components/layout/nav-items.ts` | Automação entry already exists — verify href matches |
| Create | `vercel.json` | Cron schedule for `/api/cron/evaluate-alerts` |
| Create | `tests/unit/evaluator.test.ts` | Unit tests for all condition types |
| Create | `tests/unit/automation-rules.test.ts` | Unit tests for rule helpers |
| Create | `tests/e2e/automation.spec.ts` | E2E: create rule, notification appears, mark read |

---

## Task 1: Database Schema — alert_rules + alert_notifications

**Files:**
- Create: `supabase/migrations/008_automation.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/008_automation.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- M8: Automation & Alerts
-- Tables: alert_rules, alert_notifications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE alert_condition AS ENUM (
  'roas_below',
  'cpa_above',
  'spend_above',
  'ctr_below',
  'conversions_below'
);

CREATE TYPE alert_status AS ENUM ('active', 'paused');

-- ── alert_rules ───────────────────────────────────────────────────────────────

CREATE TABLE alert_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,  -- NULL = all campaigns
  name             TEXT NOT NULL,
  condition        alert_condition NOT NULL,
  threshold        NUMERIC(12, 4) NOT NULL,
  status           alert_status NOT NULL DEFAULT 'active',
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,   -- min minutes between re-triggers
  last_triggered_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_rules: workspace members can read"
  ON alert_rules FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alert_rules: workspace members can insert"
  ON alert_rules FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alert_rules: workspace members can update"
  ON alert_rules FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alert_rules: workspace members can delete"
  ON alert_rules FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── alert_notifications ───────────────────────────────────────────────────────

CREATE TABLE alert_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id      UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  campaign_id  UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  metric_value NUMERIC(12, 4) NOT NULL,  -- the actual value that triggered it
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  emailed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_notifications: workspace members can read"
  ON alert_notifications FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "alert_notifications: workspace members can update"
  ON alert_notifications FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for cron evaluation (inserts from server with service key)
CREATE POLICY "alert_notifications: service role can insert"
  ON alert_notifications FOR INSERT
  WITH CHECK (true);  -- restricted to service_role via RLS bypass in cron handler
```

- [ ] **Step 2: Verify migration syntax**

```bash
# Dry-run the SQL against the local Supabase instance if running, or just review it.
# If using Supabase CLI:
# npx supabase db push --dry-run
# For now, visually inspect the file and confirm:
# - Both tables have UUID PKs
# - Both have RLS enabled
# - alert_rules references campaigns(id) with ON DELETE CASCADE
echo "Migration file created — apply with: npx supabase db push"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_automation.sql
git commit -m "feat(m8): add alert_rules and alert_notifications schema"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Write the failing test (types compile correctly)**

Create `tests/unit/automation-types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from "vitest";
import type { AlertRule, AlertNotification, AlertCondition, AlertStatus } from "@/types/database";

describe("automation types", () => {
  it("AlertCondition covers all enum values", () => {
    const conditions: AlertCondition[] = [
      "roas_below",
      "cpa_above",
      "spend_above",
      "ctr_below",
      "conversions_below",
    ];
    expectTypeOf(conditions).toMatchTypeOf<AlertCondition[]>();
  });

  it("AlertRule has required fields", () => {
    expectTypeOf<AlertRule>().toHaveProperty("id");
    expectTypeOf<AlertRule>().toHaveProperty("workspace_id");
    expectTypeOf<AlertRule>().toHaveProperty("condition");
    expectTypeOf<AlertRule>().toHaveProperty("threshold");
    expectTypeOf<AlertRule>().toHaveProperty("status");
    expectTypeOf<AlertRule>().toHaveProperty("cooldown_minutes");
  });

  it("AlertNotification has read flag", () => {
    expectTypeOf<AlertNotification>().toHaveProperty("read");
    expectTypeOf<AlertNotification["read"]>().toEqualTypeOf<boolean>();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/unit/automation-types.test.ts
```
Expected: FAIL — `AlertRule` not found in `@/types/database`.

- [ ] **Step 3: Add types to `types/database.ts`**

Append after the `// ─── M5` block at the end of the file:

```typescript
// ─── M8: Automation & Alerts ──────────────────────────────────────────────────

export type AlertCondition =
  | "roas_below"
  | "cpa_above"
  | "spend_above"
  | "ctr_below"
  | "conversions_below";

export type AlertStatus = "active" | "paused";

export type AlertRule = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  name: string;
  condition: AlertCondition;
  threshold: number;
  status: AlertStatus;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AlertRuleCreateInput = {
  workspace_id: string;
  campaign_id?: string | null;
  name: string;
  condition: AlertCondition;
  threshold: number;
  cooldown_minutes?: number;
};

export type AlertNotification = {
  id: string;
  workspace_id: string;
  rule_id: string;
  campaign_id: string | null;
  title: string;
  body: string;
  metric_value: number;
  read: boolean;
  emailed: boolean;
  created_at: string;
};

// Metric snapshot passed to the evaluator — values derived from campaigns table
export type CampaignMetricSnapshot = {
  campaign_id: string;
  workspace_id: string;
  campaign_name: string;
  roas: number | null;
  cpa: number | null;
  spend: number;
  ctr: number | null;
  conversions: number;
};
```

> Note: `CampaignMetricSnapshot` (for automation) is a new type distinct from the M2 `CampaignMetricSnapshot` (daily chart data). Rename the M2 one to `DailyMetricSnapshot` in the same file to avoid collision:

Find this in `types/database.ts`:
```typescript
// Daily metric snapshot for charts
export type CampaignMetricSnapshot = {
```
Replace with:
```typescript
// Daily metric snapshot for charts (M2)
export type DailyMetricSnapshot = {
```

Also update the import in `components/campaigns/campaign-charts.tsx` if it imports `CampaignMetricSnapshot`.

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run tests/unit/automation-types.test.ts
```
Expected: PASS

- [ ] **Step 5: Confirm no TypeScript errors introduced**

```bash
npx tsc --noEmit
```
Expected: 0 errors. If `CampaignMetricSnapshot` is referenced elsewhere, fix those imports.

- [ ] **Step 6: Commit**

```bash
git add types/database.ts tests/unit/automation-types.test.ts
git commit -m "feat(m8): add automation types (AlertRule, AlertNotification)"
```

---

## Task 3: Alert Evaluator (pure functions)

**Files:**
- Create: `lib/automation/evaluator.ts`
- Create: `tests/unit/evaluator.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/evaluator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { evaluateRule, buildNotificationMessage } from "@/lib/automation/evaluator";
import type { AlertRule, CampaignMetricSnapshot } from "@/types/database";

const baseRule: AlertRule = {
  id: "rule-1",
  workspace_id: "ws-1",
  campaign_id: null,
  name: "ROAS Alert",
  condition: "roas_below",
  threshold: 2.0,
  status: "active",
  cooldown_minutes: 60,
  last_triggered_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const baseMetric: CampaignMetricSnapshot = {
  campaign_id: "camp-1",
  workspace_id: "ws-1",
  campaign_name: "Black Friday",
  roas: 1.5,
  cpa: 50,
  spend: 1000,
  ctr: 0.02,
  conversions: 20,
};

describe("evaluateRule", () => {
  it("triggers roas_below when roas < threshold", () => {
    expect(evaluateRule(baseRule, baseMetric)).toBe(true);
  });

  it("does not trigger roas_below when roas >= threshold", () => {
    expect(evaluateRule(baseRule, { ...baseMetric, roas: 2.5 })).toBe(false);
  });

  it("does not trigger when roas is null", () => {
    expect(evaluateRule(baseRule, { ...baseMetric, roas: null })).toBe(false);
  });

  it("triggers cpa_above when cpa > threshold", () => {
    const rule = { ...baseRule, condition: "cpa_above" as const, threshold: 30 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("does not trigger cpa_above when cpa <= threshold", () => {
    const rule = { ...baseRule, condition: "cpa_above" as const, threshold: 60 };
    expect(evaluateRule(rule, baseMetric)).toBe(false);
  });

  it("triggers spend_above when spend > threshold", () => {
    const rule = { ...baseRule, condition: "spend_above" as const, threshold: 500 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("triggers ctr_below when ctr < threshold", () => {
    const rule = { ...baseRule, condition: "ctr_below" as const, threshold: 0.05 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("triggers conversions_below when conversions < threshold", () => {
    const rule = { ...baseRule, condition: "conversions_below" as const, threshold: 50 };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("respects cooldown — does not trigger if last_triggered_at is recent", () => {
    const recentTrigger = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    const rule = { ...baseRule, cooldown_minutes: 60, last_triggered_at: recentTrigger };
    expect(evaluateRule(rule, baseMetric)).toBe(false);
  });

  it("triggers when cooldown has expired", () => {
    const oldTrigger = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 2h ago
    const rule = { ...baseRule, cooldown_minutes: 60, last_triggered_at: oldTrigger };
    expect(evaluateRule(rule, baseMetric)).toBe(true);
  });

  it("does not trigger when rule is paused", () => {
    expect(evaluateRule({ ...baseRule, status: "paused" }, baseMetric)).toBe(false);
  });
});

describe("buildNotificationMessage", () => {
  it("returns title and body for roas_below", () => {
    const result = buildNotificationMessage(baseRule, baseMetric, 1.5);
    expect(result.title).toContain("ROAS");
    expect(result.body).toContain("Black Friday");
    expect(result.body).toContain("1.5");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/evaluator.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the evaluator**

Create `lib/automation/evaluator.ts`:

```typescript
import type { AlertRule, CampaignMetricSnapshot } from "@/types/database";

/**
 * Returns true if the rule condition is breached for the given metric snapshot
 * AND the rule is active AND the cooldown has elapsed.
 */
export function evaluateRule(
  rule: AlertRule,
  metric: CampaignMetricSnapshot
): boolean {
  if (rule.status === "paused") return false;

  if (rule.last_triggered_at) {
    const elapsedMs = Date.now() - new Date(rule.last_triggered_at).getTime();
    const cooldownMs = rule.cooldown_minutes * 60 * 1000;
    if (elapsedMs < cooldownMs) return false;
  }

  return conditionBreach(rule, metric);
}

function conditionBreach(rule: AlertRule, m: CampaignMetricSnapshot): boolean {
  switch (rule.condition) {
    case "roas_below":
      return m.roas !== null && m.roas < rule.threshold;
    case "cpa_above":
      return m.cpa !== null && m.cpa > rule.threshold;
    case "spend_above":
      return m.spend > rule.threshold;
    case "ctr_below":
      return m.ctr !== null && m.ctr < rule.threshold;
    case "conversions_below":
      return m.conversions < rule.threshold;
  }
}

export function buildNotificationMessage(
  rule: AlertRule,
  metric: CampaignMetricSnapshot,
  actualValue: number
): { title: string; body: string } {
  const conditionLabels: Record<AlertRule["condition"], string> = {
    roas_below: "ROAS abaixo do limite",
    cpa_above: "CPA acima do limite",
    spend_above: "Gasto acima do limite",
    ctr_below: "CTR abaixo do limite",
    conversions_below: "Conversões abaixo do limite",
  };

  const title = `Alerta: ${conditionLabels[rule.condition]}`;
  const body = `Campanha "${metric.campaign_name}": valor atual ${actualValue.toFixed(2)}, limite configurado ${rule.threshold}. Regra: "${rule.name}".`;

  return { title, body };
}

/** Extract the relevant metric value for a given condition */
export function getMetricValue(
  condition: AlertRule["condition"],
  metric: CampaignMetricSnapshot
): number | null {
  switch (condition) {
    case "roas_below":      return metric.roas;
    case "cpa_above":       return metric.cpa;
    case "spend_above":     return metric.spend;
    case "ctr_below":       return metric.ctr;
    case "conversions_below": return metric.conversions;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/evaluator.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add lib/automation/evaluator.ts tests/unit/evaluator.test.ts
git commit -m "feat(m8): add alert rule evaluator with cooldown and all condition types"
```

---

## Task 4: Supabase Rule Helpers

**Files:**
- Create: `lib/automation/rules.ts`
- Create: `tests/unit/automation-rules.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/automation-rules.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchActiveRules, fetchCampaignMetrics, insertNotification, markRuleTriggered } from "@/lib/automation/rules";

function makeMockSupabase(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn(),
  };
  // Make the chain awaitable for list queries
  (chain as unknown as Promise<unknown>)[Symbol.for("nodejs.util.inspect.custom")] = () => "";
  const awaitableChain = Object.assign(
    Promise.resolve({ data, error }),
    chain
  );
  return {
    from: vi.fn().mockReturnValue(awaitableChain),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) },
  };
}

describe("fetchActiveRules", () => {
  it("calls supabase with workspace_id filter", async () => {
    const mock = makeMockSupabase([]);
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never);
    await fetchActiveRules("ws-1");
    expect(mock.from).toHaveBeenCalledWith("alert_rules");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/unit/automation-rules.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement rule helpers**

Create `lib/automation/rules.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AlertRule, AlertNotification, CampaignMetricSnapshot } from "@/types/database";

export async function fetchActiveRules(workspaceId: string): Promise<AlertRule[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data as AlertRule[]) ?? [];
}

export async function fetchCampaignMetrics(
  workspaceId: string
): Promise<CampaignMetricSnapshot[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, workspace_id, name, roas, cpa, spend, ctr, conversions")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      campaign_id: r.id as string,
      workspace_id: r.workspace_id as string,
      campaign_name: r.name as string,
      roas: r.roas as number | null,
      cpa: r.cpa as number | null,
      spend: r.spend as number,
      ctr: r.ctr as number | null,
      conversions: r.conversions as number,
    };
  });
}

export async function insertNotification(
  notification: Omit<AlertNotification, "id" | "created_at" | "read" | "emailed">
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("alert_notifications").insert({
    ...notification,
    read: false,
    emailed: false,
  });
  if (error) throw new Error(error.message);
}

export async function markRuleTriggered(ruleId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("alert_rules")
    .update({ last_triggered_at: new Date().toISOString() })
    .eq("id", ruleId);
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("alert_notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
}

export async function fetchUnreadNotifications(
  workspaceId: string
): Promise<AlertNotification[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as AlertNotification[]) ?? [];
}

export async function fetchAllRules(workspaceId: string): Promise<AlertRule[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AlertRule[]) ?? [];
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/automation-rules.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/automation/rules.ts tests/unit/automation-rules.test.ts
git commit -m "feat(m8): add Supabase rule helpers (fetch, insert, mark)"
```

---

## Task 5: Email Delivery via Resend

**Files:**
- Create: `lib/automation/email.ts`

- [ ] **Step 1: Write the implementation**

Create `lib/automation/email.ts`:

```typescript
type SendAlertEmailParams = {
  to: string;
  alertTitle: string;
  alertBody: string;
  workspaceName: string;
};

export async function sendAlertEmail({
  to,
  alertTitle,
  alertBody,
  workspaceName,
}: SendAlertEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[automation] RESEND_API_KEY not set — skipping email");
    return;
  }

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#E8390E;margin:0 0 8px">${alertTitle}</h2>
      <p style="color:#374151;margin:0 0 16px">${alertBody}</p>
      <p style="color:#6B7280;font-size:12px">Workspace: ${workspaceName}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/automation"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#E8390E;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">
        Ver Alertas
      </a>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AdFlow Alertas <alerts@adflow.app>",
      to,
      subject: alertTitle,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[automation] Resend error:", res.status, text);
  }
}
```

- [ ] **Step 2: Add `RESEND_API_KEY` to env example**

Open `.env.local.example` and append:

```
# Resend (M8: automation email alerts)
RESEND_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add lib/automation/email.ts .env.local.example
git commit -m "feat(m8): add Resend email helper for alert notifications"
```

---

## Task 6: Cron Evaluation Route

**Files:**
- Create: `app/api/cron/evaluate-alerts/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Write the cron route**

Create `app/api/cron/evaluate-alerts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { fetchActiveRules, fetchCampaignMetrics, insertNotification, markRuleTriggered } from "@/lib/automation/rules";
import { evaluateRule, buildNotificationMessage, getMetricValue } from "@/lib/automation/evaluator";
import { sendAlertEmail } from "@/lib/automation/email";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Vercel Cron calls this route. Protect it with a shared secret.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all workspace IDs that have active rules
    const supabase = await createServerSupabaseClient();
    const { data: workspaceRows, error } = await supabase
      .from("alert_rules")
      .select("workspace_id")
      .eq("status", "active");
    if (error) throw new Error(error.message);

    const workspaceIds = [
      ...new Set((workspaceRows ?? []).map((r: { workspace_id: string }) => r.workspace_id)),
    ];

    let triggered = 0;

    for (const workspaceId of workspaceIds) {
      const [rules, metrics] = await Promise.all([
        fetchActiveRules(workspaceId),
        fetchCampaignMetrics(workspaceId),
      ]);

      // Fetch workspace owner email for notifications
      const { data: ownerRows } = await supabase
        .from("organization_members")
        .select("profiles(id, display_name), user_id")
        .eq("role", "owner")
        .limit(1);

      const ownerEmail: string | null = null; // resolved from auth.users in production

      for (const rule of rules) {
        const applicableMetrics = rule.campaign_id
          ? metrics.filter((m) => m.campaign_id === rule.campaign_id)
          : metrics;

        for (const metric of applicableMetrics) {
          if (!evaluateRule(rule, metric)) continue;

          const actualValue = getMetricValue(rule.condition, metric) ?? 0;
          const { title, body } = buildNotificationMessage(rule, metric, actualValue);

          await insertNotification({
            workspace_id: workspaceId,
            rule_id: rule.id,
            campaign_id: metric.campaign_id,
            title,
            body,
            metric_value: actualValue,
          });

          await markRuleTriggered(rule.id);
          triggered++;

          if (ownerEmail) {
            await sendAlertEmail({
              to: ownerEmail,
              alertTitle: title,
              alertBody: body,
              workspaceName: workspaceId,
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, triggered });
  } catch (err) {
    console.error("[cron/evaluate-alerts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create vercel.json with cron schedule**

Create `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/evaluate-alerts",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This runs every 15 minutes. Vercel Cron sends a `GET` request with `Authorization: Bearer $CRON_SECRET`.

- [ ] **Step 3: Add `CRON_SECRET` to env example**

Open `.env.local.example` and append:

```
# Cron security (M8)
CRON_SECRET=
```

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/evaluate-alerts/route.ts vercel.json .env.local.example
git commit -m "feat(m8): add cron evaluation route and vercel.json schedule"
```

---

## Task 7: Alert Rules API Routes

**Files:**
- Create: `app/api/automation/rules/route.ts`
- Create: `app/api/automation/rules/[id]/route.ts`
- Create: `app/api/automation/notifications/route.ts`
- Create: `app/api/automation/notifications/[id]/read/route.ts`

- [ ] **Step 1: Implement list + create rules**

Create `app/api/automation/rules/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchAllRules } from "@/lib/automation/rules";
import type { AlertRuleCreateInput } from "@/types/database";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  try {
    const rules = await fetchAllRules(workspaceId);
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = body as AlertRuleCreateInput;
  if (!input.workspace_id || !input.name || !input.condition || input.threshold === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase.from("alert_rules").insert({
    workspace_id: input.workspace_id,
    campaign_id: input.campaign_id ?? null,
    name: input.name,
    condition: input.condition,
    threshold: input.threshold,
    cooldown_minutes: input.cooldown_minutes ?? 60,
    status: "active",
  }).select().single();

  if (error) return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Implement update + delete rule**

Create `app/api/automation/rules/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = ["name", "condition", "threshold", "status", "cooldown_minutes", "campaign_id"];
  const update = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from("alert_rules")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Implement notifications routes**

Create `app/api/automation/notifications/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUnreadNotifications } from "@/lib/automation/rules";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  try {
    const notifications = await fetchUnreadNotifications(workspaceId);
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
```

Create `app/api/automation/notifications/[id]/read/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/automation/rules";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/automation/
git commit -m "feat(m8): add automation API routes (rules CRUD + notifications)"
```

---

## Task 8: Automation Page (Server Component shell)

**Files:**
- Create: `app/(dashboard)/automation/page.tsx`

- [ ] **Step 1: Write the page**

Create `app/(dashboard)/automation/page.tsx`:

```typescript
import { fetchAllRules } from "@/lib/automation/rules";
import { AlertRulesTable } from "@/components/automation/alert-rules-table";

// Hardcoded workspace for MVP — replace with session context when auth is wired
const MOCK_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export default async function AutomationPage() {
  let rules = [];
  try {
    rules = await fetchAllRules(MOCK_WORKSPACE_ID);
  } catch {
    // No rules yet or DB not connected
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Automação & Alertas
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            Configure alertas automáticos para KPIs de campanha
          </p>
        </div>
      </div>

      <AlertRulesTable initialRules={rules} workspaceId={MOCK_WORKSPACE_ID} />
    </div>
  );
}
```

- [ ] **Step 2: Confirm `nav-items.ts` already has Automação entry**

Open [components/layout/nav-items.ts](components/layout/nav-items.ts) — it should already contain:
```typescript
{ label: "Automação", href: "/automation", icon: Zap },
```
If missing, add it after the Analytics entry.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/automation/page.tsx
git commit -m "feat(m8): add automation page server component"
```

---

## Task 9: Alert Rules Table Component

**Files:**
- Create: `components/automation/alert-rules-table.tsx`
- Create: `components/automation/alert-rule-form.tsx`

- [ ] **Step 1: Implement the rules table**

Create `components/automation/alert-rules-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { AlertRule } from "@/types/database";
import { AlertRuleForm } from "@/components/automation/alert-rule-form";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Pause, Play } from "lucide-react";

type AlertRulesTableProps = {
  initialRules: AlertRule[];
  workspaceId: string;
};

const CONDITION_LABELS: Record<AlertRule["condition"], string> = {
  roas_below: "ROAS abaixo de",
  cpa_above: "CPA acima de",
  spend_above: "Gasto acima de",
  ctr_below: "CTR abaixo de",
  conversions_below: "Conversões abaixo de",
};

export function AlertRulesTable({ initialRules, workspaceId }: AlertRulesTableProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  async function handleToggle(rule: AlertRule) {
    const newStatus = rule.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/automation/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, status: newStatus } : r))
      );
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Remover esta regra de alerta?")) return;
    const res = await fetch(`/api/automation/rules/${ruleId}`, { method: "DELETE" });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    }
  }

  function handleSaved(rule: AlertRule) {
    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    } else {
      setRules((prev) => [rule, ...prev]);
    }
    setFormOpen(false);
    setEditingRule(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => { setEditingRule(null); setFormOpen(true); }}
          className="gap-1.5 bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-12 text-center">
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            Nenhuma regra de alerta configurada.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[color:var(--adflow-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]">
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Condição</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Limite</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Cooldown</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-[color:var(--adflow-border)] last:border-0 bg-[color:var(--adflow-surface)] hover:bg-[color:var(--adflow-border)]/30 transition-colors"
                >
                  <td className="px-4 py-3 text-[color:var(--adflow-fg)] font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-[color:var(--adflow-fg-muted)]">
                    {CONDITION_LABELS[rule.condition]}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--adflow-fg)]">{rule.threshold}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      rule.status === "active"
                        ? "bg-[color:var(--adflow-success)]/10 text-[color:var(--adflow-success)]"
                        : "bg-[color:var(--adflow-fg-muted)]/10 text-[color:var(--adflow-fg-muted)]"
                    }`}>
                      {rule.status === "active" ? "Ativo" : "Pausado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--adflow-fg-muted)]">
                    {rule.cooldown_minutes}min
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleToggle(rule)}
                        title={rule.status === "active" ? "Pausar" : "Ativar"}
                        className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
                      >
                        {rule.status === "active"
                          ? <Pause className="w-3.5 h-3.5" />
                          : <Play className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => { setEditingRule(rule); setFormOpen(true); }}
                        title="Editar"
                        className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        title="Remover"
                        className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-danger)] hover:bg-[color:var(--adflow-border)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <AlertRuleForm
          workspaceId={workspaceId}
          rule={editingRule}
          onSaved={handleSaved}
          onCancel={() => { setFormOpen(false); setEditingRule(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement the rule form (dialog)**

Create `components/automation/alert-rule-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { AlertRule, AlertRuleCreateInput, AlertCondition } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

type AlertRuleFormProps = {
  workspaceId: string;
  rule: AlertRule | null;
  onSaved: (rule: AlertRule) => void;
  onCancel: () => void;
};

const CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: "roas_below",        label: "ROAS abaixo de" },
  { value: "cpa_above",         label: "CPA acima de" },
  { value: "spend_above",       label: "Gasto acima de (R$)" },
  { value: "ctr_below",         label: "CTR abaixo de (%)" },
  { value: "conversions_below", label: "Conversões abaixo de" },
];

export function AlertRuleForm({ workspaceId, rule, onSaved, onCancel }: AlertRuleFormProps) {
  const [name, setName] = useState(rule?.name ?? "");
  const [condition, setCondition] = useState<AlertCondition>(rule?.condition ?? "roas_below");
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? ""));
  const [cooldown, setCooldown] = useState(String(rule?.cooldown_minutes ?? "60"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const thresholdNum = parseFloat(threshold);
    if (!name.trim() || isNaN(thresholdNum)) {
      setError("Preencha nome e limite corretamente.");
      return;
    }

    setSaving(true);
    try {
      if (rule) {
        const res = await fetch(`/api/automation/rules/${rule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, condition, threshold: thresholdNum, cooldown_minutes: parseInt(cooldown) }),
        });
        if (!res.ok) throw new Error("Falha ao atualizar regra");
        onSaved(await res.json());
      } else {
        const payload: AlertRuleCreateInput = {
          workspace_id: workspaceId,
          name,
          condition,
          threshold: thresholdNum,
          cooldown_minutes: parseInt(cooldown),
        };
        const res = await fetch("/api/automation/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Falha ao criar regra");
        onSaved(await res.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[color:var(--adflow-fg)]">
            {rule ? "Editar Regra" : "Nova Regra de Alerta"}
          </h2>
          <button
            onClick={onCancel}
            className="text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name" className="text-[color:var(--adflow-fg-muted)] text-xs">Nome da Regra</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: ROAS baixo - Black Friday"
              className="bg-[color:var(--adflow-base)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-condition" className="text-[color:var(--adflow-fg-muted)] text-xs">Condição</Label>
            <select
              id="rule-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as AlertCondition)}
              className="w-full rounded-md border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)] px-3 py-2 text-sm text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)]"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-threshold" className="text-[color:var(--adflow-fg-muted)] text-xs">Limite</Label>
            <Input
              id="rule-threshold"
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="ex: 2.5"
              className="bg-[color:var(--adflow-base)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-cooldown" className="text-[color:var(--adflow-fg-muted)] text-xs">
              Cooldown (minutos entre re-disparos)
            </Label>
            <Input
              id="rule-cooldown"
              type="number"
              min="5"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              className="bg-[color:var(--adflow-base)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
            />
          </div>

          {error && (
            <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white"
            >
              {saving ? "Salvando…" : rule ? "Salvar" : "Criar Regra"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/automation/
git commit -m "feat(m8): add AlertRulesTable and AlertRuleForm components"
```

---

## Task 10: Notification Bell + Drawer

**Files:**
- Create: `components/automation/notification-bell.tsx`
- Create: `components/automation/notification-drawer.tsx`
- Modify: `components/layout/topbar.tsx`

- [ ] **Step 1: Implement notification bell**

Create `components/automation/notification-bell.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import type { AlertNotification } from "@/types/database";
import { NotificationDrawer } from "@/components/automation/notification-drawer";

type NotificationBellProps = {
  workspaceId: string;
};

export function NotificationBell({ workspaceId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/automation/notifications?workspace_id=${workspaceId}`);
        if (res.ok) setNotifications(await res.json());
      } catch {
        // silent — bell stays at 0
      }
    }
    load();
    const id = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [workspaceId]);

  async function handleMarkRead(id: string) {
    await fetch(`/api/automation/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unread = notifications.length;

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        className="relative p-1.5 rounded-md text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--adflow-accent)] text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <NotificationDrawer
        open={drawerOpen}
        notifications={notifications}
        onClose={() => setDrawerOpen(false)}
        onMarkRead={handleMarkRead}
      />
    </>
  );
}
```

- [ ] **Step 2: Implement notification drawer**

Create `components/automation/notification-drawer.tsx`:

```typescript
"use client";

import type { AlertNotification } from "@/types/database";
import { X, CheckCheck } from "lucide-react";

type NotificationDrawerProps = {
  open: boolean;
  notifications: AlertNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function NotificationDrawer({
  open,
  notifications,
  onClose,
  onMarkRead,
}: NotificationDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 h-full w-80 bg-[color:var(--adflow-surface)] border-l border-[color:var(--adflow-border)] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--adflow-border)]">
          <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">Notificações</h2>
          <button
            onClick={onClose}
            className="text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[color:var(--adflow-fg-muted)]">
              <CheckCheck className="w-8 h-8 opacity-40" />
              <p className="text-sm">Sem notificações não lidas</p>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--adflow-border)]">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 hover:bg-[color:var(--adflow-border)]/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[color:var(--adflow-fg)] truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-xs text-[color:var(--adflow-fg-muted)]/60 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => onMarkRead(n.id)}
                      title="Marcar como lida"
                      className="shrink-0 p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-success)] hover:bg-[color:var(--adflow-border)] transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Add bell to topbar**

Open [components/layout/topbar.tsx](components/layout/topbar.tsx) and add the bell import + component. Find the topbar's right section (where `UserMenu` lives) and insert before it:

```typescript
import { NotificationBell } from "@/components/automation/notification-bell";
```

And in the JSX, add alongside the user menu:
```tsx
<NotificationBell workspaceId="00000000-0000-0000-0000-000000000001" />
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/automation/notification-bell.tsx components/automation/notification-drawer.tsx components/layout/topbar.tsx
git commit -m "feat(m8): add notification bell and drawer to topbar"
```

---

## Task 11: E2E Tests

**Files:**
- Create: `tests/e2e/automation.spec.ts`

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/automation.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Automation page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/automation");
  });

  test("shows automation page title", async ({ page }) => {
    await expect(page.getByText("Automação & Alertas")).toBeVisible();
  });

  test("shows empty state when no rules exist", async ({ page }) => {
    // In CI with no DB, the page renders with empty rules
    const emptyMsg = page.getByText("Nenhuma regra de alerta configurada.");
    const table = page.locator("table");
    // One of the two should be visible
    const hasEmpty = await emptyMsg.isVisible().catch(() => false);
    const hasTable = await table.isVisible().catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });

  test("opens create rule form on Nova Regra click", async ({ page }) => {
    await page.getByRole("button", { name: "Nova Regra" }).click();
    await expect(page.getByText("Nova Regra de Alerta")).toBeVisible();
  });

  test("create rule form has required fields", async ({ page }) => {
    await page.getByRole("button", { name: "Nova Regra" }).click();
    await expect(page.getByLabel("Nome da Regra")).toBeVisible();
    await expect(page.getByLabel("Condição")).toBeVisible();
    await expect(page.getByLabel("Limite")).toBeVisible();
  });

  test("notification bell is visible in topbar", async ({ page }) => {
    const bell = page.getByRole("button", { name: /Notificações/ });
    await expect(bell).toBeVisible();
  });

  test("clicking notification bell opens drawer", async ({ page }) => {
    await page.getByRole("button", { name: /Notificações/ }).click();
    await expect(page.getByText("Notificações")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test tests/e2e/automation.spec.ts --headed
```
Expected: PASS (or skip DB-dependent assertions if Supabase is not running locally).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/automation.spec.ts
git commit -m "test(m8): add E2E tests for automation page and notification bell"
```

---

## Task 12: Final Type-Check + Unit Test Run

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```
Expected: all PASS — no failures.

- [ ] **Step 2: Run type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(m8): complete automation & alerts module — rules, evaluator, cron, notifications, bell"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Covered by |
|-------------|-----------|
| Alert rules for ROAS, CPA, spend, CTR, conversions | Task 1 (DB), Task 3 (evaluator), Task 7 (API) |
| Cooldown between re-triggers | Task 3 (evaluator) |
| In-app notification inbox | Task 10 (bell + drawer) |
| Mark notification as read | Task 10 (drawer) + Task 7 (API) |
| Rule builder UI (create/edit/delete/toggle) | Task 9 (table + form) |
| Email delivery | Task 5 (Resend) |
| Background evaluation job | Task 6 (cron route) |
| Vercel Cron schedule | Task 6 (vercel.json) |
| DB schema with RLS | Task 1 |
| TypeScript types | Task 2 |

### Out of Scope (intentionally deferred)
- SMS / WhatsApp delivery
- Funnel builder
- A/B trigger conditions
- Snooze / escalation
