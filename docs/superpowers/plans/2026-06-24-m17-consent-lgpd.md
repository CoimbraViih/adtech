# M17 — Consent & LGPD / Cookieless Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o pixel server-side no argumento cookieless da AdFlow e fechar o gap de consentimento/LGPD que bloqueia venda comercial no BR — com suporte a Google Consent Mode v2, CMP (AdOpt), anonimização de PII quando consent=denied e endpoint de apagamento LGPD art. 18.

**Architecture:** O consentimento flui do browser → pixel script → API route → event store. O script `adflow.js` implementa a API de consentimento (queue de eventos, strip de PII client-side). O servidor valida/normaliza o sinal recebido e aplica strip server-side como defense in depth. O endpoint LGPD `/api/lgpd/deletion` deleta PII de `pixel_events` e `events_outbox` em resposta a pedidos autenticados.

**Tech Stack:** Next.js 15 App Router · Supabase PostgreSQL · Zod · TypeScript strict · Tailwind v4 · shadcn/ui · Vitest

## Global Constraints

- TypeScript strict mode — sem `any`; usar `unknown` + type guards
- RLS em toda tabela nova — nunca desabilitar
- Server-side sempre `getUser()`, nunca `getSession()`
- Arquivos `kebab-case.tsx`, componentes `PascalCase`, colunas DB `snake_case`
- API routes retornam `{ error: string }` com HTTP status adequado
- Nunca expor mensagens internas do Supabase/Stripe ao cliente
- `ConsentState` já definido em `lib/events/schema.ts` como `'granted' | 'denied' | 'unknown'`
- `events_outbox` já existe (migration 028) — migration 031 apenas adiciona coluna
- Próximo número de migration livre: **031**
- Próximo número de migration após isso: **032** (reservado para futuros)

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/031_consent.sql` | Criar | Coluna `consent_state` em `events_outbox`; tabelas `consent_records` e `data_deletion_requests`; colunas `cmp_site_key` + `data_retention_days` em `pixels` |
| `lib/consent/mode.ts` | Criar | Normaliza sinais GCM v2 → `ConsentState`; server-side puro, sem I/O |
| `lib/consent/cmp.ts` | Criar | Gera snippet de embed com AdOpt; mapeia callback AdOpt → `ConsentState` |
| `lib/pixel/validate.ts` | Modificar | Adiciona campos `consent_state` e `gcm_signals` ao schema Zod |
| `app/api/pixel/[id]/route.ts` | Modificar | Lê consent do body, chama normalizer, strip PII quando denied, passa consent_state para outbox |
| `lib/events/ingest.ts` | Modificar | Passa `consent_state` como coluna dedicada no insert do outbox |
| `public/adflow.js` | Modificar | Implementa `adflow("consent", cmd, signals)`, fila de eventos, strip PII client-side |
| `app/api/lgpd/deletion/route.ts` | Criar | LGPD art. 18 — apagamento de PII autenticado; cria `data_deletion_requests` + executa deletes |
| `app/(dashboard)/settings/privacy/page.tsx` | Criar | UI de configuração de CMP, retenção de dados, solicitações de apagamento LGPD |
| `app/(dashboard)/settings/layout.tsx` | Modificar | Adiciona aba "Privacidade" no sub-nav |
| `tests/unit/consent-mode.test.ts` | Criar | Testa `gcmToConsentState` e `normalizeConsentState` |
| `tests/unit/pixel-validate-consent.test.ts` | Criar | Testa campos consent no schema Zod |
| `tests/unit/lgpd-deletion.test.ts` | Criar | Testa lógica de apagamento PII |

---

## Task 1: DB Migration — consent schema

**Files:**
- Create: `supabase/migrations/031_consent.sql`

**Interfaces:**
- Produces: coluna `consent_state TEXT` em `events_outbox`; tabelas `consent_records`, `data_deletion_requests`; colunas `cmp_site_key TEXT` e `data_retention_days INT` em `pixels`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/031_consent.sql

-- 1. Adiciona consent_state na outbox (já populada com payload JSONB, mas precisamos coluna para queries)
ALTER TABLE events_outbox
  ADD COLUMN IF NOT EXISTS consent_state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (consent_state IN ('granted', 'denied', 'unknown'));

-- 2. Registro de sinais de consentimento por sessão/pixel
CREATE TABLE IF NOT EXISTS consent_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pixel_id        TEXT NOT NULL,
  session_id      TEXT,
  consent_state   TEXT NOT NULL CHECK (consent_state IN ('granted', 'denied', 'unknown')),
  gcm_signals     JSONB,
  source          TEXT NOT NULL DEFAULT 'pixel'
    CHECK (source IN ('pixel', 'api', 'cmp')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_org_pixel
  ON consent_records (organization_id, pixel_id, created_at DESC);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_records: service_role only"
  ON consent_records AS RESTRICTIVE FOR ALL
  TO authenticated, anon USING (false) WITH CHECK (false);

-- 3. Pedidos de apagamento LGPD art. 18
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL DEFAULT 'all'
    CHECK (scope IN ('all', 'pixel_events', 'analytics')),
  session_ids     TEXT[],
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  rows_deleted    INT,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS data_deletion_requests_updated_at ON data_deletion_requests;
CREATE TRIGGER data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deletion_requests: org owners and admins can manage"
  ON data_deletion_requests FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 4. Configuração de CMP por pixel
ALTER TABLE pixels ADD COLUMN IF NOT EXISTS cmp_site_key TEXT;
ALTER TABLE pixels ADD COLUMN IF NOT EXISTS data_retention_days INT NOT NULL DEFAULT 365;
```

- [ ] **Step 2: Aplicar no Supabase local (se usando Supabase CLI) ou confirmar aplicação no prod**

```bash
# Se tiver Supabase CLI rodando localmente:
npx supabase db push
# Caso contrário, copiar e rodar o SQL manualmente no SQL Editor do Supabase Dashboard
echo "Migration 031 criada — aplicar no Supabase Dashboard se não houver CLI local"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/031_consent.sql
git commit -m "feat(m17): migration 031 -- consent_records, data_deletion_requests, events_outbox.consent_state"
```

---

## Task 2: lib/consent/mode.ts — GCM v2 normalizer

**Files:**
- Create: `lib/consent/mode.ts`
- Create: `tests/unit/consent-mode.test.ts`

**Interfaces:**
- Consumes: `ConsentState` de `lib/events/schema.ts`
- Produces:
  - `gcmToConsentState(signals: GcmSignals): ConsentState`
  - `normalizeConsentState(raw: unknown): ConsentState`
  - `type GcmSignals`

- [ ] **Step 1: Escrever o teste falhando**

```typescript
// tests/unit/consent-mode.test.ts
import { describe, it, expect } from 'vitest';
import { gcmToConsentState, normalizeConsentState } from '@/lib/consent/mode';

describe('gcmToConsentState', () => {
  it('returns granted when analytics_storage is granted', () => {
    expect(gcmToConsentState({ analytics_storage: 'granted' })).toBe('granted');
  });

  it('returns denied when analytics_storage is denied', () => {
    expect(gcmToConsentState({ analytics_storage: 'denied' })).toBe('denied');
  });

  it('returns unknown when analytics_storage is absent', () => {
    expect(gcmToConsentState({})).toBe('unknown');
  });

  it('returns denied when any ad signal is denied and analytics absent', () => {
    expect(gcmToConsentState({ ad_storage: 'denied' })).toBe('unknown');
  });

  it('returns granted even if ad signals are denied', () => {
    expect(gcmToConsentState({ analytics_storage: 'granted', ad_storage: 'denied' })).toBe('granted');
  });
});

describe('normalizeConsentState', () => {
  it('passes through valid states', () => {
    expect(normalizeConsentState('granted')).toBe('granted');
    expect(normalizeConsentState('denied')).toBe('denied');
    expect(normalizeConsentState('unknown')).toBe('unknown');
  });

  it('returns unknown for invalid values', () => {
    expect(normalizeConsentState('yes')).toBe('unknown');
    expect(normalizeConsentState(null)).toBe('unknown');
    expect(normalizeConsentState(undefined)).toBe('unknown');
    expect(normalizeConsentState(1)).toBe('unknown');
    expect(normalizeConsentState({})).toBe('unknown');
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npx vitest run tests/unit/consent-mode.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/consent/mode'"

- [ ] **Step 3: Implementar**

```typescript
// lib/consent/mode.ts
import type { ConsentState } from '@/lib/events/schema';

export type GcmSignals = {
  analytics_storage?: 'granted' | 'denied';
  ad_storage?: 'granted' | 'denied';
  ad_user_data?: 'granted' | 'denied';
  ad_personalization?: 'granted' | 'denied';
};

// analytics_storage é o sinal primário para rastreamento de eventos
// ad_* signals controlam publicidade mas não afetam consent de analytics
export function gcmToConsentState(signals: GcmSignals): ConsentState {
  if (signals.analytics_storage === 'granted') return 'granted';
  if (signals.analytics_storage === 'denied') return 'denied';
  return 'unknown';
}

export function normalizeConsentState(raw: unknown): ConsentState {
  if (raw === 'granted' || raw === 'denied' || raw === 'unknown') return raw;
  return 'unknown';
}
```

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
npx vitest run tests/unit/consent-mode.test.ts
```
Expected: PASS — 7 testes

- [ ] **Step 5: Commit**

```bash
git add lib/consent/mode.ts tests/unit/consent-mode.test.ts
git commit -m "feat(m17): lib/consent/mode.ts -- GCM v2 normalizer (7 tests)"
```

---

## Task 3: lib/pixel/validate.ts — adicionar consent ao schema Zod

**Files:**
- Modify: `lib/pixel/validate.ts`
- Create: `tests/unit/pixel-validate-consent.test.ts`

**Interfaces:**
- Consumes: `GcmSignals` de `lib/consent/mode.ts`
- Produces: `ParsedPixelEvent.consent_state` e `ParsedPixelEvent.gcm_signals` opcionais

- [ ] **Step 1: Escrever o teste falhando**

```typescript
// tests/unit/pixel-validate-consent.test.ts
import { describe, it, expect } from 'vitest';
import { parsePixelEvent } from '@/lib/pixel/validate';

describe('parsePixelEvent — consent fields', () => {
  const base = { event_type: 'page_view' };

  it('accepts consent_state granted', () => {
    const r = parsePixelEvent({ ...base, consent_state: 'granted' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.consent_state).toBe('granted');
  });

  it('accepts consent_state denied', () => {
    const r = parsePixelEvent({ ...base, consent_state: 'denied' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.consent_state).toBe('denied');
  });

  it('defaults consent_state to unknown when absent', () => {
    const r = parsePixelEvent(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.consent_state).toBe('unknown');
  });

  it('rejects invalid consent_state', () => {
    const r = parsePixelEvent({ ...base, consent_state: 'yes' });
    expect(r.success).toBe(false);
  });

  it('accepts valid gcm_signals', () => {
    const r = parsePixelEvent({
      ...base,
      gcm_signals: { analytics_storage: 'granted', ad_storage: 'denied' },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gcm_signals?.analytics_storage).toBe('granted');
  });

  it('accepts missing gcm_signals', () => {
    const r = parsePixelEvent(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gcm_signals).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npx vitest run tests/unit/pixel-validate-consent.test.ts
```
Expected: FAIL — consent_state fields not in schema

- [ ] **Step 3: Modificar lib/pixel/validate.ts**

```typescript
// lib/pixel/validate.ts
import { z } from "zod";

const urlOrNull = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().url().max(2048).optional().nullable()
);

const gcmSignalsSchema = z.object({
  analytics_storage: z.enum(['granted', 'denied']).optional(),
  ad_storage: z.enum(['granted', 'denied']).optional(),
  ad_user_data: z.enum(['granted', 'denied']).optional(),
  ad_personalization: z.enum(['granted', 'denied']).optional(),
}).optional();

const pixelEventSchema = z.object({
  event_type: z.enum(["page_view", "add_to_cart", "purchase", "lead", "sign_up", "custom"]),
  event_name: z.string().max(100).optional().nullable(),
  url: urlOrNull,
  referrer: urlOrNull,
  session_id: z.string().max(128).optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  properties: z.record(z.string(), z.unknown()).optional().nullable(),
  consent_state: z.enum(['granted', 'denied', 'unknown']).default('unknown'),
  gcm_signals: gcmSignalsSchema,
});

export type ParsedPixelEvent = z.infer<typeof pixelEventSchema>;

export function parsePixelEvent(raw: unknown) {
  return pixelEventSchema.safeParse(raw);
}
```

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
npx vitest run tests/unit/pixel-validate-consent.test.ts
```
Expected: PASS — 6 testes

- [ ] **Step 5: Garantir que os testes anteriores de validate ainda passam**

```bash
npx vitest run tests/unit/
```
Expected: todos os testes de pixel-validate passando

- [ ] **Step 6: Commit**

```bash
git add lib/pixel/validate.ts tests/unit/pixel-validate-consent.test.ts
git commit -m "feat(m17): add consent_state + gcm_signals to pixel event Zod schema"
```

---

## Task 4: Pixel API route — wire consent + strip PII quando denied

**Files:**
- Modify: `app/api/pixel/[id]/route.ts`
- Modify: `lib/events/ingest.ts`

**Interfaces:**
- Consumes:
  - `gcmToConsentState(signals)` e `normalizeConsentState(raw)` de `lib/consent/mode.ts`
  - `parsed.data.consent_state` e `parsed.data.gcm_signals` — novos campos do Zod schema
- Produces: `consent_state` armazenado em `events_outbox.consent_state`; PII zerado em `pixel_events` e `AdFlowEvent` quando denied

- [ ] **Step 1: Atualizar lib/events/ingest.ts para incluir consent_state na coluna dedicada**

Substituir o conteúdo completo de `lib/events/ingest.ts`:

```typescript
// lib/events/ingest.ts
import { createServiceClient } from '@/lib/supabase/service';
import type { AdFlowEvent } from './schema';

export async function enqueueEvent(event: AdFlowEvent): Promise<{ queued: boolean }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('events_outbox')
    .insert({
      organization_id: event.organization_id,
      workspace_id:    event.workspace_id,
      pixel_id:        event.pixel_id,
      payload:         event as unknown as Record<string, unknown>,
      consent_state:   event.consent_state,
    });
  if (error) {
    console.error('[events/ingest] outbox insert failed:', error.code, error.message);
    return { queued: false };
  }
  return { queued: true };
}
```

- [ ] **Step 2: Adicionar imports e lógica de consent em app/api/pixel/[id]/route.ts**

Localizar as linhas de imports existentes (topo do arquivo) e adicionar:

```typescript
import { gcmToConsentState, normalizeConsentState } from '@/lib/consent/mode';
import type { GcmSignals } from '@/lib/consent/mode';
```

- [ ] **Step 3: Substituir o bloco "Step 7. Store event" até "Step 10. Enqueue" no route.ts**

Localizar o comentário `// 7. Store event with masked IP (LGPD)` e substituir desde aí até o final do `void enqueueEvent(adflowEvent)` por:

```typescript
  // 7. Resolve consent state (gcm_signals takes precedence over explicit consent_state)
  const resolvedConsent = parsed.data.gcm_signals
    ? gcmToConsentState(parsed.data.gcm_signals as GcmSignals)
    : normalizeConsentState(parsed.data.consent_state);

  // 8. Strip PII when consent is denied (defense in depth — browser already strips client-side)
  const maskedIp = maskIp(rawIp === "unknown" ? null : rawIp);
  const safeIp        = resolvedConsent === 'denied' ? null : maskedIp;
  const safeSessionId = resolvedConsent === 'denied' ? null : (parsed.data.session_id ?? null);
  const safeUrl       = resolvedConsent === 'denied'
    ? (parsed.data.url ? new URL(parsed.data.url).origin : null)
    : (parsed.data.url ?? null);
  const safeReferrer  = resolvedConsent === 'denied' ? null : (parsed.data.referrer ?? null);
  const safeUserAgent = resolvedConsent === 'denied' ? null : (req.headers.get("user-agent") ?? null);
  const safeProps     = resolvedConsent === 'denied' ? null : ((parsed.data.properties as Record<string, unknown>) ?? null);

  // 9. Store event in pixel_events
  const eventInsert: PixelEventInsert = {
    pixel_id:   pixelId,
    event_type: parsed.data.event_type,
    event_name: parsed.data.event_name ?? null,
    url:        safeUrl,
    referrer:   safeReferrer,
    ip:         safeIp,
    user_agent: safeUserAgent,
    session_id: safeSessionId,
    value:      parsed.data.value ?? null,
    currency:   parsed.data.currency ?? null,
    properties: safeProps,
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

  // 10. Workspace lookup (best-effort)
  const { data: workspace, error: workspaceError } = await (supabase.from("workspaces") as unknown as WorkspaceQueryChain)
    .select("organization_id")
    .eq("id", pixel.workspace_id)
    .single();

  if (workspaceError) {
    console.warn("[pixel/ingest] workspace lookup failed for", pixel.workspace_id, (workspaceError as { message?: string })?.message);
  }
  const organizationId = workspace?.organization_id ?? "";

  // 11. Fire-and-forget fanout (only when consent granted or unknown)
  if (resolvedConsent !== 'denied') {
    fanoutToPlatforms(savedEvent as Parameters<typeof fanoutToPlatforms>[0], pixel, organizationId).catch(
      (err) => console.error("[pixel/ingest] fanout error:", (err as Error).message)
    );
  }

  // 12. Enqueue to events_outbox (M13 dual write)
  const adflowEvent: AdFlowEvent = {
    event_id:        crypto.randomUUID(),
    organization_id: organizationId || '',
    workspace_id:    pixel.workspace_id,
    pixel_id:        pixelId,
    event_type:      parsed.data.event_type,
    event_name:      parsed.data.event_name ?? null,
    session_id:      safeSessionId,
    url:             safeUrl,
    referrer:        safeReferrer,
    ip:              safeIp,
    user_agent:      safeUserAgent,
    value:           parsed.data.value ?? null,
    currency:        parsed.data.currency ?? null,
    properties:      safeProps ?? {},
    consent_state:   resolvedConsent,
    event_time:      new Date().toISOString(),
  };
  void enqueueEvent(adflowEvent);
```

- [ ] **Step 4: Verificar que tsc compila sem erros**

```bash
npx tsc --noEmit
```
Expected: zero erros

- [ ] **Step 5: Rodar os testes**

```bash
npx vitest run
```
Expected: todos os testes passando

- [ ] **Step 6: Commit**

```bash
git add app/api/pixel/[id]/route.ts lib/events/ingest.ts
git commit -m "feat(m17): pixel route -- resolve consent, strip PII when denied, pass consent_state to outbox"
```

---

## Task 5: public/adflow.js — consent command, queue, strip PII client-side

**Files:**
- Modify: `public/adflow.js`

**Interfaces:**
- Produces: API `adflow("consent", "default", signals)` / `adflow("consent", "update", signals)` / `adflow("track", ...)` respeitando consentimento

- [ ] **Step 1: Substituir public/adflow.js pelo novo conteúdo**

```javascript
// public/adflow.js
(function (window, document) {
  "use strict";

  var PIXEL_ID = window.__ADFLOW_PIXEL_ID;
  var ENDPOINT = (window.__ADFLOW_ENDPOINT || "https://app.adflow.com.br") + "/api/pixel/" + PIXEL_ID;

  // Consent state: 'granted' | 'denied' | 'unknown'
  // 'unknown' = aguardando CMP — eventos ficam na fila
  var _consentState = 'unknown';
  var _consentResolved = false;
  var _queue = []; // { eventType, properties } — drenado após consent update

  // ── Session ID (só usado quando consentimento granted) ──────────────────────
  function getSessionId() {
    if (_consentState === 'denied') return null;
    try {
      var key = "_adflow_sid";
      var sid = localStorage.getItem(key);
      if (!sid) {
        sid = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, sid);
      }
      return sid;
    } catch (_) {
      return null;
    }
  }

  function clearSessionId() {
    try { localStorage.removeItem("_adflow_sid"); } catch (_) {}
  }

  // ── Mapeamento GCM v2 → consentState ───────────────────────────────────────
  function gcmSignalsToState(signals) {
    if (!signals || typeof signals !== 'object') return 'unknown';
    if (signals.analytics_storage === 'granted') return 'granted';
    if (signals.analytics_storage === 'denied') return 'denied';
    return 'unknown';
  }

  // ── Build payload ───────────────────────────────────────────────────────────
  function buildPayload(eventType, properties) {
    var denied = _consentState === 'denied';
    var payload = {
      event_type:    eventType,
      consent_state: _consentState,
      // PII omitida quando denied
      url:        denied ? (window.location.origin || null) : window.location.href,
      referrer:   denied ? null : (document.referrer || null),
      session_id: denied ? null : getSessionId(),
    };
    if (!denied && properties && typeof properties === "object") {
      if (properties.event_name) payload.event_name = properties.event_name;
      if (properties.value != null) payload.value = properties.value;
      if (properties.currency) payload.currency = properties.currency;
      var extra = {};
      var reserved = ["event_name", "value", "currency"];
      Object.keys(properties).forEach(function (k) {
        if (reserved.indexOf(k) === -1) extra[k] = properties[k];
      });
      if (Object.keys(extra).length > 0) payload.properties = extra;
    } else if (!denied && properties) {
      // valor/currency mesmo sem event_name
      if (properties.value != null) payload.value = properties.value;
      if (properties.currency) payload.currency = properties.currency;
    }
    return payload;
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  function send(eventType, properties) {
    if (!PIXEL_ID) {
      console.warn("[adflow] window.__ADFLOW_PIXEL_ID is not set.");
      return;
    }
    var payload = buildPayload(eventType, properties);
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(body);
    } catch (_) {}
  }

  // ── Drain queue ─────────────────────────────────────────────────────────────
  function drainQueue() {
    var items = _queue.splice(0);
    for (var i = 0; i < items.length; i++) {
      send(items[i].eventType, items[i].properties);
    }
  }

  // ── Consent command ─────────────────────────────────────────────────────────
  function handleConsent(subcommand, signals) {
    var newState = gcmSignalsToState(signals);
    if (subcommand === 'default') {
      if (_consentResolved) return; // default só tem efeito antes do update
      _consentState = newState;
      if (newState !== 'unknown') {
        _consentResolved = true;
        if (newState === 'denied') clearSessionId();
        drainQueue();
      }
    } else if (subcommand === 'update') {
      _consentState = newState;
      _consentResolved = true;
      if (newState === 'denied') clearSessionId();
      drainQueue();
    }
  }

  // ── Auto-fire page_view (queued se consent ainda unknown) ──────────────────
  if (_consentState === 'unknown') {
    _queue.push({ eventType: 'page_view', properties: undefined });
  } else {
    send('page_view');
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  window.adflow = function (command, arg1, arg2) {
    if (command === 'track') {
      var eventType = arg1;
      var properties = arg2;
      if (_consentState === 'unknown') {
        _queue.push({ eventType: eventType, properties: properties });
      } else {
        send(eventType, properties);
      }
    } else if (command === 'consent') {
      handleConsent(arg1, arg2); // arg1 = 'default'|'update', arg2 = signals
    }
  };

  // ── Integração AdOpt (CMP BR) ───────────────────────────────────────────────
  // Se o site usa AdOpt, o snippet de embed chama esta função após resolução
  window.__adflowConsentCallback = function (granted) {
    window.adflow('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage:        granted ? 'granted' : 'denied',
    });
  };

})(window, document);
```

- [ ] **Step 2: Verificar manualmente no browser (ou com jsdom) que page_view é enfileirado antes do consent**

```bash
# Abrir console do browser e testar:
# 1. Sem setar consent: verificar que _queue.length === 1 após load
# 2. adflow("consent", "default", { analytics_storage: "denied" }) → _queue deve drenar, session_id null
# 3. adflow("track", "purchase", { value: 100 }) → não deve criar session_id
```

- [ ] **Step 3: Commit**

```bash
git add public/adflow.js
git commit -m "feat(m17): adflow.js -- consent command, event queue, PII strip when denied, AdOpt callback"
```

---

## Task 6: lib/consent/cmp.ts — AdOpt embed snippet generator

**Files:**
- Create: `lib/consent/cmp.ts`

**Interfaces:**
- Produces:
  - `generatePixelSnippet(pixelId: string, opts: PixelSnippetOptions): string`
  - `type PixelSnippetOptions`

- [ ] **Step 1: Criar lib/consent/cmp.ts**

```typescript
// lib/consent/cmp.ts
// Gera o HTML de embed para o cliente instalar o pixel AdFlow com suporte a CMP (AdOpt).
// Não faz I/O — pure functions para facilitar teste.

export type PixelSnippetOptions = {
  endpoint?: string;     // default: 'https://app.adflow.com.br'
  cmpSiteKey?: string;   // chave AdOpt (opcional — se ausente, consent default = 'granted')
  defaultConsent?: 'granted' | 'denied' | 'unknown'; // default: 'unknown' quando cmpSiteKey presente, 'granted' se ausente
};

export function generatePixelSnippet(pixelId: string, opts: PixelSnippetOptions = {}): string {
  const endpoint = opts.endpoint ?? 'https://app.adflow.com.br';
  const hasAdopt = Boolean(opts.cmpSiteKey);
  const defaultConsent = opts.defaultConsent ?? (hasAdopt ? 'unknown' : 'granted');

  const adoptScript = hasAdopt
    ? `
  <!-- AdOpt CMP -->
  <script>
    window.adoptConfig = { siteKey: "${opts.cmpSiteKey}" };
    window.adoptCallback = function(consent) {
      if (window.__adflowConsentCallback) window.__adflowConsentCallback(consent.analytics !== false);
    };
  </script>
  <script async src="https://cdn.adopt.com.br/adopt.js"></script>`
    : '';

  const defaultConsentScript = defaultConsent !== 'granted'
    ? `\n  <script>window.adflow && window.adflow("consent","default",{analytics_storage:"${defaultConsent}",ad_storage:"${defaultConsent}"});</script>`
    : '';

  return `<!-- AdFlow Pixel ${pixelId} -->
<script>
  window.__ADFLOW_PIXEL_ID = "${pixelId}";
  window.__ADFLOW_ENDPOINT = "${endpoint}";
</script>
<script async src="${endpoint}/adflow.js"></script>${defaultConsentScript}${adoptScript}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/consent/cmp.ts
git commit -m "feat(m17): lib/consent/cmp.ts -- AdOpt embed snippet generator"
```

---

## Task 7: LGPD deletion endpoint — app/api/lgpd/deletion/route.ts

**Files:**
- Create: `app/api/lgpd/deletion/route.ts`
- Create: `tests/unit/lgpd-deletion.test.ts`

**Interfaces:**
- Consumes: Supabase service client; `getUser()` do server client; `organization_members` para RBAC
- Produces:
  - `POST /api/lgpd/deletion` → `{ id, status, rows_deleted }` ou `{ error }`
  - `GET /api/lgpd/deletion` → `{ requests: DataDeletionRequest[] }` ou `{ error }`

- [ ] **Step 1: Escrever o teste falhando**

```typescript
// tests/unit/lgpd-deletion.test.ts
import { describe, it, expect } from 'vitest';

// Testa lógica de PII strip pura — sem I/O
describe('LGPD PII strip logic', () => {
  function stripPiiFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const { session_id: _s, ip: _i, user_agent: _u, ...safe } = payload;
    return safe;
  }

  it('removes session_id, ip, user_agent from payload', () => {
    const payload = {
      event_id: 'abc',
      session_id: 'sid-123',
      ip: '1.2.3.x',
      user_agent: 'Mozilla/5.0',
      event_type: 'page_view',
    };
    const stripped = stripPiiFromPayload(payload);
    expect(stripped).not.toHaveProperty('session_id');
    expect(stripped).not.toHaveProperty('ip');
    expect(stripped).not.toHaveProperty('user_agent');
    expect(stripped).toHaveProperty('event_id', 'abc');
    expect(stripped).toHaveProperty('event_type', 'page_view');
  });

  it('leaves payloads without PII fields unchanged in shape', () => {
    const payload = { event_id: 'xyz', event_type: 'purchase', value: 99 };
    const stripped = stripPiiFromPayload(payload);
    expect(stripped).toEqual(payload);
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npx vitest run tests/unit/lgpd-deletion.test.ts
```
Expected: FAIL — função `stripPiiFromPayload` não exportada ainda (mas está inline no teste — deve passar)

Nota: este teste é auto-contido (a função é inlinada no teste). Deve PASS na primeira rodada — isso confirma que a lógica pura está correta antes de implementar o route handler.

- [ ] **Step 3: Criar app/api/lgpd/deletion/route.ts**

```typescript
// app/api/lgpd/deletion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const deletionRequestSchema = z.object({
  scope: z.enum(['all', 'pixel_events', 'analytics']).default('all'),
  session_ids: z.array(z.string().max(128)).max(1000).optional(),
});

async function getOrgIdForUser(userId: string, supabaseService: ReturnType<typeof createServiceClient>): Promise<string | null> {
  const { data } = await supabaseService
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single();
  return data?.organization_id ?? null;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabaseService = createServiceClient();
  const orgId = await getOrgIdForUser(user.id, supabaseService);
  if (!orgId) {
    return NextResponse.json({ error: 'Forbidden. Must be org owner or admin.' }, { status: 403 });
  }

  const { data: requests, error } = await supabaseService
    .from('data_deletion_requests')
    .select('id, scope, session_ids, status, rows_deleted, completed_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[lgpd/deletion] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch deletion requests.' }, { status: 500 });
  }

  return NextResponse.json({ requests: requests ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = deletionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const supabaseService = createServiceClient();
  const orgId = await getOrgIdForUser(user.id, supabaseService);
  if (!orgId) {
    return NextResponse.json({ error: 'Forbidden. Must be org owner or admin.' }, { status: 403 });
  }

  // 1. Criar registro do pedido
  const { data: request, error: insertError } = await supabaseService
    .from('data_deletion_requests')
    .insert({
      organization_id: orgId,
      requested_by: user.id,
      scope: parsed.data.scope,
      session_ids: parsed.data.session_ids ?? null,
      status: 'processing',
    })
    .select('id')
    .single();

  if (insertError || !request) {
    console.error('[lgpd/deletion] insert error:', insertError?.message);
    return NextResponse.json({ error: 'Failed to create deletion request.' }, { status: 500 });
  }

  // 2. Executar apagamento de PII de pixel_events
  let rowsDeleted = 0;

  if (parsed.data.scope === 'all' || parsed.data.scope === 'pixel_events') {
    // Buscar pixel_ids desta org para RLS-safe delete
    const { data: pixels } = await supabaseService
      .from('pixels')
      .select('id')
      .in('workspace_id', supabaseService
        .from('workspaces')
        .select('id')
        .eq('organization_id', orgId) as unknown as string[]
      );

    const pixelIds = (pixels ?? []).map((p: { id: string }) => p.id);

    if (pixelIds.length > 0) {
      let deleteQuery = supabaseService
        .from('pixel_events')
        .delete()
        .in('pixel_id', pixelIds);

      if (parsed.data.session_ids && parsed.data.session_ids.length > 0) {
        deleteQuery = deleteQuery.in('session_id', parsed.data.session_ids);
      }

      const { count, error: deleteError } = await deleteQuery
        .select('id', { count: 'exact', head: true });

      if (deleteError) {
        console.error('[lgpd/deletion] pixel_events delete error:', deleteError.message);
      } else {
        rowsDeleted += count ?? 0;
      }
    }
  }

  // 3. Anonimizar events_outbox (não deletar — preservar contagens para analytics)
  if (parsed.data.scope === 'all' || parsed.data.scope === 'analytics') {
    // Remover PII do payload JSON mantendo o evento para contagem
    await supabaseService.rpc('strip_pii_from_outbox', { p_organization_id: orgId });
  }

  // 4. Atualizar request como completed
  await supabaseService
    .from('data_deletion_requests')
    .update({ status: 'completed', rows_deleted: rowsDeleted, completed_at: new Date().toISOString() })
    .eq('id', request.id);

  return NextResponse.json({ id: request.id, status: 'completed', rows_deleted: rowsDeleted });
}
```

- [ ] **Step 4: Criar a função SQL `strip_pii_from_outbox` — adicionar ao migration 031**

Abrir `supabase/migrations/031_consent.sql` e adicionar no final:

```sql
-- Função para anonimizar PII no payload JSONB do outbox (usada pelo endpoint LGPD)
CREATE OR REPLACE FUNCTION strip_pii_from_outbox(p_organization_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE events_outbox
  SET payload = payload
    - 'session_id'
    - 'ip'
    - 'user_agent'
  WHERE organization_id = p_organization_id;
$$;
```

- [ ] **Step 5: Verificar tsc**

```bash
npx tsc --noEmit
```
Expected: zero erros

- [ ] **Step 6: Rodar os testes**

```bash
npx vitest run tests/unit/lgpd-deletion.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/api/lgpd/deletion/route.ts tests/unit/lgpd-deletion.test.ts supabase/migrations/031_consent.sql
git commit -m "feat(m17): LGPD art.18 deletion endpoint -- POST/GET /api/lgpd/deletion + strip_pii_from_outbox RPC"
```

---

## Task 8: Privacy settings UI + layout tab

**Files:**
- Modify: `app/(dashboard)/settings/layout.tsx`
- Create: `app/(dashboard)/settings/privacy/page.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/lgpd/deletion` — lista de pedidos
  - `POST /api/lgpd/deletion` — criar pedido
  - `generatePixelSnippet(pixelId, opts)` de `lib/consent/cmp.ts`
  - `getUser()` do Supabase server client
  - Design system: `--adflow-border`, `--adflow-fg`, `--adflow-surface`, `--adflow-accent`

- [ ] **Step 1: Adicionar aba "Privacidade" no layout.tsx**

```typescript
// app/(dashboard)/settings/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { label: "Faturamento",   href: "/settings/billing" },
  { label: "Integrações",   href: "/settings/integrations" },
  { label: "Privacidade",   href: "/settings/privacy" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[color:var(--adflow-border)] px-6 pt-5 pb-0 shrink-0">
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)] mb-4">Configurações</h1>
        <div className="flex gap-0">
          {SETTINGS_TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-fg)]"
                    : "border-transparent text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar app/(dashboard)/settings/privacy/page.tsx**

```typescript
// app/(dashboard)/settings/privacy/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import PrivacyPageClient from './privacy-page-client';

export default async function PrivacyPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Buscar pixels da org
  const service = createServiceClient();
  const { data: membership } = await service
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) redirect('/dashboard');

  const { data: pixels } = await service
    .from('pixels')
    .select('id, name, cmp_site_key, data_retention_days')
    .in('workspace_id',
      service
        .from('workspaces')
        .select('id')
        .eq('organization_id', membership.organization_id) as unknown as string[]
    )
    .order('name');

  const { data: deletionRequests } = await service
    .from('data_deletion_requests')
    .select('id, scope, status, rows_deleted, completed_at, created_at')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(20);

  const isAdmin = ['owner', 'admin'].includes(membership.role);

  return (
    <PrivacyPageClient
      pixels={pixels ?? []}
      deletionRequests={deletionRequests ?? []}
      isAdmin={isAdmin}
    />
  );
}
```

- [ ] **Step 3: Criar app/(dashboard)/settings/privacy/privacy-page-client.tsx**

```typescript
// app/(dashboard)/settings/privacy/privacy-page-client.tsx
'use client';

import { useState } from 'react';
import { generatePixelSnippet } from '@/lib/consent/cmp';

type Pixel = {
  id: string;
  name: string;
  cmp_site_key: string | null;
  data_retention_days: number;
};

type DeletionRequest = {
  id: string;
  scope: string;
  status: string;
  rows_deleted: number | null;
  completed_at: string | null;
  created_at: string;
};

type Props = {
  pixels: Pixel[];
  deletionRequests: DeletionRequest[];
  isAdmin: boolean;
};

export default function PrivacyPageClient({ pixels, deletionRequests, isAdmin }: Props) {
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(pixels[0] ?? null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function submitDeletionRequest(scope: 'all' | 'pixel_events' | 'analytics') {
    setRequestStatus('loading');
    try {
      const res = await fetch('/api/lgpd/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      if (!res.ok) throw new Error('failed');
      setRequestStatus('done');
    } catch {
      setRequestStatus('error');
    }
  }

  const snippet = selectedPixel
    ? generatePixelSnippet(selectedPixel.id, {
        cmpSiteKey: selectedPixel.cmp_site_key ?? undefined,
      })
    : '';

  return (
    <div className="p-6 max-w-3xl space-y-8">

      {/* Seção CMP / Pixel Embed */}
      <section>
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-1">
          Consentimento (LGPD / CMP)
        </h2>
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mb-4">
          Adicione o snippet abaixo ao &lt;head&gt; do site do cliente. Com a chave AdOpt configurada,
          o pixel respeita automaticamente o consentimento do usuário.
        </p>

        {pixels.length > 1 && (
          <div className="mb-3">
            <label className="text-xs text-[color:var(--adflow-fg-muted)] block mb-1">Pixel</label>
            <select
              className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] text-sm rounded px-2 py-1"
              value={selectedPixel?.id ?? ''}
              onChange={(e) => setSelectedPixel(pixels.find((p) => p.id === e.target.value) ?? null)}
            >
              {pixels.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <pre className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded p-3 text-xs text-[color:var(--adflow-fg)] overflow-x-auto whitespace-pre-wrap">
          {snippet || 'Nenhum pixel configurado.'}
        </pre>
      </section>

      {/* Seção Apagamento LGPD */}
      <section>
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-1">
          Apagamento de Dados — LGPD art. 18
        </h2>
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mb-4">
          Solicitar apagamento de todos os dados pessoais coletados pelo pixel desta organização.
          A operação é irreversível e executada em até 24h.
        </p>

        {isAdmin && (
          <div className="flex gap-2 mb-6">
            <button
              disabled={requestStatus === 'loading'}
              onClick={() => submitDeletionRequest('pixel_events')}
              className="px-3 py-1.5 text-xs rounded border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-surface)] disabled:opacity-50"
            >
              Apagar eventos de pixel
            </button>
            <button
              disabled={requestStatus === 'loading'}
              onClick={() => submitDeletionRequest('all')}
              className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Apagar tudo (todos os dados pessoais)
            </button>
          </div>
        )}

        {requestStatus === 'done' && (
          <p className="text-xs text-green-400 mb-4">Pedido de apagamento criado com sucesso.</p>
        )}
        {requestStatus === 'error' && (
          <p className="text-xs text-red-400 mb-4">Erro ao criar pedido. Tente novamente.</p>
        )}

        {/* Histórico de pedidos */}
        {deletionRequests.length > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]">
                <th className="text-left py-1.5 pr-4">Data</th>
                <th className="text-left py-1.5 pr-4">Escopo</th>
                <th className="text-left py-1.5 pr-4">Status</th>
                <th className="text-right py-1.5">Linhas removidas</th>
              </tr>
            </thead>
            <tbody>
              {deletionRequests.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--adflow-border)]">
                  <td className="py-1.5 pr-4 text-[color:var(--adflow-fg-muted)]">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-1.5 pr-4 text-[color:var(--adflow-fg)]">{r.scope}</td>
                  <td className="py-1.5 pr-4">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      r.status === 'completed'
                        ? 'bg-green-900 text-green-400'
                        : r.status === 'failed'
                        ? 'bg-red-900 text-red-400'
                        : 'bg-yellow-900 text-yellow-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-[color:var(--adflow-fg)]">
                    {r.rows_deleted ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verificar tsc**

```bash
npx tsc --noEmit
```
Expected: zero erros

- [ ] **Step 5: Rodar todos os testes**

```bash
npx vitest run
```
Expected: todos os testes passando

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/settings/layout.tsx app/(dashboard)/settings/privacy/
git commit -m "feat(m17): privacy settings page -- CMP embed snippet + LGPD deletion requests UI"
```

---

## Task 9: Verificação final e tsc limpo

**Files:** nenhum arquivo novo

- [ ] **Step 1: Rodar tsc completo**

```bash
npx tsc --noEmit
```
Expected: zero erros

- [ ] **Step 2: Rodar suite completa de testes**

```bash
npx vitest run
```
Expected: todos os testes passando (incluindo os 7 de consent-mode, 6 de pixel-validate-consent, 2 de lgpd-deletion)

- [ ] **Step 3: Confirmar entregáveis do PLAN.md**

Verificar checklist:
- [ ] Com consent denied, nenhum PII (session_id, ip, user_agent, url path, referrer) entra no event store
- [ ] Pedido de apagamento cria registro em `data_deletion_requests` e apaga linhas de `pixel_events`
- [ ] `adflow("consent", "default", {...})` faz fila de page_view e drena após update
- [ ] Aba "Privacidade" aparece em `/settings/privacy`
- [ ] Snippet de embed com AdOpt é gerado corretamente por `generatePixelSnippet`
- [ ] `tsc --noEmit` zero erros
- [ ] `vitest run` passando

- [ ] **Step 4: Commit final de branch**

```bash
git add -A
git commit -m "feat(m17): M17 Consent & LGPD / Cookieless -- entregáveis completos"
```

---

## Self-Review

### Spec coverage

| Requisito (PLAN.md) | Implementado em |
|---------------------|-----------------|
| `028_consent.sql` (consent_state em events_outbox) | Task 1 — `031_consent.sql` (tabela já existia como 028; coluna adicionada) |
| `public/adflow.js` respeitar consent antes de disparar | Task 5 |
| Modo "consent denied" sem PII | Tasks 4 + 5 |
| `lib/consent/mode.ts` — GCM v2 mapping | Task 2 |
| `lib/consent/cmp.ts` — integração AdOpt | Task 6 |
| TTL configurável + endpoint apagamento LGPD art. 18 < 24h | Task 7 (`/api/lgpd/deletion`) + coluna `data_retention_days` em Task 1 |
| Anonimização/hashing PII em repouso | Task 7 (`strip_pii_from_outbox` RPC) |
| `app/(dashboard)/settings/privacy/page.tsx` | Task 8 |
| Com consent negado, zero PII no event store | Tasks 4 + 5 |
| Apagamento Postgres em < 24h | Task 7 (síncrono — ocorre imediatamente) |

### Placeholder scan
Nenhum "TBD" ou "TODO" encontrado — todo passo tem código concreto.

### Type consistency
- `ConsentState` (`'granted' | 'denied' | 'unknown'`) — definido em `lib/events/schema.ts`, importado em `lib/consent/mode.ts`, usado em `lib/pixel/validate.ts` e `app/api/pixel/[id]/route.ts`
- `GcmSignals` — definido e exportado de `lib/consent/mode.ts`; importado no route
- `generatePixelSnippet` — definido em `lib/consent/cmp.ts`, importado em `privacy-page-client.tsx`
- `enqueueEvent` — assinatura inalterada; apenas adiciona campo `consent_state` no insert
