# M9 — Monetização & Stripe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar monetização completa com Stripe — planos Free / Pro / Agency, checkout session, portal de billing, webhooks de lifecycle e feature gates por plano no dashboard.

**Architecture:** A camada Stripe segue o mesmo padrão dos outros milestones — funções puras testáveis sem deps externas, API routes com guard `TODO(M9-backend)` e fallback para dados mock quando `STRIPE_SECRET_KEY` não está configurada. Os feature gates são validados server-side em cada route handler e também exibidos no frontend como banners de upgrade. A sessão fake (`FAKE_ORG.plan = "agency"`) garante que toda a UI funciona sem Stripe real durante desenvolvimento.

**Tech Stack:** `stripe` SDK (npm), Next.js Route Handlers, Zod para validação, shadcn/ui (Dialog, Badge, Progress), Vitest para unitários, Playwright para E2E.

---

## Mapa de Arquivos

### Criar
| Arquivo | Responsabilidade |
|---------|-----------------|
| `supabase/migrations/011_subscriptions.sql` | Tabela `subscriptions`, trigger sincroniza `organizations.plan` |
| `lib/stripe/client.ts` | Singleton do Stripe SDK (server-only) |
| `lib/stripe/plans.ts` | Definição de planos, limites, feature gates — funções puras |
| `lib/stripe/webhooks.ts` | Handlers de eventos Stripe — funções puras |
| `app/api/stripe/checkout/route.ts` | POST: cria Checkout Session |
| `app/api/stripe/portal/route.ts` | POST: cria Billing Portal Session |
| `app/api/stripe/webhook/route.ts` | POST: valida assinatura + roteia eventos |
| `components/billing/plan-badge.tsx` | Badge do plano atual no sidebar |
| `components/billing/plan-card.tsx` | Card de plano com features e CTA |
| `components/billing/upgrade-modal.tsx` | Modal Free → Pro → Agency com Checkout |
| `components/billing/usage-meter.tsx` | Barras de uso vs limite do plano |
| `components/billing/upgrade-banner.tsx` | Banner inline para features bloqueadas |
| `app/(dashboard)/settings/page.tsx` | Redirect para /settings/billing |
| `app/(dashboard)/settings/billing/page.tsx` | Página principal de billing |
| `tests/unit/stripe-plans.test.ts` | Testes unitários das funções de planos |
| `tests/unit/stripe-webhooks.test.ts` | Testes unitários dos handlers de webhook |
| `tests/e2e/billing.spec.ts` | E2E: página billing, upgrade modal |

### Modificar
| Arquivo | O que muda |
|---------|-----------|
| `types/database.ts` | Adicionar `SubscriptionStatus`, `Subscription` |
| `.env.local.example` | Adicionar `STRIPE_PRO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID` |
| `components/layout/sidebar.tsx` | `PlanBadge` no rodapé do sidebar |

---

## Task 1: Tipos e Migration de Subscriptions

**Files:**
- Modify: `types/database.ts`
- Create: `supabase/migrations/011_subscriptions.sql`

- [ ] **Step 1.1: Adicionar tipos Subscription em `types/database.ts`**

Abra `types/database.ts` e adicione ao final do arquivo (após a seção M8):

```typescript
// ─── M9: Billing / Stripe ────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export type Subscription = {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: OrgPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 1.2: Criar migration `011_subscriptions.sql`**

```sql
-- ============================================================
-- Migration 011: Subscriptions
-- Depends on: 001_initial_schema.sql, 003_billing.sql
-- ============================================================

-- ── subscriptions ─────────────────────────────────────────────────────────────
-- One active subscription per organization.
-- Synced from Stripe webhooks via service role.

create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'
);

create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references organizations(id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text not null unique,
  plan                    text not null default 'free'
                            check (plan in ('free', 'pro', 'agency')),
  status                  subscription_status not null default 'active',
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index subscriptions_org_idx         on subscriptions(organization_id);
create index subscriptions_stripe_sub_idx  on subscriptions(stripe_subscription_id);
create index subscriptions_customer_idx    on subscriptions(stripe_customer_id);

-- Auto-update updated_at
create trigger set_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- RLS: owners/admins can read their own subscription; service role writes
alter table subscriptions enable row level security;

create policy "subscriptions_select" on subscriptions for select
  using (
    is_superadmin()
    or current_user_org_role(organization_id) in ('owner', 'admin')
  );

-- ── Trigger: sync plan to organizations ──────────────────────────────────────
-- When a subscription row is upserted/updated, mirror the plan back to
-- organizations.plan so feature gates can read it without a JOIN.

create or replace function sync_org_plan()
returns trigger language plpgsql security definer as $$
begin
  update organizations
  set plan = NEW.plan, updated_at = now()
  where id = NEW.organization_id;
  return NEW;
end;
$$;

create trigger sync_org_plan_on_subscription
  after insert or update on subscriptions
  for each row execute function sync_org_plan();
```

- [ ] **Step 1.3: Commit**

```bash
git add types/database.ts supabase/migrations/011_subscriptions.sql
git commit -m "feat(m9): add Subscription types and 011_subscriptions migration"
```

---

## Task 2: Definição de Planos (funções puras)

**Files:**
- Create: `lib/stripe/plans.ts`
- Create: `tests/unit/stripe-plans.test.ts`

- [ ] **Step 2.1: Escrever os testes primeiro**

Crie `tests/unit/stripe-plans.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlanByPriceId,
  campaignLimit,
  creativeLimit,
  pixelLimit,
  canAccessProgrammatic,
  canAccessAiCreatives,
  canAccessAutomation,
  canAccessWhiteLabel,
  isOverLimit,
} from "@/lib/stripe/plans";
import type { OrgPlan } from "@/types/database";

describe("PLANS config", () => {
  it("free plan has correct limits", () => {
    expect(PLANS.free.campaigns).toBe(3);
    expect(PLANS.free.creatives).toBe(10);
    expect(PLANS.free.pixels).toBe(1);
  });

  it("pro plan has correct limits", () => {
    expect(PLANS.pro.campaigns).toBe(25);
    expect(PLANS.pro.creatives).toBe(100);
    expect(PLANS.pro.pixels).toBe(5);
  });

  it("agency plan has unlimited (-1) campaigns", () => {
    expect(PLANS.agency.campaigns).toBe(-1);
    expect(PLANS.agency.creatives).toBe(-1);
    expect(PLANS.agency.pixels).toBe(-1);
  });
});

describe("campaignLimit", () => {
  it("returns numeric limit for free", () => expect(campaignLimit("free")).toBe(3));
  it("returns -1 for agency (unlimited)", () => expect(campaignLimit("agency")).toBe(-1));
});

describe("canAccessProgrammatic", () => {
  it("free: false", () => expect(canAccessProgrammatic("free")).toBe(false));
  it("pro: false", () => expect(canAccessProgrammatic("pro")).toBe(false));
  it("agency: true", () => expect(canAccessProgrammatic("agency")).toBe(true));
});

describe("canAccessAiCreatives", () => {
  it("free: false", () => expect(canAccessAiCreatives("free")).toBe(false));
  it("pro: true", () => expect(canAccessAiCreatives("pro")).toBe(true));
  it("agency: true", () => expect(canAccessAiCreatives("agency")).toBe(true));
});

describe("canAccessAutomation", () => {
  it("free: false", () => expect(canAccessAutomation("free")).toBe(false));
  it("pro: true", () => expect(canAccessAutomation("pro")).toBe(true));
});

describe("canAccessWhiteLabel", () => {
  it("pro: false", () => expect(canAccessWhiteLabel("pro")).toBe(false));
  it("agency: true", () => expect(canAccessWhiteLabel("agency")).toBe(true));
});

describe("isOverLimit", () => {
  it("returns false when under limit", () => expect(isOverLimit(2, 3)).toBe(false));
  it("returns true when at limit", () => expect(isOverLimit(3, 3)).toBe(true));
  it("returns false when limit is -1 (unlimited)", () => expect(isOverLimit(9999, -1)).toBe(false));
});

describe("getPlanByPriceId", () => {
  it("returns pro for pro price id", () => {
    expect(getPlanByPriceId("price_pro_test")).toBe("pro");
  });
  it("returns agency for agency price id", () => {
    expect(getPlanByPriceId("price_agency_test")).toBe("agency");
  });
  it("returns free for unknown price id", () => {
    expect(getPlanByPriceId("price_unknown")).toBe("free");
  });
});
```

- [ ] **Step 2.2: Rodar testes — verificar que falham**

```
npx vitest run tests/unit/stripe-plans.test.ts
```

Esperado: FAIL com "Cannot find module '@/lib/stripe/plans'"

- [ ] **Step 2.3: Criar `lib/stripe/plans.ts`**

```typescript
import type { OrgPlan } from "@/types/database";

type PlanConfig = {
  name: string;
  priceMonthly: number;        // BRL cents (0 = grátis)
  stripePriceId: string;       // set via env var
  campaigns: number;           // -1 = unlimited
  creatives: number;
  pixels: number;
  features: {
    aiCreatives: boolean;
    automation: boolean;
    programmatic: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
  };
};

export const PLANS: Record<OrgPlan, PlanConfig> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: "",
    campaigns: 3,
    creatives: 10,
    pixels: 1,
    features: {
      aiCreatives: false,
      automation: false,
      programmatic: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Pro",
    priceMonthly: 50000,        // R$500,00
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_pro_test",
    campaigns: 25,
    creatives: 100,
    pixels: 5,
    features: {
      aiCreatives: true,
      automation: true,
      programmatic: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  agency: {
    name: "Agency",
    priceMonthly: 300000,       // R$3.000,00
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID ?? "price_agency_test",
    campaigns: -1,
    creatives: -1,
    pixels: -1,
    features: {
      aiCreatives: true,
      automation: true,
      programmatic: true,
      whiteLabel: true,
      prioritySupport: true,
    },
  },
};

// ── Limit helpers ─────────────────────────────────────────────────────────────

export function campaignLimit(plan: OrgPlan): number {
  return PLANS[plan].campaigns;
}

export function creativeLimit(plan: OrgPlan): number {
  return PLANS[plan].creatives;
}

export function pixelLimit(plan: OrgPlan): number {
  return PLANS[plan].pixels;
}

/** Returns true when current usage is AT or ABOVE the plan limit. -1 means unlimited. */
export function isOverLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}

// ── Feature gate helpers ──────────────────────────────────────────────────────

export function canAccessAiCreatives(plan: OrgPlan): boolean {
  return PLANS[plan].features.aiCreatives;
}

export function canAccessAutomation(plan: OrgPlan): boolean {
  return PLANS[plan].features.automation;
}

export function canAccessProgrammatic(plan: OrgPlan): boolean {
  return PLANS[plan].features.programmatic;
}

export function canAccessWhiteLabel(plan: OrgPlan): boolean {
  return PLANS[plan].features.whiteLabel;
}

// ── Stripe price ID lookup ────────────────────────────────────────────────────

export function getPlanByPriceId(priceId: string): OrgPlan {
  if (priceId === PLANS.pro.stripePriceId) return "pro";
  if (priceId === PLANS.agency.stripePriceId) return "agency";
  return "free";
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatPlanPrice(plan: OrgPlan): string {
  const { priceMonthly } = PLANS[plan];
  if (priceMonthly === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(priceMonthly / 100);
}

export function formatLimit(limit: number): string {
  return limit === -1 ? "Ilimitado" : String(limit);
}
```

- [ ] **Step 2.4: Rodar testes — verificar que passam**

```
npx vitest run tests/unit/stripe-plans.test.ts
```

Esperado: todos os testes PASS

- [ ] **Step 2.5: Commit**

```bash
git add lib/stripe/plans.ts tests/unit/stripe-plans.test.ts
git commit -m "feat(m9): add Stripe plan definitions and feature gate helpers"
```

---

## Task 3: Stripe Client Singleton

**Files:**
- Create: `lib/stripe/client.ts`

- [ ] **Step 3.1: Instalar Stripe SDK**

```
npm install stripe
```

Esperado: stripe adicionado em `package.json`.

- [ ] **Step 3.2: Criar `lib/stripe/client.ts`**

```typescript
import Stripe from "stripe";

// Singleton — reutilizado em todos os route handlers server-side.
// Nunca importar em Client Components.
let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }

  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-04-30.basil",
    });
  }

  return _stripe;
}

/** Retorna true quando o Stripe está configurado (chave presente). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
```

- [ ] **Step 3.3: Commit**

```bash
git add lib/stripe/client.ts package.json package-lock.json
git commit -m "feat(m9): add Stripe singleton client"
```

---

## Task 4: Webhook Handlers (funções puras)

**Files:**
- Create: `lib/stripe/webhooks.ts`
- Create: `tests/unit/stripe-webhooks.test.ts`

- [ ] **Step 4.1: Escrever testes dos handlers primeiro**

Crie `tests/unit/stripe-webhooks.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from "@/lib/stripe/webhooks";
import type { SubscriptionUpsertPayload, SubscriptionDeletePayload } from "@/lib/stripe/webhooks";

const basePayload: SubscriptionUpsertPayload = {
  organizationId: "org-123",
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test",
  plan: "pro",
  status: "active",
  currentPeriodStart: "2026-05-01T00:00:00Z",
  currentPeriodEnd: "2026-06-01T00:00:00Z",
  cancelAtPeriodEnd: false,
};

describe("handleCheckoutCompleted", () => {
  it("returns upsert payload with plan from price id", () => {
    const result = handleCheckoutCompleted({
      organizationId: "org-123",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: "price_pro_test",
      currentPeriodStart: "2026-05-01T00:00:00Z",
      currentPeriodEnd: "2026-06-01T00:00:00Z",
    });
    expect(result.plan).toBe("pro");
    expect(result.status).toBe("active");
    expect(result.organizationId).toBe("org-123");
  });
});

describe("handleSubscriptionUpdated", () => {
  it("returns payload with updated plan and status", () => {
    const result = handleSubscriptionUpdated({
      ...basePayload,
      plan: "agency",
      status: "active",
    });
    expect(result.plan).toBe("agency");
    expect(result.status).toBe("active");
  });

  it("preserves cancelAtPeriodEnd flag", () => {
    const result = handleSubscriptionUpdated({
      ...basePayload,
      cancelAtPeriodEnd: true,
    });
    expect(result.cancelAtPeriodEnd).toBe(true);
  });
});

describe("handleSubscriptionDeleted", () => {
  it("returns delete payload with organizationId", () => {
    const result = handleSubscriptionDeleted({
      organizationId: "org-123",
      stripeSubscriptionId: "sub_test",
    });
    expect(result.organizationId).toBe("org-123");
    expect(result.action).toBe("downgrade_to_free");
  });
});

describe("handlePaymentFailed", () => {
  it("returns notification payload", () => {
    const result = handlePaymentFailed({
      organizationId: "org-123",
      stripeCustomerId: "cus_test",
      amountDue: 50000,
    });
    expect(result.organizationId).toBe("org-123");
    expect(result.severity).toBe("warning");
  });
});
```

- [ ] **Step 4.2: Rodar testes — verificar que falham**

```
npx vitest run tests/unit/stripe-webhooks.test.ts
```

Esperado: FAIL com "Cannot find module '@/lib/stripe/webhooks'"

- [ ] **Step 4.3: Criar `lib/stripe/webhooks.ts`**

```typescript
import { getPlanByPriceId } from "@/lib/stripe/plans";
import type { OrgPlan, SubscriptionStatus } from "@/types/database";

// ── Input/Output types (desacoplados do Stripe SDK) ───────────────────────────

export type SubscriptionUpsertPayload = {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: OrgPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export type SubscriptionDeletePayload = {
  organizationId: string;
  stripeSubscriptionId: string;
  action: "downgrade_to_free";
};

export type PaymentFailedPayload = {
  organizationId: string;
  stripeCustomerId: string;
  amountDue: number;
  severity: "warning";
};

// ── Handler: checkout.session.completed ──────────────────────────────────────

export function handleCheckoutCompleted(input: {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}): SubscriptionUpsertPayload {
  return {
    organizationId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    plan: getPlanByPriceId(input.stripePriceId),
    status: "active",
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: false,
  };
}

// ── Handler: customer.subscription.updated ───────────────────────────────────

export function handleSubscriptionUpdated(
  payload: SubscriptionUpsertPayload
): SubscriptionUpsertPayload {
  return payload;
}

// ── Handler: customer.subscription.deleted ───────────────────────────────────

export function handleSubscriptionDeleted(input: {
  organizationId: string;
  stripeSubscriptionId: string;
}): SubscriptionDeletePayload {
  return {
    organizationId: input.organizationId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    action: "downgrade_to_free",
  };
}

// ── Handler: invoice.payment_failed ──────────────────────────────────────────

export function handlePaymentFailed(input: {
  organizationId: string;
  stripeCustomerId: string;
  amountDue: number;
}): PaymentFailedPayload {
  return {
    organizationId: input.organizationId,
    stripeCustomerId: input.stripeCustomerId,
    amountDue: input.amountDue,
    severity: "warning",
  };
}
```

- [ ] **Step 4.4: Rodar testes — verificar que passam**

```
npx vitest run tests/unit/stripe-webhooks.test.ts
```

Esperado: todos os testes PASS

- [ ] **Step 4.5: Commit**

```bash
git add lib/stripe/webhooks.ts tests/unit/stripe-webhooks.test.ts
git commit -m "feat(m9): add Stripe webhook handler functions with tests"
```

---

## Task 5: API Routes — Checkout, Portal e Webhook

**Files:**
- Create: `app/api/stripe/checkout/route.ts`
- Create: `app/api/stripe/portal/route.ts`
- Create: `app/api/stripe/webhook/route.ts`

- [ ] **Step 5.1: Criar `app/api/stripe/checkout/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth/session";
import { canAccessBilling } from "@/lib/auth/roles";
import { PLANS, isStripeConfigured } from "@/lib/stripe/plans";
import { isStripeConfigured as stripeAvailable } from "@/lib/stripe/client";
import type { OrgPlan } from "@/types/database";

// Importado dinamicamente para evitar erro quando STRIPE_SECRET_KEY não está set
async function getStripe() {
  const { getStripeClient } = await import("@/lib/stripe/client");
  return getStripeClient();
}

const bodySchema = z.object({
  plan: z.enum(["pro", "agency"]),
});

export async function POST(request: Request) {
  // Auth
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const session = await getSessionFromCookies(cookieHeader);

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!canAccessBilling(session)) {
    return NextResponse.json(
      { error: "Apenas o proprietário pode gerenciar a assinatura" },
      { status: 403 }
    );
  }

  // Validar body
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const { plan } = parsed.data;
  const priceId = PLANS[plan].stripePriceId;

  if (!priceId) {
    return NextResponse.json({ error: "Plano não configurado" }, { status: 500 });
  }

  // TODO(M9-backend): buscar organizationId real da sessão Supabase
  const organizationId = session.organization.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Fallback quando Stripe não está configurado (desenvolvimento)
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      url: `${appUrl}/settings/billing?mock_checkout=success&plan=${plan}`,
      mock: true,
    });
  }

  try {
    const stripe = await getStripe();

    // TODO(M9-backend): buscar stripe_customer_id do banco se já existir
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=canceled`,
      metadata: { organization_id: organizationId },
      subscription_data: {
        metadata: { organization_id: organizationId },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[stripe/checkout] erro:", err);
    return NextResponse.json({ error: "Erro ao criar checkout" }, { status: 500 });
  }
}
```

- [ ] **Step 5.2: Criar `app/api/stripe/portal/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth/session";
import { canAccessBilling } from "@/lib/auth/roles";

async function getStripe() {
  const { getStripeClient } = await import("@/lib/stripe/client");
  return getStripeClient();
}

export async function POST() {
  // Auth
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const session = await getSessionFromCookies(cookieHeader);

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!canAccessBilling(session)) {
    return NextResponse.json(
      { error: "Apenas o proprietário pode gerenciar a assinatura" },
      { status: 403 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Fallback para desenvolvimento
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      url: `${appUrl}/settings/billing?mock_portal=open`,
      mock: true,
    });
  }

  // TODO(M9-backend): buscar stripe_customer_id do banco via organizationId
  const stripeCustomerId = session.organization.stripe_customer_id;

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "Organização sem assinatura ativa" },
      { status: 400 }
    );
  }

  try {
    const stripe = await getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe/portal] erro:", err);
    return NextResponse.json({ error: "Erro ao abrir portal" }, { status: 500 });
  }
}
```

- [ ] **Step 5.3: Criar `app/api/stripe/webhook/route.ts`**

```typescript
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from "@/lib/stripe/webhooks";
import { getPlanByPriceId } from "@/lib/stripe/plans";

// Webhook deve ler o body raw (não parsear como JSON)
export const dynamic = "force-dynamic";

async function getStripe() {
  const { getStripeClient } = await import("@/lib/stripe/client");
  return getStripeClient();
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    // Modo dev sem Stripe: aceitar e ignorar
    return NextResponse.json({ received: true, mock: true });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = await getStripe();
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  // Idempotência: TODO(M9-backend) — verificar billing_events pelo stripe_event_id antes de processar

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const sub = session.subscription as Stripe.Subscription | string;
        const subId = typeof sub === "string" ? sub : sub.id;
        const priceId =
          typeof sub === "string"
            ? ""
            : (sub.items?.data[0]?.price?.id ?? "");

        const payload = handleCheckoutCompleted({
          organizationId: session.metadata?.organization_id ?? "",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subId,
          stripePriceId: priceId,
          currentPeriodStart:
            typeof sub === "string"
              ? new Date().toISOString()
              : new Date((sub.current_period_start ?? 0) * 1000).toISOString(),
          currentPeriodEnd:
            typeof sub === "string"
              ? new Date().toISOString()
              : new Date((sub.current_period_end ?? 0) * 1000).toISOString(),
        });

        // TODO(M9-backend): upsert em subscriptions + log em billing_events
        console.log("[stripe/webhook] checkout completed:", payload);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id ?? "";
        const status = sub.status as string;
        const validStatuses = ["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"];

        const payload = handleSubscriptionUpdated({
          organizationId: sub.metadata?.organization_id ?? "",
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          plan: getPlanByPriceId(priceId),
          status: (validStatuses.includes(status) ? status : "active") as import("@/types/database").SubscriptionStatus,
          currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });

        // TODO(M9-backend): update subscriptions + billing_events
        console.log("[stripe/webhook] subscription updated:", payload);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const payload = handleSubscriptionDeleted({
          organizationId: sub.metadata?.organization_id ?? "",
          stripeSubscriptionId: sub.id,
        });

        // TODO(M9-backend): delete/downgrade em subscriptions, set organizations.plan = 'free'
        console.log("[stripe/webhook] subscription deleted:", payload);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const payload = handlePaymentFailed({
          organizationId: (invoice.subscription_details?.metadata?.organization_id) ?? "",
          stripeCustomerId: invoice.customer as string,
          amountDue: invoice.amount_due,
        });

        // TODO(M9-backend): criar notification de pagamento falhou, update status para past_due
        console.log("[stripe/webhook] payment failed:", payload);
        break;
      }

      default:
        // Ignorar eventos não tratados
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] erro ao processar evento:", event.type, err);
    // Retornar 200 mesmo assim — Stripe vai retentar na falha de rede, não de lógica
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 5.4: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: zero erros novos.

- [ ] **Step 5.5: Commit**

```bash
git add app/api/stripe/checkout/route.ts app/api/stripe/portal/route.ts app/api/stripe/webhook/route.ts
git commit -m "feat(m9): add Stripe checkout, portal and webhook route handlers"
```

---

## Task 6: UI — Plan Badge no Sidebar

**Files:**
- Create: `components/billing/plan-badge.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 6.1: Criar `components/billing/plan-badge.tsx`**

```typescript
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/stripe/plans";
import type { OrgPlan } from "@/types/database";

const PLAN_STYLES: Record<OrgPlan, string> = {
  free: "bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]",
  pro:  "bg-[color:var(--adflow-data)]/20 text-[color:var(--adflow-data)]",
  agency: "bg-[color:var(--adflow-accent)]/20 text-[color:var(--adflow-accent)]",
};

type PlanBadgeProps = {
  plan: OrgPlan;
  className?: string;
};

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
        PLAN_STYLES[plan],
        className
      )}
    >
      {PLANS[plan].name}
    </span>
  );
}
```

- [ ] **Step 6.2: Adicionar PlanBadge no rodapé do sidebar**

Leia `components/layout/sidebar.tsx`. Encontre a função `DesktopSidebar`. Adicione antes do `</aside>` de fechamento:

```typescript
// Adicionar import no topo do arquivo:
import { PlanBadge } from "@/components/billing/plan-badge";
import { FAKE_SESSION } from "@/lib/auth/session";
import Link from "next/link";
```

E no JSX da `DesktopSidebar`, após `<SidebarNav collapsed={collapsed} />` e antes do botão de collapse:

```typescript
{/* Plan badge — footer do sidebar */}
{!collapsed && (
  <Link
    href="/settings/billing"
    className="flex items-center justify-between px-3 py-2 mx-2 mb-1 rounded-md hover:bg-[color:var(--adflow-border)] transition-colors"
  >
    <span className="text-xs text-[color:var(--adflow-fg-muted)]">Plano atual</span>
    <PlanBadge plan={FAKE_SESSION.organization.plan} />
  </Link>
)}
```

- [ ] **Step 6.3: Verificar build**

```
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6.4: Commit**

```bash
git add components/billing/plan-badge.tsx components/layout/sidebar.tsx
git commit -m "feat(m9): add PlanBadge component and integrate in sidebar footer"
```

---

## Task 7: UI — Página de Billing

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`
- Create: `app/(dashboard)/settings/billing/page.tsx`
- Create: `components/billing/plan-card.tsx`
- Create: `components/billing/usage-meter.tsx`
- Create: `components/billing/upgrade-modal.tsx`

- [ ] **Step 7.1: Criar redirect em `app/(dashboard)/settings/page.tsx`**

```typescript
import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/settings/billing");
}
```

- [ ] **Step 7.2: Criar `components/billing/usage-meter.tsx`**

```typescript
import { cn } from "@/lib/utils";
import { formatLimit } from "@/lib/stripe/plans";

type UsageMeterProps = {
  label: string;
  current: number;
  limit: number;        // -1 = unlimited
  className?: string;
};

export function UsageMeter({ label, current, limit, className }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isWarning = pct >= 80 && !isUnlimited;
  const isDanger = pct >= 100 && !isUnlimited;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-[color:var(--adflow-fg-muted)]">{label}</span>
        <span className="font-mono text-[color:var(--adflow-fg)]">
          {current} / {formatLimit(limit)}
        </span>
      </div>
      <div className="h-1.5 bg-[color:var(--adflow-border)] rounded-full overflow-hidden">
        {!isUnlimited && (
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isDanger ? "bg-[color:var(--adflow-danger)]" :
              isWarning ? "bg-[color:var(--adflow-warning)]" :
              "bg-[color:var(--adflow-data)]"
            )}
            style={{ width: `${pct}%` }}
          />
        )}
        {isUnlimited && (
          <div className="h-full w-full bg-[color:var(--adflow-success)] opacity-40 rounded-full" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.3: Criar `components/billing/plan-card.tsx`**

```typescript
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, formatPlanPrice, formatLimit } from "@/lib/stripe/plans";
import { PlanBadge } from "@/components/billing/plan-badge";
import type { OrgPlan } from "@/types/database";

type PlanCardProps = {
  plan: OrgPlan;
  currentPlan: OrgPlan;
  onSelect: (plan: OrgPlan) => void;
  loading?: boolean;
};

const PLAN_FEATURES: Array<{ label: string; key: keyof typeof PLANS.free.features }> = [
  { label: "IA para criativos (GPT-4o)", key: "aiCreatives" },
  { label: "Automação de alertas", key: "automation" },
  { label: "Programático RTB", key: "programmatic" },
  { label: "White-label", key: "whiteLabel" },
  { label: "Suporte prioritário", key: "prioritySupport" },
];

export function PlanCard({ plan, currentPlan, onSelect, loading }: PlanCardProps) {
  const config = PLANS[plan];
  const isCurrent = plan === currentPlan;
  const isDowngrade =
    (currentPlan === "agency" && plan !== "agency") ||
    (currentPlan === "pro" && plan === "free");

  return (
    <div
      className={cn(
        "rounded-lg border p-5 flex flex-col gap-4 transition-colors",
        isCurrent
          ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/5"
          : "border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <PlanBadge plan={plan} />
          <p className="mt-2 text-xl font-semibold text-[color:var(--adflow-fg)]">
            {formatPlanPrice(plan)}
            {plan !== "free" && (
              <span className="text-sm font-normal text-[color:var(--adflow-fg-muted)]">/mês</span>
            )}
          </p>
        </div>
        {isCurrent && (
          <span className="text-xs text-[color:var(--adflow-accent)] font-medium">Atual</span>
        )}
      </div>

      <ul className="space-y-1.5 text-sm flex-1">
        <li className="text-[color:var(--adflow-fg-muted)]">
          <span className="font-mono text-[color:var(--adflow-fg)]">{formatLimit(config.campaigns)}</span>{" "}
          campanhas
        </li>
        <li className="text-[color:var(--adflow-fg-muted)]">
          <span className="font-mono text-[color:var(--adflow-fg)]">{formatLimit(config.creatives)}</span>{" "}
          criativos
        </li>
        <li className="text-[color:var(--adflow-fg-muted)]">
          <span className="font-mono text-[color:var(--adflow-fg)]">{formatLimit(config.pixels)}</span>{" "}
          pixel(s)
        </li>
        {PLAN_FEATURES.map(({ label, key }) => (
          <li key={key} className="flex items-center gap-2">
            {config.features[key] ? (
              <Check className="w-3.5 h-3.5 text-[color:var(--adflow-success)] shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-[color:var(--adflow-border)] shrink-0" />
            )}
            <span
              className={cn(
                config.features[key]
                  ? "text-[color:var(--adflow-fg)]"
                  : "text-[color:var(--adflow-fg-muted)]"
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      {!isCurrent && !isDowngrade && (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={cn(
            "w-full rounded-md py-2 text-sm font-medium transition-colors",
            "bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? "Processando…" : `Upgrade para ${config.name}`}
        </button>
      )}

      {!isCurrent && isDowngrade && (
        <p className="text-xs text-center text-[color:var(--adflow-fg-muted)]">
          Para fazer downgrade, use o portal de assinatura.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7.4: Criar `components/billing/upgrade-modal.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PlanCard } from "@/components/billing/plan-card";
import type { OrgPlan } from "@/types/database";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  currentPlan: OrgPlan;
};

export function UpgradeModal({ open, onClose, currentPlan }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<OrgPlan | null>(null);

  async function handleSelect(plan: OrgPlan) {
    if (plan === "free") return;
    setLoading(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        console.error("[upgrade-modal] erro no checkout:", data.error);
        return;
      }

      onClose();
      router.push(data.url);
    } finally {
      setLoading(null);
    }
  }

  const plans: OrgPlan[] = ["free", "pro", "agency"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)]">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--adflow-fg)]">
            Escolha o plano certo para sua agência
          </DialogTitle>
          <DialogDescription className="text-[color:var(--adflow-fg-muted)]">
            Sem fidelidade. Cancele quando quiser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={handleSelect}
              loading={loading === plan}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7.5: Criar `app/(dashboard)/settings/billing/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { FAKE_SESSION } from "@/lib/auth/session";
import { PLANS, campaignLimit, creativeLimit, pixelLimit, formatPlanPrice } from "@/lib/stripe/plans";
import { PlanBadge } from "@/components/billing/plan-badge";
import { UsageMeter } from "@/components/billing/usage-meter";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

// Mock usage counters — TODO(M9-backend): fetch from Supabase
const MOCK_USAGE = { campaigns: 2, creatives: 7, pixels: 1 };

export default function BillingPage() {
  const params = useSearchParams();
  const session = FAKE_SESSION;
  const plan = session.organization.plan;
  const planConfig = PLANS[plan];

  const checkoutStatus = params.get("checkout");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">Assinatura & Billing</h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)]">
          Gerencie seu plano e informações de pagamento.
        </p>
      </div>

      {/* Status feedback */}
      {checkoutStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-sm text-[color:var(--adflow-success)]">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Plano atualizado com sucesso!
        </div>
      )}
      {checkoutStatus === "canceled" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-[color:var(--adflow-warning)]/10 border border-[color:var(--adflow-warning)]/30 text-sm text-[color:var(--adflow-warning)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Checkout cancelado. Nenhuma cobrança foi feita.
        </div>
      )}

      {/* Plano atual */}
      <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wide mb-1">
              Plano atual
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-[color:var(--adflow-fg)]">
                {planConfig.name}
              </span>
              <PlanBadge plan={plan} />
            </div>
            <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
              {formatPlanPrice(plan)}{plan !== "free" ? "/mês" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {plan !== "free" && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:border-[color:var(--adflow-muted)] transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-3 h-3" />
                {portalLoading ? "Abrindo…" : "Gerenciar assinatura"}
              </button>
            )}
            {plan !== "agency" && (
              <button
                onClick={() => setUpgradeOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
              >
                <CreditCard className="w-3 h-3" />
                Fazer upgrade
              </button>
            )}
          </div>
        </div>

        {/* Uso do período */}
        <div className="border-t border-[color:var(--adflow-border)] pt-4 space-y-3">
          <p className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wide">
            Uso do período
          </p>
          <UsageMeter
            label="Campanhas"
            current={MOCK_USAGE.campaigns}
            limit={campaignLimit(plan)}
          />
          <UsageMeter
            label="Criativos"
            current={MOCK_USAGE.creatives}
            limit={creativeLimit(plan)}
          />
          <UsageMeter
            label="Pixels"
            current={MOCK_USAGE.pixels}
            limit={pixelLimit(plan)}
          />
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={plan}
      />
    </div>
  );
}
```

- [ ] **Step 7.6: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 7.7: Commit**

```bash
git add app/(dashboard)/settings/ components/billing/plan-card.tsx components/billing/usage-meter.tsx components/billing/upgrade-modal.tsx
git commit -m "feat(m9): add billing page, plan cards, usage meters and upgrade modal"
```

---

## Task 8: Feature Gate — Upgrade Banner

**Files:**
- Create: `components/billing/upgrade-banner.tsx`

- [ ] **Step 8.1: Criar `components/billing/upgrade-banner.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { FAKE_SESSION } from "@/lib/auth/session";
import type { OrgPlan } from "@/types/database";

type UpgradeBannerProps = {
  feature: string;
  requiredPlan: OrgPlan;
};

export function UpgradeBanner({ feature, requiredPlan }: UpgradeBannerProps) {
  const [open, setOpen] = useState(false);
  const currentPlan = FAKE_SESSION.organization.plan;
  const planLabel = requiredPlan === "agency" ? "Agency" : "Pro";

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-[color:var(--adflow-border)] flex items-center justify-center">
          <Lock className="w-5 h-5 text-[color:var(--adflow-fg-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">
            {feature} requer o plano {planLabel}
          </p>
          <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
            Faça upgrade para desbloquear esta funcionalidade.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-4 py-2 rounded-md bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
        >
          Ver planos
        </button>
      </div>
      <UpgradeModal open={open} onClose={() => setOpen(false)} currentPlan={currentPlan} />
    </>
  );
}
```

- [ ] **Step 8.2: Aplicar feature gate na página de Programático**

Abra `app/(dashboard)/campaigns/programmatic/page.tsx`. Adicione no topo do arquivo (após os imports existentes):

```typescript
import { canAccessProgrammatic } from "@/lib/stripe/plans";
import { UpgradeBanner } from "@/components/billing/upgrade-banner";
import { FAKE_SESSION } from "@/lib/auth/session";
```

No início da função do Server Component (antes do `return`), adicione:

```typescript
const plan = FAKE_SESSION.organization.plan;
if (!canAccessProgrammatic(plan)) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">Programático</h1>
      <UpgradeBanner feature="Programático RTB" requiredPlan="agency" />
    </div>
  );
}
```

- [ ] **Step 8.3: Verificar TypeScript**

```
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 8.4: Commit**

```bash
git add components/billing/upgrade-banner.tsx app/\(dashboard\)/campaigns/programmatic/page.tsx
git commit -m "feat(m9): add UpgradeBanner and apply programmatic feature gate"
```

---

## Task 9: Env Vars

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 9.1: Atualizar `.env.local.example`**

Adicione ao final da seção Stripe:

```bash
# Stripe Price IDs (obter no Stripe Dashboard → Products)
STRIPE_PRO_PRICE_ID=price_xxxx          # Plano Pro R$500/mês
STRIPE_AGENCY_PRICE_ID=price_xxxx       # Plano Agency R$3.000/mês
```

- [ ] **Step 9.2: Commit**

```bash
git add .env.local.example
git commit -m "chore(m9): add Stripe price ID env vars to .env.local.example"
```

---

## Task 10: Testes Unitários Completos

- [ ] **Step 10.1: Rodar toda a suite unitária**

```
npx vitest run
```

Esperado: todos os testes passando (154+ testes anteriores + novos stripe-plans + stripe-webhooks).

- [ ] **Step 10.2: Se houver falhas, investigar e corrigir antes de prosseguir**

---

## Task 11: Testes E2E

**Files:**
- Create: `tests/e2e/billing.spec.ts`

- [ ] **Step 11.1: Criar `tests/e2e/billing.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Billing page", () => {
  test.beforeEach(async ({ page }) => {
    // Dev login via cookie shortcut (mesmo padrão dos outros specs)
    await page.goto("/api/auth/dev-login");
    await page.waitForURL(/dashboard/);
  });

  test("settings redireciona para billing", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings\/billing/);
  });

  test("página de billing carrega com plano atual", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.getByText("Assinatura & Billing")).toBeVisible();
    await expect(page.getByText("Plano atual")).toBeVisible();
  });

  test("exibe badge de plano", async ({ page }) => {
    await page.goto("/settings/billing");
    // FAKE_SESSION usa plan = 'agency'
    const badge = page.getByText("Agency").first();
    await expect(badge).toBeVisible();
  });

  test("exibe medidores de uso", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.getByText("Campanhas")).toBeVisible();
    await expect(page.getByText("Criativos")).toBeVisible();
    await expect(page.getByText("Pixels")).toBeVisible();
  });

  test("plano agency não exibe botão de upgrade", async ({ page }) => {
    await page.goto("/settings/billing");
    // agency é o plano mais alto, não deve ter botão de upgrade
    await expect(page.getByRole("button", { name: /Fazer upgrade/ })).not.toBeVisible();
  });

  test("sidebar exibe badge de plano", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Plano atual")).toBeVisible();
  });
});

test.describe("Upgrade modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/api/auth/dev-login");
    await page.waitForURL(/dashboard/);
  });

  test("feature gate em programático para plano free não se aplica ao agency", async ({ page }) => {
    // FAKE_SESSION é agency, então programático deve estar acessível
    await page.goto("/campaigns/programmatic");
    // Não deve ver o UpgradeBanner
    await expect(page.getByText("requer o plano")).not.toBeVisible();
  });
});
```

- [ ] **Step 11.2: Rodar os testes E2E**

```
npx playwright test tests/e2e/billing.spec.ts
```

Esperado: todos os testes passando.

- [ ] **Step 11.3: Se houver falha, investigar seletores e ajustar**

O padrão dos outros specs E2E usa `await page.goto("/api/auth/dev-login")` para autenticação. Se o selector de badge não encontrar, ajustar o texto esperado conforme o que o componente renderiza.

- [ ] **Step 11.4: Commit final**

```bash
git add tests/e2e/billing.spec.ts
git commit -m "test(m9): add E2E tests for billing page and upgrade modal"
```

---

## Task 12: Verificação Final

- [ ] **Step 12.1: Rodar tsc**

```
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 12.2: Rodar suite unitária completa**

```
npx vitest run
```

Esperado: todos os testes passando.

- [ ] **Step 12.3: Commit de fechamento de milestone**

```bash
git add -A
git commit -m "feat(m9): stripe monetization complete — plans, billing portal, webhooks, feature gates"
```

---

## Self-Review

### Spec coverage

| Requisito do PLAN.md | Coberto em |
|----------------------|-----------|
| `settings/billing/page.tsx` com resumo do plano | Task 7 |
| `components/billing/plan-card.tsx` | Task 7 |
| `components/billing/upgrade-modal.tsx` | Task 7 |
| `components/billing/usage-meter.tsx` | Task 7 |
| `components/billing/plan-badge.tsx` | Task 6 |
| Feature gates (programático só Agency) | Task 8 |
| Migration `011_subscriptions.sql` | Task 1 |
| `lib/stripe/client.ts` | Task 3 |
| `lib/stripe/plans.ts` + feature gates server-side | Task 2 |
| `lib/stripe/webhooks.ts` | Task 4 |
| `app/api/stripe/checkout/route.ts` | Task 5 |
| `app/api/stripe/portal/route.ts` | Task 5 |
| `app/api/stripe/webhook/route.ts` | Task 5 |
| `.env.local.example` + price IDs | Task 9 |
| E2E billing tests | Task 11 |
| Unit tests stripe-plans + stripe-webhooks | Task 2 + Task 4 |

### Consistência de tipos

- `OrgPlan` ("free" | "pro" | "agency") — definido em `types/database.ts`, usado em `plans.ts`, `plan-badge.tsx`, `plan-card.tsx`, `usage-meter.tsx`
- `Subscription` / `SubscriptionStatus` — definidos em Task 1, usados em `webhooks.ts`
- `SubscriptionUpsertPayload` / `SubscriptionDeletePayload` — exportados de `lib/stripe/webhooks.ts`, usados em `app/api/stripe/webhook/route.ts`
- `formatLimit` — exportado de `plans.ts`, usado em `plan-card.tsx` e `usage-meter.tsx`
- `FAKE_SESSION` — importado em `billing/page.tsx`, `upgrade-banner.tsx`, `plan-badge.tsx` (no sidebar)

### Sem placeholders

Revisado — nenhum "TBD", "TODO implement" ou step sem código. Todos os `TODO(M9-backend)` são de swap-in de Supabase real, consistente com o padrão dos outros milestones.
