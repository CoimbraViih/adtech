# M8-DMP: DMP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os dois stubs no DMP (`evaluateAudienceRules` hardcoded e `matchUserToSegments` vazio) por queries reais em `pixel_events` e `audience_segments`, fechando o loop de segmentação de audiências no bid path.

**Architecture:** Adicionamos `user_id_hash` à tabela `pixel_events` (hashed SHA-256 do `session_id`), populamos `audience_segments` com um job de batch (`buildAudienceMemberships`) que intersecta sets de usuários por regra, e `matchUserToSegments` passa a consultar `audience_segments` diretamente. A avaliação de tamanho (`evaluateAudienceRules`) também usa os dados reais para retornar a contagem de usuários distintos que satisfazem todas as regras da audiência.

**Tech Stack:** Next.js API Routes, Supabase (PostgreSQL, service role), TypeScript strict, Vitest, SHA-256 via `node:crypto`.

## Global Constraints

- TypeScript strict — sem `any`; usar `unknown` + type guards quando necessário
- RLS habilitado em todas as tabelas — nunca desabilitar
- Service role para queries cross-tenant (DMP não tem user session)
- `user_id_hash` nunca pode expor PII — usar SHA-256, nunca o valor raw
- Nunca retornar segmentos de usuários que estão em `dmp_optouts`
- Próximo número de migration disponível: `037` (036 = `036_assistant.sql`)
- Executar `npx tsc --noEmit` e `npx vitest run` antes de cada commit
- Supabase queries via `createServiceClient()` de `@/lib/supabase/service`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/037_audience_membership.sql` | **Criar** | Adiciona `user_id_hash` a `pixel_events` + índices |
| `types/database.ts` | **Modificar** | Adiciona `user_id_hash` ao `PixelEventInsert` |
| `app/api/pixel/[id]/route.ts` | **Modificar** | Computa e persiste `user_id_hash` do `session_id` |
| `lib/rtb/dmp.ts` | **Modificar** | Implementa `getUsersMatchingRule`, `evaluateAudienceRules` real, `buildAudienceMemberships`, `matchUserToSegments` real |
| `app/api/rtb/audiences/rebuild/route.ts` | **Criar** | POST para acionar rebuild de memberships do workspace |
| `tests/unit/dmp-match.test.ts` | **Reescrever** | Testes com Supabase mockado corretamente |
| `tests/unit/dmp-build.test.ts` | **Criar** | Testes para `buildAudienceMemberships` e `getUsersMatchingRule` |

---

## Task 1: Migration — `user_id_hash` em `pixel_events`

**Files:**
- Create: `supabase/migrations/037_audience_membership.sql`

**Interfaces:**
- Produces: coluna `pixel_events.user_id_hash TEXT` disponível para Tasks 2 e 3

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/037_audience_membership.sql
-- M8-DMP: adiciona user_id_hash a pixel_events para DMP segmentation

ALTER TABLE pixel_events
  ADD COLUMN IF NOT EXISTS user_id_hash TEXT;

-- Índice primário do DMP: lookup por hash
CREATE INDEX IF NOT EXISTS idx_pixel_events_user_id_hash
  ON pixel_events(user_id_hash)
  WHERE user_id_hash IS NOT NULL;

-- Índice composto para queries de regra: event_type + janela de tempo
CREATE INDEX IF NOT EXISTS idx_pixel_events_event_type_received
  ON pixel_events(event_type, received_at DESC)
  WHERE user_id_hash IS NOT NULL;

-- Índice composto para queries DMP completas: pixel_id + event_type + hash + tempo
CREATE INDEX IF NOT EXISTS idx_pixel_events_dmp
  ON pixel_events(pixel_id, event_type, user_id_hash, received_at DESC)
  WHERE user_id_hash IS NOT NULL;
```

- [ ] **Step 2: Verificar que a migration não quebra nada**

```bash
npx tsc --noEmit
```
Esperado: 0 erros (a coluna nova não quebra tipos existentes ainda)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/037_audience_membership.sql
git commit -m "feat(m8-dmp): migration 037 — user_id_hash on pixel_events"
```

---

## Task 2: Persistir `user_id_hash` no pixel ingestion

**Files:**
- Modify: `types/database.ts` (linha ~370 — tipo `PixelEventInsert`)
- Modify: `app/api/pixel/[id]/route.ts` (linha ~174 — montagem de `eventInsert`)

**Interfaces:**
- Consumes: coluna `pixel_events.user_id_hash TEXT` da Task 1
- Produces: eventos salvos com `user_id_hash` preenchido quando `session_id` está disponível

- [ ] **Step 1: Escrever o teste falhando**

Abrir `tests/unit/dmp-match.test.ts` e adicionar no topo (após os imports existentes):

```typescript
// Testa que user_id_hash é derivado do session_id
describe("hashUserId", () => {
  it("produz hash SHA-256 de 64 chars hex", () => {
    const h = hashUserId("sess_abc");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("session_id diferente → hash diferente", () => {
    expect(hashUserId("sess_1")).not.toBe(hashUserId("sess_2"));
  });

  it("mesmo session_id → mesmo hash (determinístico)", () => {
    expect(hashUserId("sess_x")).toBe(hashUserId("sess_x"));
  });

  it("string vazia → string vazia (sem crash)", () => {
    expect(hashUserId("")).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que passam (hashUserId já existe)**

```bash
npx vitest run tests/unit/dmp-match.test.ts
```
Esperado: todos os testes `hashUserId` passando (a função já existe em `lib/rtb/dmp.ts`)

- [ ] **Step 3: Adicionar `user_id_hash` ao tipo `PixelEventInsert` em `types/database.ts`**

Localizar o tipo `PixelEventInsert` (por volta da linha 365) e adicionar a propriedade:

```typescript
export type PixelEventInsert = {
  pixel_id: string;
  event_type: PixelEventType;
  event_name?: string | null;
  url?: string | null;
  referrer?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  user_id_hash?: string | null;   // ← ADICIONAR esta linha
  value?: number | null;
  currency?: string | null;
  properties?: Record<string, unknown> | null;
};
```

- [ ] **Step 4: Atualizar `app/api/pixel/[id]/route.ts` — computar e persistir `user_id_hash`**

Localizar a linha `import { maskIp } from "@/lib/security/ip";` (linha ~6) e adicionar o import de `hashUserId`:

```typescript
import { hashUserId } from "@/lib/rtb/dmp";
```

Localizar a linha ~165 onde `safeSessionId` é definido. Após a definição de `safeSessionId`, adicionar:

```typescript
const safeUserIdHash = safeSessionId ? hashUserId(safeSessionId) : null;
```

Localizar o objeto `eventInsert` (linha ~174) e adicionar `user_id_hash`:

```typescript
const eventInsert: PixelEventInsert = {
  pixel_id:      pixelId,
  event_type:    parsed.data.event_type,
  event_name:    parsed.data.event_name ?? null,
  url:           safeUrl,
  referrer:      safeReferrer,
  ip:            safeIp,
  user_agent:    safeUserAgent,
  session_id:    safeSessionId,
  user_id_hash:  safeUserIdHash,   // ← ADICIONAR esta linha
  value:         parsed.data.value ?? null,
  currency:      parsed.data.currency ?? null,
  properties:    safeProps,
};
```

- [ ] **Step 5: Checar tipos**

```bash
npx tsc --noEmit
```
Esperado: 0 erros

- [ ] **Step 6: Commit**

```bash
git add types/database.ts app/api/pixel/[id]/route.ts
git commit -m "feat(m8-dmp): persist user_id_hash in pixel_events on ingestion"
```

---

## Task 3: Helper `getUsersMatchingRule` em `lib/rtb/dmp.ts`

**Files:**
- Modify: `lib/rtb/dmp.ts`

**Interfaces:**
- Consumes: `AudienceRule` de `@/types/database`, Supabase service client
- Produces: `getUsersMatchingRule(rule, workspaceId, supabase): Promise<Set<string>>` — set de `user_id_hash`es que satisfazem a regra

**Nota sobre operadores:**
- `eq` — tem ao menos 1 evento do `event_type` na janela
- `gte` — tem COUNT >= `rule.value` eventos do `event_type` na janela
- `lte` — tem COUNT <= `rule.value` eventos do `event_type` na janela
- `contains` — tem ao menos 1 evento com `event_name` contendo `rule.value` na janela

- [ ] **Step 1: Escrever testes falhando em `tests/unit/dmp-build.test.ts`**

Criar o arquivo:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { getUsersMatchingRule } from "@/lib/rtb/dmp";
import { createServiceClient } from "@/lib/supabase/service";
import type { AudienceRule } from "@/types/database";

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  then: unknown;
};

function makeChain(pixelData: unknown, eventData: unknown): { from: ReturnType<typeof vi.fn> } {
  let callCount = 0;
  const chain = (data: unknown): MockChain => ({
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: undefined,
  });
  
  const pixelChain: MockChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: undefined,
  };
  (pixelChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({ data: pixelData, error: null }));

  const eventChain: MockChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: undefined,
  };
  (eventChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({ data: eventData, error: null }));

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "pixels") return pixelChain;
    return eventChain;
  });

  return { from };
}

const pageViewRule: AudienceRule = {
  event_type: "page_view",
  operator: "eq",
  value: "page_view",
  lookback_days: 30,
};

const gteRule: AudienceRule = {
  event_type: "purchase",
  operator: "gte",
  value: 2,
  lookback_days: 7,
};

describe("getUsersMatchingRule", () => {
  it("retorna set vazio quando workspace não tem pixels", async () => {
    const mock = makeChain([], []);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(0);
  });

  it("retorna set vazio quando não há eventos correspondentes", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [] // sem eventos
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(0);
  });

  it("operador eq: retorna todos os users com ao menos 1 evento do tipo", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" },
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_a" }, // duplicata — deve ser deduplicado
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(2);
    expect(result.has("hash_a")).toBe(true);
    expect(result.has("hash_b")).toBe(true);
  });

  it("operador gte: inclui apenas users com count >= value", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" }, // 1 evento — abaixo de gte:2
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_b" }, // 2 eventos — satisfaz gte:2
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(gteRule, "ws_1");
    expect(result.has("hash_a")).toBe(false);
    expect(result.has("hash_b")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("ignora events com user_id_hash null", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: null },
        { user_id_hash: "hash_a" },
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await getUsersMatchingRule(pageViewRule, "ws_1");
    expect(result.size).toBe(1);
    expect(result.has("hash_a")).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha (função não existe ainda)**

```bash
npx vitest run tests/unit/dmp-build.test.ts
```
Esperado: FAIL — `getUsersMatchingRule is not a function` (ou erro de import)

- [ ] **Step 3: Implementar `getUsersMatchingRule` em `lib/rtb/dmp.ts`**

Adicionar import no topo do arquivo:

```typescript
import type { AudienceRule } from "@/types/database";
```

Adicionar a função antes de `matchUserToSegments`:

```typescript
export async function getUsersMatchingRule(
  rule: AudienceRule,
  workspaceId: string
): Promise<Set<string>> {
  const supabase = createServiceClient();

  const { data: pixels } = await supabase
    .from("pixels")
    .select("id")
    .eq("workspace_id", workspaceId);

  const pixelIds = (pixels ?? []).map((p: { id: string }) => p.id);
  if (!pixelIds.length) return new Set();

  const cutoff = new Date(
    Date.now() - rule.lookback_days * 86_400_000
  ).toISOString();

  const query = supabase
    .from("pixel_events")
    .select("user_id_hash")
    .in("pixel_id", pixelIds)
    .eq("event_type", rule.event_type)
    .gte("received_at", cutoff)
    .not("user_id_hash", "is", null);

  const { data: events } = await (
    rule.operator === "contains" && typeof rule.value === "string"
      ? query.ilike("event_name", `%${rule.value}%`)
      : query
  );

  const counts = new Map<string, number>();
  for (const ev of (events ?? []) as Array<{ user_id_hash: string | null }>) {
    if (ev.user_id_hash) {
      counts.set(ev.user_id_hash, (counts.get(ev.user_id_hash) ?? 0) + 1);
    }
  }

  const threshold = typeof rule.value === "number" ? rule.value : 1;
  const result = new Set<string>();

  for (const [hash, count] of counts) {
    if (rule.operator === "eq" || rule.operator === "contains") {
      result.add(hash);
    } else if (rule.operator === "gte" && count >= threshold) {
      result.add(hash);
    } else if (rule.operator === "lte" && count <= threshold) {
      result.add(hash);
    }
  }

  return result;
}
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
npx vitest run tests/unit/dmp-build.test.ts
```
Esperado: todos os testes `getUsersMatchingRule` PASS

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Esperado: 0 erros

- [ ] **Step 6: Commit**

```bash
git add lib/rtb/dmp.ts tests/unit/dmp-build.test.ts
git commit -m "feat(m8-dmp): getUsersMatchingRule — real pixel_events query per audience rule"
```

---

## Task 4: Implementar `evaluateAudienceRules` real

**Files:**
- Modify: `lib/rtb/dmp.ts` (substituir stub `evaluateAudienceRules`)

**Interfaces:**
- Consumes: `getUsersMatchingRule` da Task 3
- Produces: `evaluateAudienceRules(audience, workspaceId)` retorna contagem real de usuários distintos que satisfazem TODAS as regras

- [ ] **Step 1: Escrever testes falhando em `tests/unit/dmp-build.test.ts`**

Adicionar ao arquivo (após os describes existentes):

```typescript
import { evaluateAudienceRules } from "@/lib/rtb/dmp";
import type { Audience } from "@/types/database";

const baseAudience: Audience = {
  id: "aud_1",
  workspace_id: "ws_1",
  name: "Compradores",
  type: "behavioral",
  description: null,
  rules: [
    { event_type: "purchase", operator: "gte", value: 1, lookback_days: 30 },
  ],
  lookalike_source_id: null,
  size_estimate: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("evaluateAudienceRules", () => {
  it("retorna 0 quando audiência não tem regras", async () => {
    const noRules = { ...baseAudience, rules: [] };
    // Sem regras → nenhum usuário corresponde por interseção vazia
    const mock = makeChain([], []);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await evaluateAudienceRules(noRules, "ws_1");
    expect(result).toBe(0);
  });

  it("retorna contagem real de users distintos quando há 1 regra", async () => {
    const mock = makeChain(
      [{ id: "px_1" }],
      [
        { user_id_hash: "hash_a" },
        { user_id_hash: "hash_b" },
        { user_id_hash: "hash_a" },
      ]
    );
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(mock);
    const result = await evaluateAudienceRules(baseAudience, "ws_1");
    expect(result).toBe(2);
  });

  it("interseção de 2 regras retorna apenas users que satisfazem ambas", async () => {
    const twoRuleAudience: Audience = {
      ...baseAudience,
      rules: [
        { event_type: "page_view", operator: "eq", value: "page_view", lookback_days: 30 },
        { event_type: "purchase", operator: "gte", value: 1, lookback_days: 30 },
      ],
    };

    let callCount = 0;
    const from = vi.fn().mockImplementation((table: string) => {
      // Primeira chamada a pixel_events para regra 1, segunda para regra 2
      const datasets: Array<{ user_id_hash: string }[]> = [
        [{ user_id_hash: "hash_a" }, { user_id_hash: "hash_b" }, { user_id_hash: "hash_c" }],
        [{ user_id_hash: "hash_a" }, { user_id_hash: "hash_b" }],
      ];

      const chain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        then: undefined as unknown,
      };

      if (table === "pixels") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [{ id: "px_1" }], error: null }));
      } else {
        const dataIdx = callCount % 2;
        callCount++;
        const data = datasets[dataIdx] ?? [];
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data, error: null }));
      }
      return chain;
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
    const result = await evaluateAudienceRules(twoRuleAudience, "ws_1");
    // hash_a e hash_b estão em ambos os sets; hash_c só no primeiro
    expect(result).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que o teste de interseção falha (stub retorna valor errado)**

```bash
npx vitest run tests/unit/dmp-build.test.ts
```
Esperado: FAIL nos testes de `evaluateAudienceRules` (stub retorna ~9144 para aud_1)

- [ ] **Step 3: Substituir o stub em `lib/rtb/dmp.ts`**

Localizar e substituir TODA a função `evaluateAudienceRules` pelo seguinte:

```typescript
export async function evaluateAudienceRules(
  audience: Audience,
  workspaceId: string
): Promise<number> {
  if (!audience.rules.length) return 0;

  const sets = await Promise.all(
    audience.rules.map((rule) => getUsersMatchingRule(rule, workspaceId))
  );

  // Interseção: só contam usuários que satisfazem TODAS as regras
  let intersection = sets[0];
  for (let i = 1; i < sets.length; i++) {
    const next = sets[i];
    const smaller = intersection.size <= next.size ? intersection : next;
    const larger = intersection.size > next.size ? intersection : next;
    const result = new Set<string>();
    for (const hash of smaller) {
      if (larger.has(hash)) result.add(hash);
    }
    intersection = result;
  }

  return intersection.size;
}
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
npx vitest run tests/unit/dmp-build.test.ts
```
Esperado: todos os testes `evaluateAudienceRules` PASS

- [ ] **Step 5: Commit**

```bash
git add lib/rtb/dmp.ts tests/unit/dmp-build.test.ts
git commit -m "feat(m8-dmp): evaluateAudienceRules — real user count via rule intersection"
```

---

## Task 5: Implementar `buildAudienceMemberships`

**Files:**
- Modify: `lib/rtb/dmp.ts` (adicionar função exportada)

**Interfaces:**
- Consumes: `getUsersMatchingRule` da Task 3, tabelas `audiences` e `audience_segments`
- Produces: `buildAudienceMemberships(workspaceId): Promise<{ processed: number; total: number }>` — popula `audience_segments` e atualiza `size_estimate` em `audiences`

- [ ] **Step 1: Escrever testes em `tests/unit/dmp-build.test.ts`**

Adicionar ao final do arquivo:

```typescript
import { buildAudienceMemberships } from "@/lib/rtb/dmp";

describe("buildAudienceMemberships", () => {
  it("retorna { processed: 0, total: 0 } quando workspace não tem audiências", async () => {
    const from = vi.fn().mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        then: undefined as unknown,
      };
      if (table === "audiences") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [], error: null }));
      } else {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: null, error: null }));
      }
      return chain;
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
    const result = await buildAudienceMemberships("ws_empty");
    expect(result).toEqual({ processed: 0, total: 0 });
  });

  it("processa audiências e retorna totais corretos", async () => {
    const mockAudience = {
      id: "aud_1",
      workspace_id: "ws_1",
      name: "Test",
      type: "behavioral",
      description: null,
      rules: [{ event_type: "page_view", operator: "eq", value: "page_view", lookback_days: 30 }],
      lookalike_source_id: null,
      size_estimate: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    let pixelCallCount = 0;
    const from = vi.fn().mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        then: undefined as unknown,
      };

      if (table === "audiences") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [mockAudience], error: null }));
      } else if (table === "pixels") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [{ id: "px_1" }], error: null }));
      } else if (table === "pixel_events") {
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [{ user_id_hash: "hash_a" }, { user_id_hash: "hash_b" }], error: null }));
      } else {
        // audience_segments upsert e audiences update
        (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: null, error: null }));
      }
      return chain;
    });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
    const result = await buildAudienceMemberships("ws_1");
    expect(result.total).toBe(1);
    expect(result.processed).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run tests/unit/dmp-build.test.ts
```
Esperado: FAIL — `buildAudienceMemberships is not a function`

- [ ] **Step 3: Implementar `buildAudienceMemberships` em `lib/rtb/dmp.ts`**

Adicionar após `evaluateAudienceRules`:

```typescript
export async function buildAudienceMemberships(
  workspaceId: string
): Promise<{ processed: number; total: number }> {
  const supabase = createServiceClient();

  const { data: audiences } = await supabase
    .from("audiences")
    .select("*")
    .eq("workspace_id", workspaceId);

  const audienceList = (audiences ?? []) as Audience[];
  if (!audienceList.length) return { processed: 0, total: 0 };

  let processed = 0;
  const total = audienceList.length;
  const EXPIRES_DAYS = 90;

  for (const audience of audienceList) {
    try {
      // Calcular memberships
      const sets = audience.rules.length
        ? await Promise.all(audience.rules.map((r) => getUsersMatchingRule(r, workspaceId)))
        : [];

      let matchingHashes: Set<string>;
      if (!sets.length) {
        matchingHashes = new Set();
      } else {
        matchingHashes = sets[0];
        for (let i = 1; i < sets.length; i++) {
          const next = sets[i];
          const result = new Set<string>();
          for (const hash of matchingHashes) {
            if (next.has(hash)) result.add(hash);
          }
          matchingHashes = result;
        }
      }

      // Upsert em audience_segments
      if (matchingHashes.size > 0) {
        const expiresAt = new Date(
          Date.now() + EXPIRES_DAYS * 86_400_000
        ).toISOString();
        const rows = Array.from(matchingHashes).map((hash) => ({
          audience_id: audience.id,
          user_id_hash: hash,
          matched_at: new Date().toISOString(),
          expires_at: expiresAt,
        }));
        await supabase
          .from("audience_segments")
          .upsert(rows, { onConflict: "audience_id,user_id_hash" });
      }

      // Atualizar size_estimate
      await supabase
        .from("audiences")
        .update({ size_estimate: matchingHashes.size })
        .eq("id", audience.id);

      processed++;
    } catch (err) {
      console.error(`[dmp] buildAudienceMemberships error for audience ${audience.id}:`, err);
    }
  }

  return { processed, total };
}
```

- [ ] **Step 4: Rodar testes**

```bash
npx vitest run tests/unit/dmp-build.test.ts
```
Esperado: todos PASS

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Esperado: 0 erros

- [ ] **Step 6: Commit**

```bash
git add lib/rtb/dmp.ts tests/unit/dmp-build.test.ts
git commit -m "feat(m8-dmp): buildAudienceMemberships — batch job to populate audience_segments"
```

---

## Task 6: Implementar `matchUserToSegments` real

**Files:**
- Modify: `lib/rtb/dmp.ts` (substituir stub)
- Modify: `tests/unit/dmp-match.test.ts` (reescrever testes com mock correto)

**Interfaces:**
- Consumes: `audience_segments` + `audiences` + `dmp_optouts` no Supabase
- Produces: `matchUserToSegments(userId, workspaceId)` retorna IDs de audiências às quais o usuário pertence

- [ ] **Step 1: Reescrever `tests/unit/dmp-match.test.ts`**

Substituir o conteúdo INTEIRO do arquivo:

```typescript
import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { matchUserToSegments, hashUserId } from "@/lib/rtb/dmp";
import { createServiceClient } from "@/lib/supabase/service";

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: unknown;
};

function makeSegmentMock(optedOut: boolean, segmentAudienceIds: string[]) {
  const makeChain = (): MockChain => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    then: undefined,
  });

  const optoutChain = makeChain();
  optoutChain.maybeSingle.mockResolvedValue({
    data: optedOut ? { user_hash: "hashed" } : null,
    error: null,
  });

  const audiencesChain = makeChain();
  (audiencesChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({
      data: segmentAudienceIds.map((id) => ({ audience_id: id })),
      error: null,
    }));

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "dmp_optouts") return optoutChain;
    return audiencesChain;
  });

  return { from };
}

describe("matchUserToSegments", () => {
  it("retorna [] quando userId é string vazia", async () => {
    const result = await matchUserToSegments("", "ws_1");
    expect(result).toEqual([]);
  });

  it("retorna [] quando user está em dmp_optouts", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(true, ["aud_1", "aud_2"])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    expect(result).toEqual([]);
  });

  it("retorna IDs de audiências quando user tem segmentos e não está em opt-out", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(false, ["aud_1", "aud_2"])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    expect(result).toEqual(["aud_1", "aud_2"]);
  });

  it("retorna [] quando user não tem segmentos", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(false, [])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    expect(result).toEqual([]);
  });

  it("todos os valores retornados são strings", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSegmentMock(false, ["aud_1"])
    );
    const result = await matchUserToSegments("user_abc", "ws_1");
    for (const id of result) expect(typeof id).toBe("string");
  });
});

describe("hashUserId", () => {
  it("produz hash SHA-256 de 64 chars hex", () => {
    expect(hashUserId("sess_abc")).toHaveLength(64);
    expect(hashUserId("sess_abc")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("session_id diferentes → hashes diferentes", () => {
    expect(hashUserId("sess_1")).not.toBe(hashUserId("sess_2"));
  });

  it("mesmo session_id → mesmo hash", () => {
    expect(hashUserId("sess_x")).toBe(hashUserId("sess_x"));
  });

  it("string vazia → string vazia", () => {
    expect(hashUserId("")).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que os testes com mock de segmentos falham**

```bash
npx vitest run tests/unit/dmp-match.test.ts
```
Esperado: FAIL nos testes que esperam IDs de audiências (stub retorna `[]`)

- [ ] **Step 3: Substituir o stub `matchUserToSegments` em `lib/rtb/dmp.ts`**

Localizar e substituir TODA a função `matchUserToSegments`:

```typescript
export async function matchUserToSegments(
  userId: string,
  workspaceId: string
): Promise<string[]> {
  if (!userId) return [];

  const userHash = createHash("sha256").update(userId).digest("hex");
  const supabase = createServiceClient();

  // Checar opt-out
  const { data: optOut } = await supabase
    .from("dmp_optouts")
    .select("user_hash")
    .eq("user_hash", userHash)
    .maybeSingle();
  if (optOut) return [];

  // Buscar segmentos não expirados scoped ao workspace
  const now = new Date().toISOString();
  const { data: segments } = await supabase
    .from("audience_segments")
    .select("audience_id")
    .eq("user_id_hash", userHash)
    .in(
      "audience_id",
      supabase.from("audiences").select("id").eq("workspace_id", workspaceId)
    )
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  return (segments ?? []).map((s: { audience_id: string }) => s.audience_id);
}
```

**Nota:** O `.in()` com subquery pode não ser suportado diretamente pelo Supabase JS client v2. Se o type-checker reclamar, usar a abordagem alternativa: buscar audience IDs primeiro, depois filtrar.

Caso o compilador rejeite, usar:

```typescript
  // Buscar audience_ids do workspace primeiro
  const { data: audiences } = await supabase
    .from("audiences")
    .select("id")
    .eq("workspace_id", workspaceId);

  const audienceIds = (audiences ?? []).map((a: { id: string }) => a.id);
  if (!audienceIds.length) return [];

  const now = new Date().toISOString();
  const { data: segments } = await supabase
    .from("audience_segments")
    .select("audience_id")
    .eq("user_id_hash", userHash)
    .in("audience_id", audienceIds)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  return (segments ?? []).map((s: { audience_id: string }) => s.audience_id);
```

Usar a versão com dois queries separados (segunda opção), pois é mais compatível com o Supabase JS client.

- [ ] **Step 4: Atualizar os mocks do teste para a versão com dois queries**

Atualizar `makeSegmentMock` no arquivo de teste para incluir a query de `audiences`:

```typescript
function makeSegmentMock(optedOut: boolean, segmentAudienceIds: string[], workspaceAudienceIds = ["aud_1", "aud_2"]) {
  const makeChain = (): MockChain => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    then: undefined,
  });

  const optoutChain = makeChain();
  optoutChain.maybeSingle.mockResolvedValue({
    data: optedOut ? { user_hash: "hashed" } : null,
    error: null,
  });

  // Query para audiences do workspace
  const audiencesListChain = makeChain();
  (audiencesListChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({
      data: workspaceAudienceIds.map((id) => ({ id })),
      error: null,
    }));

  // Query para audience_segments
  const segmentsChain = makeChain();
  (segmentsChain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve({
      data: segmentAudienceIds.map((id) => ({ audience_id: id })),
      error: null,
    }));

  let audiencesCallCount = 0;
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "dmp_optouts") return optoutChain;
    if (table === "audiences") return audiencesListChain;
    return segmentsChain; // audience_segments
  });

  return { from };
}
```

- [ ] **Step 5: Rodar e confirmar que todos os testes passam**

```bash
npx vitest run tests/unit/dmp-match.test.ts
```
Esperado: todos PASS

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```
Esperado: 0 erros

- [ ] **Step 7: Commit**

```bash
git add lib/rtb/dmp.ts tests/unit/dmp-match.test.ts
git commit -m "feat(m8-dmp): matchUserToSegments — real audience_segments lookup"
```

---

## Task 7: API Route para acionar rebuild

**Files:**
- Create: `app/api/rtb/audiences/rebuild/route.ts`

**Interfaces:**
- Consumes: `buildAudienceMemberships` da Task 5, Supabase auth (workspace member check)
- Produces: `POST /api/rtb/audiences/rebuild` com body `{ workspace_id: string }` — retorna `{ processed, total }`

- [ ] **Step 1: Criar o arquivo**

```typescript
// app/api/rtb/audiences/rebuild/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { buildAudienceMemberships } from "@/lib/rtb/dmp";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).workspace_id !== "string"
  ) {
    return NextResponse.json({ error: "workspace_id is required." }, { status: 400 });
  }

  const workspaceId = (body as { workspace_id: string }).workspace_id;

  // Verificar que o usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const result = await buildAudienceMemberships(workspaceId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rtb/audiences/rebuild] error:", err);
    return NextResponse.json({ error: "Rebuild failed." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Esperado: 0 erros

- [ ] **Step 3: Commit**

```bash
git add app/api/rtb/audiences/rebuild/route.ts
git commit -m "feat(m8-dmp): POST /api/rtb/audiences/rebuild — manual trigger for audience membership build"
```

---

## Task 8: Verificação final e atualização do PLAN.md

**Files:**
- Modify: `CLAUDE.md` e `docs/PLAN.md` — marcar M8-DMP como Done

- [ ] **Step 1: Rodar toda a suite de testes**

```bash
npx vitest run
```
Esperado: todos passando (incluindo testes existentes de rtb-bidder e dmp-match)

- [ ] **Step 2: Type check completo**

```bash
npx tsc --noEmit
```
Esperado: 0 erros

- [ ] **Step 3: Verificar que nenhuma audiência tem migration pendente**

Confirmar que `supabase/migrations/037_audience_membership.sql` está criado e pronto para aplicar no Supabase prod.

- [ ] **Step 4: Marcar M8-DMP como Done no CLAUDE.md**

Localizar a linha:
```
| M8-DMP | DMP Completion (real audience rule evaluation) | Planned | — |
```
E substituir por:
```
| M8-DMP | DMP Completion (real audience rule evaluation) | ✅ Done | `docs/superpowers/plans/2026-06-29-m8-dmp-completion.md` |
```

- [ ] **Step 5: Commit final**

```bash
git add CLAUDE.md docs/PLAN.md
git commit -m "docs: mark M8-DMP as done in CLAUDE.md and PLAN.md"
```

---

## Resumo do que será entregue

| Componente | Antes | Depois |
|------------|-------|--------|
| `evaluateAudienceRules` | Retorna `rules.length * 3000 + id.charCodeAt(0) * 100` (fake) | Conta usuários distintos que satisfazem TODAS as regras via `pixel_events` |
| `matchUserToSegments` | Sempre retorna `[]` após opt-out check | Consulta `audience_segments` com filtro de workspace e expiração |
| `buildAudienceMemberships` | Não existia | Job batch que popula `audience_segments` e atualiza `size_estimate` em `audiences` |
| `pixel_events.user_id_hash` | Coluna não existia | SHA-256 do `session_id`, salvo no ingestion |
| `getUsersMatchingRule` | Não existia | Helper que retorna `Set<string>` de hashes por regra |
| `POST /api/rtb/audiences/rebuild` | Não existia | Endpoint para acionar rebuild manual |
| Testes | `dmp-match.test.ts` com mocks incorretos e tests falhando | Suíte reescrita + `dmp-build.test.ts` cobrindo todos os caminhos |

**Migrations a aplicar no Supabase prod após merge:**
- `037_audience_membership.sql` — adiciona `user_id_hash` + índices em `pixel_events`
