# M14 — Pixel Observability & SLO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que nenhum evento do pixel seja perdido silenciosamente e que `/api/pixel/[id]` tenha SLO medido e observável antes do deploy de produção.

**Architecture:** Dead-letter table para capturar eventos rejeitados/perdidos em vez de descartá-los silenciosamente. Wrapper de métricas estruturado (JSON para Vercel Log Drains) instrumentando latência e outcome de cada requisição ao pixel. Cron de ping sintético a cada 1 minuto que valida persistência ponta-a-ponta e dispara alerta estruturado após 2 falhas consecutivas.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + service role), Vercel Cron, Vitest, Playwright.

## Global Constraints

- TypeScript strict mode — sem `any`, usar `unknown` + type guards
- Supabase service role para todas as operações de dead-letter e sintético (bypassa RLS)
- Nunca expor mensagens de erro internas do Supabase ao cliente
- Arquivos: `kebab-case.tsx/.ts`, componentes `PascalCase`, funções `camelCase`
- Cada tarefa termina com `npm test` passando e `tsc --noEmit` zero erros
- Dead-letter writes são best-effort (try/catch, nunca bloqueiam a resposta do pixel)
- SLOs: disponibilidade ≥ 99,9% | p95 latência < 200ms | perda de evento < 0,1%

---

## Mapa de arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `supabase/migrations/027_pixel_dead_letter.sql` | Tabela dead-letter + índices + RLS |
| Modificar | `types/database.ts` | Tipos `PixelDeadLetter`, `PixelDeadLetterInsert`, `DeadLetterReason` |
| Criar | `lib/pixel/dead-letter.ts` | `writeToDeadLetter()` — helper best-effort para escrever na dead-letter |
| Criar | `lib/observability/metrics.ts` | `logPixelMetric()` — log estruturado JSON para Vercel Log Drains |
| Criar | `lib/observability/synthetic.ts` | `runSyntheticCheck()` — insere + lê evento sintético via DB direto |
| Modificar | `app/api/pixel/[id]/route.ts` | Instrumentar latência + chamar dead-letter nos pontos de falha |
| Modificar | `app/api/health/route.ts` | Health check profundo com ping ao DB, retorna 503 quando degradado |
| Criar | `app/api/cron/pixel-synthetic/route.ts` | Cron handler: roda synthetic check, detecta 2 falhas consecutivas |
| Modificar | `vercel.json` | Adicionar cron `*/1 * * * *` para `/api/cron/pixel-synthetic` |
| Modificar | `.env.local.example` | Adicionar `SYNTHETIC_PIXEL_ID` |
| Criar | `tests/unit/pixel-dead-letter.test.ts` | Testa `writeToDeadLetter` — happy path + falha silenciosa |
| Criar | `tests/unit/observability-metrics.test.ts` | Testa `logPixelMetric` — formato JSON e campos obrigatórios |
| Criar | `tests/unit/observability-synthetic.test.ts` | Testa `runSyntheticCheck` — sucesso e falha de persistência |
| Modificar | `tests/unit/pixel-route.test.ts` | Adiciona casos: dead-letter chamada em validation_failed e persistence_failed |
| Modificar | `tests/unit/health.test.ts` | Adiciona casos: 200 quando DB ok, 503 quando DB falha |
| Criar | `tests/e2e/pixel-ingestion.spec.ts` | E2E: evento enviado via API aparece no log da UI |

---

## Task 1: Migration + tipos do banco

**Files:**
- Create: `supabase/migrations/027_pixel_dead_letter.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Produz: tipos `PixelDeadLetter`, `PixelDeadLetterInsert`, `DeadLetterReason` consumidos por Tasks 2, 4 e 6

---

- [ ] **Step 1: Criar a migration**

Criar `supabase/migrations/027_pixel_dead_letter.sql` com o conteúdo:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- M14: Pixel Dead-Letter Queue
-- Eventos que falham validação ou persistência vão aqui em vez de ser descartados
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pixel_dead_letter (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id         TEXT         NOT NULL,
  organization_id  UUID,                        -- null quando pixel lookup falha
  rejection_reason TEXT         NOT NULL,        -- 'validation_failed' | 'persistence_failed' | 'synthetic_check_failed'
  event_payload    JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índice para queries de janela temporal (cron de alerta)
CREATE INDEX IF NOT EXISTS pixel_dead_letter_created_at_idx
  ON pixel_dead_letter(created_at DESC);

-- Índice para filtrar por motivo + janela de tempo (detecção de falhas consecutivas)
CREATE INDEX IF NOT EXISTS pixel_dead_letter_reason_created_idx
  ON pixel_dead_letter(rejection_reason, created_at DESC);

ALTER TABLE pixel_dead_letter ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode ler/escrever (bypassa RLS por definição)
-- A policy abaixo bloqueia anon e authenticated keys
DROP POLICY IF EXISTS "pixel_dead_letter: service role only" ON pixel_dead_letter;
CREATE POLICY "pixel_dead_letter: service role only"
  ON pixel_dead_letter
  USING (false)
  WITH CHECK (false);
```

- [ ] **Step 2: Adicionar tipos em `types/database.ts`**

Localizar o bloco `-- ─── M4: Pixel` e adicionar logo após os tipos existentes de pixel:

```typescript
// ─── M14: Pixel Dead-Letter ───────────────────────────────────────────────────

export type DeadLetterReason =
  | "validation_failed"
  | "persistence_failed"
  | "synthetic_check_failed";

export type PixelDeadLetter = {
  id: string;
  pixel_id: string;
  organization_id: string | null;
  rejection_reason: DeadLetterReason | string;
  event_payload: Record<string, unknown> | null;
  created_at: string;
};

export type PixelDeadLetterInsert = {
  pixel_id: string;
  organization_id: string | null;
  rejection_reason: DeadLetterReason;
  event_payload: unknown;
};
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/027_pixel_dead_letter.sql types/database.ts
git commit -m "feat(m14): dead-letter migration + DB types"
```

---

## Task 2: Dead-letter helper + testes

**Files:**
- Create: `lib/pixel/dead-letter.ts`
- Create: `tests/unit/pixel-dead-letter.test.ts`

**Interfaces:**
- Consome: `DeadLetterReason`, `PixelDeadLetterInsert` de `@/types/database`; `createServiceClient` de `@/lib/supabase/service`
- Produz: `writeToDeadLetter(params): Promise<void>` — consumido por Tasks 4 e 6

---

- [ ] **Step 1: Escrever o teste com falha**

Criar `tests/unit/pixel-dead-letter.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

// Import após os mocks
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

describe("writeToDeadLetter", () => {
  it("insere na tabela pixel_dead_letter com os campos corretos", async () => {
    await writeToDeadLetter({
      pixelId: "px_1",
      organizationId: "org_1",
      reason: "validation_failed",
      eventPayload: { event_type: "bad_type" },
    });

    expect(mockFrom).toHaveBeenCalledWith("pixel_dead_letter");
    expect(mockInsert).toHaveBeenCalledWith({
      pixel_id: "px_1",
      organization_id: "org_1",
      rejection_reason: "validation_failed",
      event_payload: { event_type: "bad_type" },
    });
  });

  it("aceita organization_id nulo (falha antes do lookup do pixel)", async () => {
    await writeToDeadLetter({
      pixelId: "px_2",
      organizationId: null,
      reason: "persistence_failed",
      eventPayload: null,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: null })
    );
  });

  it("não lança exceção quando o insert falha (best-effort)", async () => {
    mockInsert.mockRejectedValue(new Error("DB connection refused"));

    await expect(
      writeToDeadLetter({
        pixelId: "px_3",
        organizationId: null,
        reason: "validation_failed",
        eventPayload: {},
      })
    ).resolves.not.toThrow();
  });

  it("aceita reason 'synthetic_check_failed'", async () => {
    await writeToDeadLetter({
      pixelId: "synthetic-px",
      organizationId: null,
      reason: "synthetic_check_failed",
      eventPayload: { latencyMs: 1500, error: "DB timeout" },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rejection_reason: "synthetic_check_failed" })
    );
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
npx vitest run tests/unit/pixel-dead-letter.test.ts
```

Esperado: FAIL — "Cannot find module '@/lib/pixel/dead-letter'"

- [ ] **Step 3: Implementar `lib/pixel/dead-letter.ts`**

```typescript
import { createServiceClient } from "@/lib/supabase/service";
import type { DeadLetterReason } from "@/types/database";

export async function writeToDeadLetter(params: {
  pixelId: string;
  organizationId: string | null;
  reason: DeadLetterReason;
  eventPayload: unknown;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("pixel_dead_letter").insert({
      pixel_id: params.pixelId,
      organization_id: params.organizationId,
      rejection_reason: params.reason,
      event_payload: params.eventPayload,
    });
  } catch (err) {
    console.error("[pixel/dead-letter] write failed:", (err as Error).message);
  }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npx vitest run tests/unit/pixel-dead-letter.test.ts
```

Esperado: 4/4 passando.

- [ ] **Step 5: TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```bash
git add lib/pixel/dead-letter.ts tests/unit/pixel-dead-letter.test.ts
git commit -m "feat(m14): dead-letter helper + tests"
```

---

## Task 3: Metrics logger + testes

**Files:**
- Create: `lib/observability/metrics.ts`
- Create: `tests/unit/observability-metrics.test.ts`

**Interfaces:**
- Produz: `logPixelMetric(event: PixelMetricEvent): void` — consumido pela Task 4; `PixelOutcome` type

---

- [ ] **Step 1: Escrever o teste com falha**

Criar `tests/unit/observability-metrics.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
  consoleSpy.mockClear();
});

import { logPixelMetric } from "@/lib/observability/metrics";

describe("logPixelMetric", () => {
  it("faz console.log com JSON válido", () => {
    logPixelMetric({
      pixelId: "px_1",
      organizationId: "org_1",
      outcome: "accepted",
      latencyMs: 45,
      eventType: "page_view",
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const raw = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({
      level: "INFO",
      event: "pixel_ingest",
      pixelId: "px_1",
      organizationId: "org_1",
      outcome: "accepted",
      latencyMs: 45,
      eventType: "page_view",
    });
    expect(typeof parsed.ts).toBe("string");
  });

  it("inclui eventType undefined quando não fornecido", () => {
    logPixelMetric({
      pixelId: "px_2",
      organizationId: null,
      outcome: "rejected_not_found",
      latencyMs: 10,
    });

    const raw = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.outcome).toBe("rejected_not_found");
    expect(parsed.organizationId).toBeNull();
  });

  it("todos os valores de PixelOutcome são aceitos sem erro de tipo", () => {
    const outcomes = [
      "accepted",
      "rejected_validation",
      "rejected_rate_limit",
      "rejected_not_found",
      "rejected_cors",
      "error_persistence",
    ] as const;

    for (const outcome of outcomes) {
      expect(() =>
        logPixelMetric({ pixelId: "px_3", organizationId: null, outcome, latencyMs: 1 })
      ).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Confirmar falha**

```bash
npx vitest run tests/unit/observability-metrics.test.ts
```

Esperado: FAIL — "Cannot find module '@/lib/observability/metrics'"

- [ ] **Step 3: Criar `lib/observability/metrics.ts`**

```typescript
export type PixelOutcome =
  | "accepted"
  | "rejected_validation"
  | "rejected_rate_limit"
  | "rejected_not_found"
  | "rejected_cors"
  | "error_persistence";

export type PixelMetricEvent = {
  pixelId: string;
  organizationId: string | null;
  outcome: PixelOutcome;
  latencyMs: number;
  eventType?: string;
};

export function logPixelMetric(event: PixelMetricEvent): void {
  console.log(
    JSON.stringify({
      level: "INFO",
      event: "pixel_ingest",
      ...event,
      ts: new Date().toISOString(),
    })
  );
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npx vitest run tests/unit/observability-metrics.test.ts
```

Esperado: 3/3 passando.

- [ ] **Step 5: TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```bash
git add lib/observability/metrics.ts tests/unit/observability-metrics.test.ts
git commit -m "feat(m14): structured metrics logger + tests"
```

---

## Task 4: Instrumentar o pixel route — dead-letter + métricas

**Files:**
- Modify: `app/api/pixel/[id]/route.ts`
- Modify: `tests/unit/pixel-route.test.ts`

**Interfaces:**
- Consome: `writeToDeadLetter` de Task 2; `logPixelMetric` de Task 3
- O contrato externo do route (status codes) não muda

---

- [ ] **Step 1: Adicionar casos de teste para dead-letter em `tests/unit/pixel-route.test.ts`**

Localizar o fim do arquivo `tests/unit/pixel-route.test.ts` e adicionar os mocks e casos abaixo. Primeiro, adicionar o mock de `dead-letter` **antes** dos imports existentes (no topo do arquivo, após os outros vi.mock):

```typescript
// Adicionar junto aos outros vi.mock no início do arquivo
vi.mock("@/lib/pixel/dead-letter", () => ({
  writeToDeadLetter: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/observability/metrics", () => ({
  logPixelMetric: vi.fn(),
}));
```

Adicionar importações após os imports existentes:

```typescript
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";
import { logPixelMetric } from "@/lib/observability/metrics";
```

Adicionar os casos de teste ao describe existente:

```typescript
  it("chama writeToDeadLetter com 'validation_failed' para evento com event_type inválido", async () => {
    const req = makeRequest(PIXEL_ID, { event_type: "invalid_type" });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(400);
    expect(writeToDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "validation_failed" })
    );
  });

  it("chama writeToDeadLetter com 'persistence_failed' quando insert no DB falha", async () => {
    // Pixel lookup OK
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, domain: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    // Insert falha
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "connection refused" },
      }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "page_view" }, {
      "x-forwarded-for": "1.2.3.4",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(500);
    expect(writeToDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "persistence_failed" })
    );
  });

  it("chama logPixelMetric com outcome 'accepted' no happy path", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, domain: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ev_1", pixel_id: PIXEL_ID, event_type: "purchase", received_at: new Date().toISOString() },
        error: null,
      }),
    });
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { organization_id: "org_1" },
        error: null,
      }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "purchase" }, { "x-forwarded-for": "1.2.3.4" });
    await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });

    expect(logPixelMetric).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "accepted", eventType: "purchase" })
    );
  });
```

- [ ] **Step 2: Rodar os testes para confirmar que os novos casos falham**

```bash
npx vitest run tests/unit/pixel-route.test.ts
```

Esperado: os 3 novos casos FAIL, os 4 existentes PASS.

- [ ] **Step 3: Atualizar `app/api/pixel/[id]/route.ts`**

Substituir o conteúdo completo do arquivo:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parsePixelEvent } from "@/lib/pixel/validate";
import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { createServiceClient } from "@/lib/supabase/service";
import { maskIp } from "@/lib/security/ip";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";
import { logPixelMetric } from "@/lib/observability/metrics";
import type { Pixel, PixelEventInsert } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// 1000 events/min per IP, 10 000 events/min per pixel_id
const ipLimiter = createRateLimiter("pixel-ip", 1000, 60_000);
const pixelLimiter = createRateLimiter("pixel-id", 10_000, 60_000);

const PIXEL_PAYLOAD_LIMIT = 10 * 1024; // 10 KB

function corsHeaders(origin: string | null, allowedDomain: string | null) {
  const allowOrigin =
    !allowedDomain || origin === allowedDomain ? (origin ?? "*") : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  const { id: pixelId } = await ctx.params;
  const origin = req.headers.get("origin");

  const supabase = createServiceClient();
  type PixelQuery = {
    select: (cols?: string) => PixelQuery;
    eq: (col: string, val: unknown) => PixelQuery;
    single: () => Promise<{ data: Pixel | null; error: unknown }>;
  };
  const { data: pixel } = await (supabase.from("pixels") as unknown as PixelQuery)
    .select("id, domain")
    .eq("id", pixelId)
    .single();

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin, pixel?.domain ?? null),
  });
}

export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const startMs = Date.now();
  const { id: pixelId } = await ctx.params;
  const origin = req.headers.get("origin");

  // 1. Payload size guard
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (bodyText.length > PIXEL_PAYLOAD_LIMIT) {
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_rate_limit", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  // 2. IP rate limit
  const rawIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (ipLimiter(rawIp)) {
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_rate_limit", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // 3. Pixel-id rate limit
  if (pixelLimiter(pixelId)) {
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_rate_limit", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // 4. Parse JSON
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    void writeToDeadLetter({
      pixelId,
      organizationId: null,
      reason: "validation_failed",
      eventPayload: { raw: bodyText.slice(0, 200) },
    });
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_validation", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 5. Zod validation
  const parsed = parsePixelEvent(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    void writeToDeadLetter({
      pixelId,
      organizationId: null,
      reason: "validation_failed",
      eventPayload: rawBody,
    });
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_validation", latencyMs: Date.now() - startMs });
    return NextResponse.json(
      { error: `${first.path.join(".") || "body"}: ${first.message}` },
      { status: 400 }
    );
  }

  // 6. Fetch pixel + CORS check
  const supabase = createServiceClient();

  type PixelQueryChain = {
    select: (cols?: string) => PixelQueryChain;
    eq: (col: string, val: unknown) => PixelQueryChain;
    insert: (row: unknown) => PixelQueryChain;
    single: () => Promise<{ data: Pixel | null; error: unknown }>;
  };
  type EventQueryChain = {
    select: (cols?: string) => EventQueryChain;
    eq: (col: string, val: unknown) => EventQueryChain;
    insert: (row: unknown) => EventQueryChain;
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
  type WorkspaceQueryChain = {
    select: (cols?: string) => WorkspaceQueryChain;
    eq: (col: string, val: unknown) => WorkspaceQueryChain;
    single: () => Promise<{ data: { organization_id: string | null } | null; error: unknown }>;
  };

  const { data: pixel, error: pixelError } = await (supabase.from("pixels") as unknown as PixelQueryChain)
    .select("id, workspace_id, name, meta_pixel_id, google_tag_id, domain, created_at, updated_at")
    .eq("id", pixelId)
    .single();

  if (pixelError || !pixel) {
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_not_found", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Pixel not found." }, { status: 404 });
  }

  if (pixel.domain && origin !== pixel.domain) {
    logPixelMetric({ pixelId, organizationId: null, outcome: "rejected_cors", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  // 7. Store event with masked IP (LGPD)
  const maskedIp = maskIp(rawIp === "unknown" ? null : rawIp);

  const eventInsert: PixelEventInsert = {
    pixel_id: pixelId,
    event_type: parsed.data.event_type,
    event_name: parsed.data.event_name ?? null,
    url: parsed.data.url ?? null,
    referrer: parsed.data.referrer ?? null,
    ip: maskedIp,
    user_agent: req.headers.get("user-agent") ?? null,
    session_id: parsed.data.session_id ?? null,
    value: parsed.data.value ?? null,
    currency: parsed.data.currency ?? null,
    properties: (parsed.data.properties as Record<string, unknown>) ?? null,
  };

  const { data: savedEvent, error: insertError } = await (supabase.from("pixel_events") as unknown as EventQueryChain)
    .insert(eventInsert)
    .select()
    .single();

  if (insertError || !savedEvent) {
    console.error("[pixel/ingest] insert error code:", (insertError as { code?: string })?.code);
    void writeToDeadLetter({
      pixelId,
      organizationId: null,
      reason: "persistence_failed",
      eventPayload: eventInsert,
    });
    logPixelMetric({ pixelId, organizationId: null, outcome: "error_persistence", latencyMs: Date.now() - startMs });
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }

  // 8. Workspace lookup (best-effort, para fanout e métricas)
  const { data: workspace, error: workspaceError } = await (supabase.from("workspaces") as unknown as WorkspaceQueryChain)
    .select("organization_id")
    .eq("id", pixel.workspace_id)
    .single();

  if (workspaceError) {
    console.warn("[pixel/ingest] workspace lookup failed for", pixel.workspace_id, (workspaceError as { message?: string })?.message);
  }
  const organizationId = workspace?.organization_id ?? "";

  // 9. Fire-and-forget fanout
  fanoutToPlatforms(savedEvent as Parameters<typeof fanoutToPlatforms>[0], pixel, organizationId).catch(
    (err) => console.error("[pixel/ingest] fanout error:", (err as Error).message)
  );

  logPixelMetric({
    pixelId,
    organizationId: organizationId || null,
    outcome: "accepted",
    eventType: parsed.data.event_type,
    latencyMs: Date.now() - startMs,
  });

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin, pixel.domain),
  });
}
```

- [ ] **Step 4: Rodar todos os testes do pixel route**

```bash
npx vitest run tests/unit/pixel-route.test.ts
```

Esperado: 7/7 passando (4 originais + 3 novos).

- [ ] **Step 5: Rodar a suite completa**

```bash
npm test
```

Esperado: todos os testes passando.

- [ ] **Step 6: TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 7: Commit**

```bash
git add app/api/pixel/[id]/route.ts tests/unit/pixel-route.test.ts
git commit -m "feat(m14): instrument pixel route with dead-letter + metrics"
```

---

## Task 5: Deep health check

**Files:**
- Modify: `app/api/health/route.ts`
- Modify: `tests/unit/health.test.ts`

**Interfaces:**
- Consome: `createServiceClient` de `@/lib/supabase/service`
- Produz: `GET /api/health` retorna `{ status, checks: { db } }` com 200 (ok) ou 503 (degraded)

---

- [ ] **Step 1: Adicionar casos de teste no `tests/unit/health.test.ts`**

Adicionar os mocks e casos abaixo. O arquivo existente tem 2 testes básicos — manter os existentes e adicionar:

```typescript
// Adicionar no TOPO do arquivo, antes dos imports existentes:
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}));

// Adicionar como novo describe APÓS o describe existente:
describe("GET /api/health — deep check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 200 e checks.db.ok=true quando DB responde sem erro", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks.db.ok).toBe(true);
    expect(typeof body.checks.db.latencyMs).toBe("number");
  });

  it("retorna 503 e checks.db.ok=false quando DB retorna erro", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.db.ok).toBe(false);
    expect(body.checks.db.error).toBeDefined();
  });

  it("retorna 503 quando createServiceClient lança exceção", async () => {
    vi.mocked(mockSupabase.from).mockImplementation(() => {
      throw new Error("env vars missing");
    });

    const response = await GET();
    expect(response.status).toBe(503);
  });
});
```

- [ ] **Step 2: Confirmar que os novos casos falham**

```bash
npx vitest run tests/unit/health.test.ts
```

Esperado: 2 casos existentes PASS, 3 novos FAIL.

- [ ] **Step 3: Reescrever `app/api/health/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("pixels").select("id").limit(1);
    if (error) {
      return { ok: false, latencyMs: Date.now() - start, error: error.message };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

export async function GET() {
  const db = await checkDatabase();
  const allOk = db.ok;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "unknown",
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      timestamp: new Date().toISOString(),
      checks: { db },
    },
    { status: allOk ? 200 : 503 }
  );
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npx vitest run tests/unit/health.test.ts
```

Esperado: 5/5 passando.

> **Nota:** os 2 testes originais testam `body.status === "ok"` e timestamp — eles continuam passando porque quando o DB está mockado sem erro, o status é "ok".

- [ ] **Step 5: TypeScript + suite completa**

```bash
npx tsc --noEmit && npm test
```

Esperado: zero erros TypeScript; todos os testes passando.

- [ ] **Step 6: Commit**

```bash
git add app/api/health/route.ts tests/unit/health.test.ts
git commit -m "feat(m14): deep health check — DB ping + 503 on degraded"
```

---

## Task 6: Synthetic check + cron handler

**Files:**
- Create: `lib/observability/synthetic.ts`
- Create: `tests/unit/observability-synthetic.test.ts`
- Create: `app/api/cron/pixel-synthetic/route.ts`
- Modify: `vercel.json`
- Modify: `.env.local.example`

**Interfaces:**
- Consome: `createServiceClient`; `writeToDeadLetter` de Task 2
- Produz: `runSyntheticCheck(pixelId: string): Promise<SyntheticCheckResult>`
- O cron retorna 200 sempre (falha é logada, não retornada como erro HTTP — Vercel Cron não faz retry em 200)

---

- [ ] **Step 1: Escrever testes para `runSyntheticCheck`**

Criar `tests/unit/observability-synthetic.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

// Cadeia de mocks para o builder Supabase
const mockFrom = vi.fn(() => ({
  insert: mockInsert.mockReturnThis(),
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  limit: mockLimit.mockReturnThis(),
  single: mockSingle,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

import { runSyntheticCheck } from "@/lib/observability/synthetic";

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    insert: mockInsert.mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    single: mockSingle,
  });
});

describe("runSyntheticCheck", () => {
  it("retorna success=true quando insert e read funcionam", async () => {
    // Primeiro from: insert → select (sem erro)
    mockFrom
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
      // Segundo from: select → eq → limit → single (evento encontrado)
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "ev_1" }, error: null }),
      });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(true);
    expect(typeof result.latencyMs).toBe("number");
    expect(result.error).toBeUndefined();
  });

  it("retorna success=false quando insert falha", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: { message: "DB timeout" } }),
    });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB timeout");
  });

  it("retorna success=false quando evento não é encontrado após insert", async () => {
    mockFrom
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "no rows" } }),
      });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("retorna success=false e captura exceção inesperada", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("unexpected crash");
    });

    const result = await runSyntheticCheck("px_test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("unexpected crash");
  });
});
```

- [ ] **Step 2: Confirmar falha**

```bash
npx vitest run tests/unit/observability-synthetic.test.ts
```

Esperado: FAIL — "Cannot find module '@/lib/observability/synthetic'"

- [ ] **Step 3: Criar `lib/observability/synthetic.ts`**

```typescript
import { createServiceClient } from "@/lib/supabase/service";

export type SyntheticCheckResult = {
  success: boolean;
  latencyMs: number;
  error?: string;
};

export async function runSyntheticCheck(pixelId: string): Promise<SyntheticCheckResult> {
  const start = Date.now();
  const sessionId = `synthetic-${Date.now()}`;

  try {
    const supabase = createServiceClient();

    // Insere evento sintético diretamente via service role
    const { error: insertError } = await supabase.from("pixel_events").insert({
      pixel_id: pixelId,
      event_type: "page_view",
      session_id: sessionId,
      url: null,
      referrer: null,
      ip: null,
      user_agent: "synthetic-check/1.0",
      event_name: null,
      value: null,
      currency: null,
      properties: { synthetic: true },
    });

    if (insertError) {
      return { success: false, latencyMs: Date.now() - start, error: insertError.message };
    }

    // Valida que o evento foi persistido
    const { data, error: readError } = await supabase
      .from("pixel_events")
      .select("id")
      .eq("pixel_id", pixelId)
      .eq("session_id", sessionId)
      .limit(1)
      .single();

    if (readError || !data) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: readError?.message ?? "Event not found after insert",
      };
    }

    return { success: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { success: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}
```

- [ ] **Step 4: Rodar os testes do synthetic**

```bash
npx vitest run tests/unit/observability-synthetic.test.ts
```

Esperado: 4/4 passando.

- [ ] **Step 5: Criar `app/api/cron/pixel-synthetic/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { runSyntheticCheck } from "@/lib/observability/synthetic";
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Guard: apenas Vercel Cron (via CRON_SECRET) ou chamadas internas
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pixelId = process.env.SYNTHETIC_PIXEL_ID;
  if (!pixelId) {
    console.warn("[pixel/synthetic] SYNTHETIC_PIXEL_ID not set — skipping check");
    return NextResponse.json({ skipped: true });
  }

  const result = await runSyntheticCheck(pixelId);

  if (!result.success) {
    // Registra a falha na dead-letter para rastreamento de falhas consecutivas
    await writeToDeadLetter({
      pixelId,
      organizationId: null,
      reason: "synthetic_check_failed",
      eventPayload: { latencyMs: result.latencyMs, error: result.error },
    });

    // Verifica falhas consecutivas nos últimos 2 minutos
    try {
      const supabase = createServiceClient();
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("pixel_dead_letter")
        .select("id", { count: "exact", head: true })
        .eq("rejection_reason", "synthetic_check_failed")
        .gte("created_at", twoMinutesAgo);

      if (count && count >= 2) {
        // Log estruturado para Vercel Log Drains / alertas
        console.error(
          JSON.stringify({
            level: "ALERT",
            event: "pixel_synthetic_consecutive_failures",
            consecutive_failures: count,
            window_minutes: 2,
            error: result.error,
          })
        );
      }
    } catch (countErr) {
      console.error("[pixel/synthetic] failed to count consecutive failures:", (countErr as Error).message);
    }

    return NextResponse.json({
      success: false,
      latencyMs: result.latencyMs,
      error: result.error,
    });
  }

  console.log(
    JSON.stringify({
      level: "INFO",
      event: "pixel_synthetic_ok",
      latencyMs: result.latencyMs,
    })
  );

  return NextResponse.json({ success: true, latencyMs: result.latencyMs });
}
```

- [ ] **Step 6: Atualizar `vercel.json`**

Adicionar o cron do sintético ao array existente:

```json
{
  "crons": [
    {
      "path": "/api/cron/evaluate-alerts",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/pixel-synthetic",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

> **Nota:** cron `*/1 * * * *` requer Vercel Pro plan. Em Free plan, o mínimo é 1x/hora. Em dev local, o endpoint pode ser chamado manualmente via `curl`.

- [ ] **Step 7: Adicionar `SYNTHETIC_PIXEL_ID` ao `.env.local.example`**

Localizar a seção `# App` e adicionar:

```bash
# M14: Pixel Observability
SYNTHETIC_PIXEL_ID=           # UUID de um pixel existente para o ping sintético
```

- [ ] **Step 8: Rodar a suite completa**

```bash
npm test
```

Esperado: todos os testes passando.

- [ ] **Step 9: TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 10: Commit**

```bash
git add lib/observability/synthetic.ts tests/unit/observability-synthetic.test.ts app/api/cron/pixel-synthetic/route.ts vercel.json .env.local.example
git commit -m "feat(m14): synthetic check + cron handler + vercel.json"
```

---

## Task 7: E2E — pixel ingestion fim-a-fim

**Files:**
- Create: `tests/e2e/pixel-ingestion.spec.ts`

**Interfaces:**
- Consome: `GET /api/auth/dev-login` para autenticação; `POST /api/pixel/[id]` endpoint público; `/pixel/[id]` página de detalhe do pixel

---

- [ ] **Step 1: Criar `tests/e2e/pixel-ingestion.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

/**
 * E2E: pixel ingestion.
 * Estes testes verificam que a rota de ingestão responde corretamente
 * e que a UI de detalhe do pixel renderiza o log de eventos.
 * Não dependem de um pixel real no DB — usam mocks via MSW/fakeSurvey se disponível,
 * ou verificam a UI com dados mock (o estado atual do app).
 */

test.describe("Pixel ingestion API", () => {
  test("POST /api/pixel/nonexistent retorna 404", async ({ request }) => {
    const res = await request.post("/api/pixel/00000000-0000-0000-0000-000000000000", {
      data: { event_type: "page_view" },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /api/pixel/[id] com event_type inválido retorna 400", async ({ request }) => {
    const res = await request.post("/api/pixel/00000000-0000-0000-0000-000000000000", {
      data: { event_type: "invalid_type_xyz" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/pixel/[id] com payload > 10KB retorna 413", async ({ request }) => {
    const bigPayload = { event_type: "page_view", properties: { x: "a".repeat(11 * 1024) } };
    const res = await request.post("/api/pixel/any-pixel-id", {
      data: bigPayload,
    });
    expect(res.status()).toBe(413);
  });

  test("POST /api/pixel/[id] com JSON inválido retorna 400", async ({ request }) => {
    const res = await request.post("/api/pixel/any-pixel-id", {
      headers: { "Content-Type": "application/json" },
      data: "{ invalid json {{",
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Pixel detail page — event log", () => {
  async function devLogin(page: import("@playwright/test").Page, next = "/dashboard") {
    await page.goto(`/api/auth/dev-login?next=${next}`);
    await page.waitForURL(next, { timeout: 8000 });
  }

  test("página de detalhe do pixel renderiza log de eventos", async ({ page }) => {
    await devLogin(page, "/pixel");
    // Clicar no primeiro pixel da lista (mock data: "Site Principal")
    await page.getByText("Site Principal").click();
    await page.waitForURL(/\/pixel\/.+/, { timeout: 5000 });
    // A seção de evento log deve estar visível
    await expect(page.getByText(/eventos recentes|event log|log de eventos/i)).toBeVisible();
  });

  test("GET /api/health retorna status ok com campo checks.db", async ({ request }) => {
    const res = await request.get("/api/health");
    // Em ambiente de test sem DB real, pode retornar 503 — o importante é que retorne JSON válido
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("db");
  });
});
```

- [ ] **Step 2: Rodar os testes E2E**

```bash
npx playwright test tests/e2e/pixel-ingestion.spec.ts --reporter=list
```

Esperado: os 4 testes de API passam (não dependem de DB real); os 2 testes de UI passam se o dev server estiver rodando (podem ser pulados em CI sem servidor).

- [ ] **Step 3: Rodar a suite completa de unidade**

```bash
npm test
```

Esperado: todos os testes passando.

- [ ] **Step 4: TypeScript final**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Commit final**

```bash
git add tests/e2e/pixel-ingestion.spec.ts
git commit -m "feat(m14): E2E pixel ingestion tests"
```

---

## Checklist de entregáveis do M14

- [ ] Migration `027_pixel_dead_letter.sql` — tabela criada, índices, RLS service-role-only
- [ ] `lib/pixel/dead-letter.ts` — `writeToDeadLetter` best-effort, nunca lança
- [ ] `lib/observability/metrics.ts` — `logPixelMetric` com JSON estruturado
- [ ] `lib/observability/synthetic.ts` — `runSyntheticCheck` insert+readback via DB
- [ ] `app/api/pixel/[id]/route.ts` — latência medida, dead-letter chamada em falhas de validação e persistência
- [ ] `app/api/health/route.ts` — retorna 503 com `checks.db.ok=false` quando DB falha
- [ ] `app/api/cron/pixel-synthetic/route.ts` — cron autorizado por `CRON_SECRET`, alerta estruturado em 2 falhas consecutivas
- [ ] `vercel.json` — cron `*/1 * * * *` para o endpoint sintético
- [ ] `tsc --noEmit` zero erros
- [ ] `npm test` — todos os testes passando (target: ≥ 440 testes, ~15 novos)
- [ ] Evento sintético sumindo > 2 min → log `ALERT pixel_synthetic_consecutive_failures` verificável

---

## Self-review — cobertura do spec

| Requisito do spec | Task |
|-------------------|------|
| `027_pixel_dead_letter.sql` com motivo, organization_id, event_payload, created_at | Task 1 |
| Instrumentar latência e contagem de eventos aceitos/rejeitados por org | Task 3 + 4 |
| Health check profundo — DB, retorna 503 | Task 5 |
| `lib/observability/metrics.ts` — wrapper de métricas | Task 3 |
| `lib/observability/synthetic.ts` — ping sintético com validação de persistência | Task 6 |
| Cron 1x/min, alerta se falhar 2x seguidas | Task 6 |
| Dead-letter: eventos que falham validação/persistência vão para a tabela | Task 2 + 4 |
| `tests/e2e/pixel-ingestion.spec.ts` — E2E ingestão | Task 7 |
| `tests/unit/pixel-dead-letter.test.ts` — dead-letter recebe evento inválido com motivo | Task 2 |
| SLO p95 < 200ms documentado (verificado via logs estruturados) | Task 3 + 4 |
| `tsc --noEmit` zero erros; `vitest run` passando | Todos os tasks |
