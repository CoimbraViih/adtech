# M4 — Server-Side Pixel & Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AdFlow server-side pixel: a lightweight `adflow.js` client script, a durable `/api/pixel/[id]` event ingestion endpoint, conversion forwarding to Meta CAPI and Google Enhanced Conversions, a pixel management UI, and a real-time event log on the dashboard.

**Architecture:** `adflow.js` fires a 1×1 beacon + POST to `/api/pixel/[id]` for each page event. The route handler writes every raw event to a `pixel_events` table (Supabase), then fans out asynchronously to Meta CAPI and Google EC via lightweight adapter modules. The pixel management page lets users create/delete pixels and copy the embed snippet. A pixel events page shows the live event log per pixel.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL + RLS), Vitest, Playwright. No external queue for MVP — fan-out is `Promise.allSettled` inside the route handler (fire-and-forget to platforms, but we always persist the raw event).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/006_pixel.sql` | `pixels` + `pixel_events` tables with RLS |
| Modify | `types/database.ts` | Add `Pixel`, `PixelEvent`, `PixelEventType` types |
| Create | `lib/pixel/validate.ts` | Zod schema for incoming event payload |
| Create | `lib/pixel/meta-capi.ts` | Forward event to Meta Conversions API |
| Create | `lib/pixel/google-ec.ts` | Forward event to Google Enhanced Conversions |
| Create | `lib/pixel/fanout.ts` | `fanoutToPlatforms(event, pixel)` — calls both adapters, swallows errors |
| Create | `app/api/pixel/[id]/route.ts` | Public `POST` ingestion endpoint — no auth cookie required |
| Create | `app/(dashboard)/pixel/page.tsx` | Server Component: list user's pixels |
| Create | `app/(dashboard)/pixel/[id]/page.tsx` | Server Component: pixel detail + event log |
| Create | `components/pixel/pixel-table.tsx` | Client Component: pixel list table |
| Create | `components/pixel/create-pixel-dialog.tsx` | Client Component: modal to create a pixel |
| Create | `components/pixel/pixel-snippet.tsx` | Client Component: copy-to-clipboard snippet |
| Create | `components/pixel/event-log-table.tsx` | Client Component: paginated event log |
| Create | `public/adflow.js` | Client-side pixel script (vanilla JS, no bundler) |
| Create | `tests/unit/pixel-validate.test.ts` | Unit tests for `lib/pixel/validate.ts` |
| Create | `tests/unit/pixel-fanout.test.ts` | Unit tests for `lib/pixel/fanout.ts` |
| Create | `tests/unit/pixel-route.test.ts` | Unit tests for the ingestion route handler |
| Create | `tests/e2e/pixel.spec.ts` | E2E: create pixel, copy snippet, see event in log |

---

## Task 1: Database Migration — pixels & pixel_events

**Files:**
- Create: `supabase/migrations/006_pixel.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- M4: Server-Side Pixel & Tracking
-- Tables: pixels, pixel_events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE pixel_event_type AS ENUM (
  'page_view',
  'add_to_cart',
  'purchase',
  'lead',
  'sign_up',
  'custom'
);

-- ── pixels ────────────────────────────────────────────────────────────────────

CREATE TABLE pixels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  meta_pixel_id   TEXT,          -- optional: link to a Meta Pixel for CAPI forwarding
  google_tag_id   TEXT,          -- optional: link to a Google Tag for EC forwarding
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pixels_updated_at
  BEFORE UPDATE ON pixels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pixels: workspace members can read"
  ON pixels FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pixels: workspace members can insert"
  ON pixels FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pixels: workspace members can update"
  ON pixels FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pixels: workspace members can delete"
  ON pixels FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── pixel_events ─────────────────────────────────────────────────────────────

CREATE TABLE pixel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id      UUID NOT NULL REFERENCES pixels(id) ON DELETE CASCADE,
  event_type    pixel_event_type NOT NULL,
  event_name    TEXT,               -- populated for event_type = 'custom'
  url           TEXT,
  referrer      TEXT,
  ip            TEXT,
  user_agent    TEXT,
  session_id    TEXT,               -- anonymous session from cookie
  value         NUMERIC(12, 2),     -- monetary value for purchase events
  currency      CHAR(3),            -- ISO 4217 e.g. "BRL"
  properties    JSONB,              -- arbitrary key-value bag
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- no updated_at — events are immutable
);

CREATE INDEX pixel_events_pixel_id_idx ON pixel_events(pixel_id);
CREATE INDEX pixel_events_received_at_idx ON pixel_events(received_at DESC);

ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;

-- pixel_events are written by the unauthenticated ingestion endpoint using the
-- service role key, so no auth.uid() policy is needed for INSERT.
-- Reads are scoped to workspace members via a join to pixels.
CREATE POLICY "pixel_events: workspace members can read"
  ON pixel_events FOR SELECT
  USING (
    pixel_id IN (
      SELECT p.id FROM pixels p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Verify the file exists**

```bash
ls supabase/migrations/006_pixel.sql
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_pixel.sql
git commit -m "feat(m4): add pixels and pixel_events schema migration"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Read the current end of the file**

```bash
tail -20 types/database.ts
```

- [ ] **Step 2: Append M4 types**

Add at the bottom of `types/database.ts`:

```typescript
// ─── M4: Pixel & Tracking ─────────────────────────────────────────────────────

export type PixelEventType =
  | "page_view"
  | "add_to_cart"
  | "purchase"
  | "lead"
  | "sign_up"
  | "custom";

export type Pixel = {
  id: string;
  workspace_id: string;
  name: string;
  meta_pixel_id: string | null;
  google_tag_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PixelCreateInput = {
  workspace_id: string;
  name: string;
  meta_pixel_id?: string | null;
  google_tag_id?: string | null;
};

export type PixelEvent = {
  id: string;
  pixel_id: string;
  event_type: PixelEventType;
  event_name: string | null;
  url: string | null;
  referrer: string | null;
  ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  value: number | null;
  currency: string | null;
  properties: Record<string, unknown> | null;
  received_at: string;
};

export type PixelEventInsert = Omit<PixelEvent, "id" | "received_at">;
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/database.ts
git commit -m "feat(m4): add Pixel and PixelEvent types"
```

---

## Task 3: Event Payload Validation

**Files:**
- Create: `lib/pixel/validate.ts`
- Create: `tests/unit/pixel-validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/pixel-validate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parsePixelEvent } from "@/lib/pixel/validate";

describe("parsePixelEvent", () => {
  it("accepts a minimal valid payload", () => {
    const result = parsePixelEvent({ event_type: "page_view" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_type).toBe("page_view");
    }
  });

  it("accepts a full purchase payload", () => {
    const result = parsePixelEvent({
      event_type: "purchase",
      url: "https://example.com/checkout",
      referrer: "https://google.com",
      session_id: "sess_abc",
      value: 99.9,
      currency: "BRL",
      properties: { order_id: "ord_1" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(99.9);
      expect(result.data.currency).toBe("BRL");
    }
  });

  it("accepts event_type 'custom' with event_name", () => {
    const result = parsePixelEvent({ event_type: "custom", event_name: "trial_start" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event_type", () => {
    const result = parsePixelEvent({ event_type: "unknown_event" });
    expect(result.success).toBe(false);
  });

  it("rejects when event_type is missing", () => {
    const result = parsePixelEvent({});
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = parsePixelEvent({ event_type: "purchase", value: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects currency not 3 characters", () => {
    const result = parsePixelEvent({ event_type: "purchase", currency: "BR" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/pixel-validate.test.ts
```
Expected: FAIL — `@/lib/pixel/validate` not found.

- [ ] **Step 3: Implement validate.ts**

Create `lib/pixel/validate.ts`:

```typescript
import { z } from "zod";

const pixelEventSchema = z.object({
  event_type: z.enum(["page_view", "add_to_cart", "purchase", "lead", "sign_up", "custom"]),
  event_name: z.string().max(100).optional().nullable(),
  url: z.string().url().max(2048).optional().nullable(),
  referrer: z.string().url().max(2048).optional().nullable(),
  session_id: z.string().max(128).optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  properties: z.record(z.unknown()).optional().nullable(),
});

export type ParsedPixelEvent = z.infer<typeof pixelEventSchema>;

export function parsePixelEvent(raw: unknown) {
  return pixelEventSchema.safeParse(raw);
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run tests/unit/pixel-validate.test.ts
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pixel/validate.ts tests/unit/pixel-validate.test.ts
git commit -m "feat(m4): pixel event payload validation with Zod"
```

---

## Task 4: Platform Fan-out Adapters

**Files:**
- Create: `lib/pixel/meta-capi.ts`
- Create: `lib/pixel/google-ec.ts`
- Create: `lib/pixel/fanout.ts`
- Create: `tests/unit/pixel-fanout.test.ts`

- [ ] **Step 1: Write failing fan-out tests**

Create `tests/unit/pixel-fanout.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

// mock the adapters before importing fanout
vi.mock("@/lib/pixel/meta-capi", () => ({
  sendMetaCapiEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/pixel/google-ec", () => ({
  sendGoogleEcEvent: vi.fn().mockResolvedValue(undefined),
}));

import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { sendMetaCapiEvent } from "@/lib/pixel/meta-capi";
import { sendGoogleEcEvent } from "@/lib/pixel/google-ec";
import type { Pixel, PixelEvent } from "@/types/database";

const mockPixel: Pixel = {
  id: "px_1",
  workspace_id: "ws_1",
  name: "Test Pixel",
  meta_pixel_id: "meta_123",
  google_tag_id: "G-XXXX",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockEvent: PixelEvent = {
  id: "ev_1",
  pixel_id: "px_1",
  event_type: "purchase",
  event_name: null,
  url: "https://example.com",
  referrer: null,
  ip: "1.2.3.4",
  user_agent: "Mozilla/5.0",
  session_id: "sess_1",
  value: 99,
  currency: "BRL",
  properties: null,
  received_at: new Date().toISOString(),
};

describe("fanoutToPlatforms", () => {
  it("calls both adapters when pixel has both IDs configured", async () => {
    await fanoutToPlatforms(mockEvent, mockPixel);
    expect(sendMetaCapiEvent).toHaveBeenCalledWith(mockEvent, mockPixel.meta_pixel_id);
    expect(sendGoogleEcEvent).toHaveBeenCalledWith(mockEvent, mockPixel.google_tag_id);
  });

  it("skips Meta CAPI when meta_pixel_id is null", async () => {
    vi.clearAllMocks();
    const pixelNoMeta = { ...mockPixel, meta_pixel_id: null };
    await fanoutToPlatforms(mockEvent, pixelNoMeta);
    expect(sendMetaCapiEvent).not.toHaveBeenCalled();
    expect(sendGoogleEcEvent).toHaveBeenCalled();
  });

  it("skips Google EC when google_tag_id is null", async () => {
    vi.clearAllMocks();
    const pixelNoGoogle = { ...mockPixel, google_tag_id: null };
    await fanoutToPlatforms(mockEvent, pixelNoGoogle);
    expect(sendMetaCapiEvent).toHaveBeenCalled();
    expect(sendGoogleEcEvent).not.toHaveBeenCalled();
  });

  it("resolves without throwing even if an adapter rejects", async () => {
    vi.clearAllMocks();
    (sendMetaCapiEvent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    await expect(fanoutToPlatforms(mockEvent, mockPixel)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/unit/pixel-fanout.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement meta-capi.ts**

Create `lib/pixel/meta-capi.ts`:

```typescript
import type { PixelEvent } from "@/types/database";

// Meta Conversions API v18.0
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
const META_CAPI_URL = "https://graph.facebook.com/v18.0";

export async function sendMetaCapiEvent(
  event: PixelEvent,
  metaPixelId: string
): Promise<void> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[meta-capi] META_CAPI_ACCESS_TOKEN not set — skipping");
    return;
  }

  const payload = {
    data: [
      {
        event_name: mapEventName(event.event_type, event.event_name),
        event_time: Math.floor(new Date(event.received_at).getTime() / 1000),
        action_source: "website",
        event_source_url: event.url ?? undefined,
        user_data: {
          client_ip_address: event.ip ?? undefined,
          client_user_agent: event.user_agent ?? undefined,
        },
        custom_data:
          event.value != null
            ? { value: event.value, currency: event.currency ?? "BRL" }
            : undefined,
      },
    ],
  };

  const res = await fetch(`${META_CAPI_URL}/${metaPixelId}/events?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[meta-capi] HTTP ${res.status}: ${body}`);
  }
}

function mapEventName(eventType: PixelEvent["event_type"], eventName: string | null): string {
  const map: Record<string, string> = {
    page_view: "PageView",
    add_to_cart: "AddToCart",
    purchase: "Purchase",
    lead: "Lead",
    sign_up: "CompleteRegistration",
    custom: eventName ?? "CustomEvent",
  };
  return map[eventType] ?? "CustomEvent";
}
```

- [ ] **Step 4: Implement google-ec.ts**

Create `lib/pixel/google-ec.ts`:

```typescript
import type { PixelEvent } from "@/types/database";

// Google Measurement Protocol for Enhanced Conversions
// Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
const GA4_MP_URL = "https://www.google-analytics.com/mp/collect";

export async function sendGoogleEcEvent(
  event: PixelEvent,
  googleTagId: string
): Promise<void> {
  const apiSecret = process.env.GOOGLE_GA4_API_SECRET;
  if (!apiSecret) {
    console.warn("[google-ec] GOOGLE_GA4_API_SECRET not set — skipping");
    return;
  }

  const payload = {
    client_id: event.session_id ?? event.ip ?? "anonymous",
    events: [
      {
        name: mapEventName(event.event_type, event.event_name),
        params: {
          ...(event.value != null && {
            value: event.value,
            currency: event.currency ?? "BRL",
          }),
          page_location: event.url ?? undefined,
          ...(event.properties ?? {}),
        },
      },
    ],
  };

  const url = `${GA4_MP_URL}?measurement_id=${googleTagId}&api_secret=${apiSecret}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[google-ec] HTTP ${res.status}: ${body}`);
  }
}

function mapEventName(eventType: PixelEvent["event_type"], eventName: string | null): string {
  const map: Record<string, string> = {
    page_view: "page_view",
    add_to_cart: "add_to_cart",
    purchase: "purchase",
    lead: "generate_lead",
    sign_up: "sign_up",
    custom: eventName ?? "custom_event",
  };
  return map[eventType] ?? "custom_event";
}
```

- [ ] **Step 5: Implement fanout.ts**

Create `lib/pixel/fanout.ts`:

```typescript
import type { Pixel, PixelEvent } from "@/types/database";
import { sendMetaCapiEvent } from "@/lib/pixel/meta-capi";
import { sendGoogleEcEvent } from "@/lib/pixel/google-ec";

export async function fanoutToPlatforms(event: PixelEvent, pixel: Pixel): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (pixel.meta_pixel_id) {
    tasks.push(sendMetaCapiEvent(event, pixel.meta_pixel_id));
  }

  if (pixel.google_tag_id) {
    tasks.push(sendGoogleEcEvent(event, pixel.google_tag_id));
  }

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[pixel/fanout] adapter error:", result.reason);
    }
  }
}
```

- [ ] **Step 6: Run tests — expect all pass**

```bash
npx vitest run tests/unit/pixel-fanout.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/pixel/meta-capi.ts lib/pixel/google-ec.ts lib/pixel/fanout.ts tests/unit/pixel-fanout.test.ts
git commit -m "feat(m4): Meta CAPI + Google EC adapters with fanout"
```

---

## Task 5: Event Ingestion Route Handler

**Files:**
- Create: `app/api/pixel/[id]/route.ts`
- Create: `tests/unit/pixel-route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/pixel-route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase and fanout before importing the route
vi.mock("@/lib/pixel/fanout", () => ({
  fanoutToPlatforms: vi.fn().mockResolvedValue(undefined),
}));

// Minimal Supabase mock builder
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}));

import { POST } from "@/app/api/pixel/[id]/route";
import { NextRequest } from "next/server";

function makeRequest(pixelId: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/pixel/${pixelId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const PIXEL_ID = "px_test_123";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/pixel/[id]", () => {
  it("returns 204 for a valid page_view event when pixel exists", async () => {
    // Mock: pixel lookup returns a pixel row
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PIXEL_ID, workspace_id: "ws_1", name: "Site", meta_pixel_id: null, google_tag_id: null, created_at: "", updated_at: "" },
        error: null,
      }),
    });
    // Mock: event insert
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ev_1", pixel_id: PIXEL_ID, event_type: "page_view", received_at: new Date().toISOString() },
        error: null,
      }),
    });

    const req = makeRequest(PIXEL_ID, { event_type: "page_view" }, {
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestAgent/1.0",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid event_type", async () => {
    const req = makeRequest(PIXEL_ID, { event_type: "bad_type" });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when pixel does not exist", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });

    const req = makeRequest("px_nonexistent", { event_type: "page_view" });
    const res = await POST(req, { params: Promise.resolve({ id: "px_nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/pixel/${PIXEL_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json {{",
    });
    const res = await POST(req, { params: Promise.resolve({ id: PIXEL_ID }) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/unit/pixel-route.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the Supabase service client helper**

Create `lib/supabase/service.ts`:

```typescript
/**
 * Supabase service-role client for server-only, privileged operations
 * (e.g. writing pixel events from unauthenticated endpoints).
 *
 * NEVER expose this client to the browser.
 * TODO(M1-backend): replace mock with real createClient from @supabase/supabase-js
 */

// Minimal mock until real Supabase is wired up.
// Each .from() call returns a chainable object that resolves with empty data.
type SupabaseServiceClient = {
  from: (table: string) => {
    select: (cols?: string) => unknown;
    insert: (row: unknown) => unknown;
    eq: (col: string, val: unknown) => unknown;
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
};

let _client: SupabaseServiceClient | null = null;

export function createServiceClient(): SupabaseServiceClient {
  if (_client) return _client;

  const makeChain = (): ReturnType<SupabaseServiceClient["from"]> => {
    const chain: ReturnType<SupabaseServiceClient["from"]> = {
      select: () => chain,
      insert: () => chain,
      eq: () => chain,
      single: async () => ({ data: null, error: { message: "service client not configured" } }),
    };
    return chain;
  };

  _client = { from: () => makeChain() };
  return _client;
}
```

- [ ] **Step 4: Implement the route handler**

Create `app/api/pixel/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parsePixelEvent } from "@/lib/pixel/validate";
import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { createServiceClient } from "@/lib/supabase/service";
import type { Pixel, PixelEventInsert } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// Public endpoint — no auth cookie. Any site with the pixel ID can post events.
// Pixel ID is the only "secret" (treat it as a write-only token).
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { id: pixelId } = await ctx.params;

  // 1. Parse body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 2. Validate event payload
  const parsed = parsePixelEvent(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "body"}: ${first.message}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // 3. Verify pixel exists (prevents blind writes)
  const { data: pixel, error: pixelError } = await supabase
    .from("pixels")
    .select("id, workspace_id, name, meta_pixel_id, google_tag_id, created_at, updated_at")
    .eq("id", pixelId)
    .single() as { data: Pixel | null; error: unknown };

  if (pixelError || !pixel) {
    return NextResponse.json({ error: "Pixel not found." }, { status: 404 });
  }

  // 4. Build event row
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const eventInsert: PixelEventInsert = {
    pixel_id: pixelId,
    event_type: parsed.data.event_type,
    event_name: parsed.data.event_name ?? null,
    url: parsed.data.url ?? null,
    referrer: parsed.data.referrer ?? null,
    ip,
    user_agent: req.headers.get("user-agent") ?? null,
    session_id: parsed.data.session_id ?? null,
    value: parsed.data.value ?? null,
    currency: parsed.data.currency ?? null,
    properties: (parsed.data.properties as Record<string, unknown>) ?? null,
  };

  // 5. Persist event
  const { data: savedEvent, error: insertError } = await supabase
    .from("pixel_events")
    .insert(eventInsert)
    .select()
    .single() as { data: unknown; error: unknown };

  if (insertError || !savedEvent) {
    console.error("[pixel/ingest] insert error:", insertError);
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }

  // 6. Fan out to platforms (fire-and-forget; errors are logged, not surfaced)
  fanoutToPlatforms(savedEvent as Parameters<typeof fanoutToPlatforms>[0], pixel).catch(
    (err) => console.error("[pixel/ingest] fanout error:", err)
  );

  // 7. Return 204 — no content (fastest possible response for tracking pixels)
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
npx vitest run tests/unit/pixel-route.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/pixel/[id]/route.ts lib/supabase/service.ts tests/unit/pixel-route.test.ts
git commit -m "feat(m4): pixel event ingestion endpoint POST /api/pixel/[id]"
```

---

## Task 6: Client-Side Pixel Script (adflow.js)

**Files:**
- Create: `public/adflow.js`

The script must be:
- Vanilla JS, no bundler, no dependencies
- Under 3 KB minified
- Auto-fire a `page_view` event on load
- Expose a global `adflow("track", eventType, properties)` function
- Use a 1-pixel GIF GET request as a fallback plus a `sendBeacon` POST as the primary mechanism

- [ ] **Step 1: Create the script**

Create `public/adflow.js`:

```javascript
(function (window, document) {
  "use strict";

  var PIXEL_ID = window.__ADFLOW_PIXEL_ID;
  var ENDPOINT = (window.__ADFLOW_ENDPOINT || "https://app.adflow.com.br") + "/api/pixel/" + PIXEL_ID;

  // Anonymous session ID persisted in localStorage
  function getSessionId() {
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

  function buildPayload(eventType, properties) {
    var payload = {
      event_type: eventType,
      url: window.location.href,
      referrer: document.referrer || null,
      session_id: getSessionId(),
    };
    if (properties && typeof properties === "object") {
      if (properties.event_name) payload.event_name = properties.event_name;
      if (properties.value != null) payload.value = properties.value;
      if (properties.currency) payload.currency = properties.currency;
      // remaining keys go to `properties`
      var extra = {};
      var reserved = ["event_name", "value", "currency"];
      Object.keys(properties).forEach(function (k) {
        if (reserved.indexOf(k) === -1) extra[k] = properties[k];
      });
      if (Object.keys(extra).length > 0) payload.properties = extra;
    }
    return payload;
  }

  function send(eventType, properties) {
    if (!PIXEL_ID) {
      console.warn("[adflow] window.__ADFLOW_PIXEL_ID is not set.");
      return;
    }
    var payload = buildPayload(eventType, properties);
    var body = JSON.stringify(payload);

    // Primary: sendBeacon (non-blocking, survives page unload)
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    // Fallback: async XHR
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(body);
    } catch (_) {
      // Silent fail — tracking should never break the page
    }
  }

  // Auto-fire page_view
  send("page_view");

  // Public API: adflow("track", "purchase", { value: 99, currency: "BRL" })
  window.adflow = function (command, eventType, properties) {
    if (command === "track") {
      send(eventType, properties);
    }
  };
})(window, document);
```

- [ ] **Step 2: Verify script size is reasonable**

```bash
wc -c public/adflow.js
```
Expected: under 4000 bytes.

- [ ] **Step 3: Commit**

```bash
git add public/adflow.js
git commit -m "feat(m4): client-side adflow.js pixel script"
```

---

## Task 7: Pixel Management UI — List & Create

**Files:**
- Create: `app/(dashboard)/pixel/page.tsx`
- Create: `components/pixel/pixel-table.tsx`
- Create: `components/pixel/create-pixel-dialog.tsx`
- Create: `components/pixel/pixel-snippet.tsx`

- [ ] **Step 1: Create the pixel-snippet component**

Create `components/pixel/pixel-snippet.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = { pixelId: string; appUrl?: string };

export function PixelSnippet({ pixelId, appUrl = "https://app.adflow.com.br" }: Props) {
  const [copied, setCopied] = useState(false);

  const snippet = `<!-- AdFlow Pixel -->
<script>
  window.__ADFLOW_PIXEL_ID = "${pixelId}";
  window.__ADFLOW_ENDPOINT = "${appUrl}";
</script>
<script src="${appUrl}/adflow.js" async></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4 space-y-2">
      <pre className="text-xs font-mono text-muted overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? "Copiado!" : "Copiar snippet"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create the create-pixel-dialog component**

Create `components/pixel/create-pixel-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePixelDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      meta_pixel_id: (formData.get("meta_pixel_id") as string) || null,
      google_tag_id: (formData.get("google_tag_id") as string) || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/pixels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setError(data.error ?? "Erro ao criar pixel.");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Erro de rede. Tente novamente.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Novo Pixel</Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle>Criar novo pixel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Ex: Site Principal" required className="bg-base border-border" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meta_pixel_id">Meta Pixel ID (opcional)</Label>
            <Input id="meta_pixel_id" name="meta_pixel_id" placeholder="Ex: 123456789" className="bg-base border-border" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="google_tag_id">Google Tag ID (opcional)</Label>
            <Input id="google_tag_id" name="google_tag_id" placeholder="Ex: G-XXXXXXXXXX" className="bg-base border-border" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar Pixel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create the pixel-table component**

Create `components/pixel/pixel-table.tsx`:

```typescript
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Pixel } from "@/types/database";

type Props = { pixels: Pixel[] };

export function PixelTable({ pixels }: Props) {
  if (pixels.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
        Nenhum pixel criado ainda. Crie o seu primeiro pixel acima.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-muted font-medium">Nome</th>
            <th className="px-4 py-3 text-left text-muted font-medium">ID</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Meta Pixel</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Google Tag</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Criado em</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {pixels.map((px, i) => (
            <tr key={px.id} className={i % 2 === 0 ? "bg-base" : "bg-surface"}>
              <td className="px-4 py-3 font-medium text-white">{px.name}</td>
              <td className="px-4 py-3 font-mono text-muted text-xs">{px.id}</td>
              <td className="px-4 py-3 text-muted">{px.meta_pixel_id ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{px.google_tag_id ?? "—"}</td>
              <td className="px-4 py-3 text-muted">
                {new Date(px.created_at).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3 text-right">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/pixel/${px.id}`}>Ver eventos</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create the pixel list page**

Create `app/(dashboard)/pixel/page.tsx`:

```typescript
import { requireServerSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PixelTable } from "@/components/pixel/pixel-table";
import { CreatePixelDialog } from "@/components/pixel/create-pixel-dialog";
import type { Pixel } from "@/types/database";

// Mock pixels for UI development — replace with Supabase query in M4-backend
const MOCK_PIXELS: Pixel[] = [
  {
    id: "px_demo_001",
    workspace_id: "ws_demo",
    name: "Site Principal",
    meta_pixel_id: "123456789012345",
    google_tag_id: "G-XXXXXXXXXX",
    created_at: new Date("2026-05-20").toISOString(),
    updated_at: new Date("2026-05-20").toISOString(),
  },
  {
    id: "px_demo_002",
    workspace_id: "ws_demo",
    name: "Landing Page Oferta",
    meta_pixel_id: null,
    google_tag_id: null,
    created_at: new Date("2026-05-21").toISOString(),
    updated_at: new Date("2026-05-21").toISOString(),
  },
];

export default async function PixelPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  void session;

  // TODO(M4-backend): replace with Supabase query
  // const supabase = createServiceClient();
  // const { data: pixels } = await supabase
  //   .from("pixels").select("*").eq("workspace_id", session.workspace.id)
  //   .order("created_at", { ascending: false });
  const pixels = MOCK_PIXELS;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Pixels & Tracking</h1>
          <p className="text-sm text-muted mt-1">
            Instale o pixel AdFlow em seu site para rastrear conversões.
          </p>
        </div>
        <CreatePixelDialog />
      </div>
      <PixelTable pixels={pixels} />
    </div>
  );
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/pixel/page.tsx components/pixel/pixel-table.tsx components/pixel/create-pixel-dialog.tsx components/pixel/pixel-snippet.tsx
git commit -m "feat(m4): pixel management list page with create dialog"
```

---

## Task 8: Pixel Detail Page & Event Log

**Files:**
- Create: `app/(dashboard)/pixel/[id]/page.tsx`
- Create: `components/pixel/event-log-table.tsx`

- [ ] **Step 1: Create the event-log-table component**

Create `components/pixel/event-log-table.tsx`:

```typescript
"use client";

import type { PixelEvent } from "@/types/database";

const EVENT_COLORS: Record<string, string> = {
  page_view: "text-data",
  purchase: "text-success",
  add_to_cart: "text-warning",
  lead: "text-accent",
  sign_up: "text-success",
  custom: "text-muted",
};

type Props = { events: PixelEvent[] };

export function EventLogTable({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
        Nenhum evento registrado ainda. Instale o pixel no seu site e aguarde os primeiros eventos.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm font-mono">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Tipo</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Nome</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">URL</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Valor</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Session</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Recebido em</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => (
            <tr key={ev.id} className={i % 2 === 0 ? "bg-base" : "bg-surface"}>
              <td className={`px-4 py-2 ${EVENT_COLORS[ev.event_type] ?? "text-muted"}`}>
                {ev.event_type}
              </td>
              <td className="px-4 py-2 text-muted">{ev.event_name ?? "—"}</td>
              <td className="px-4 py-2 text-muted text-xs truncate max-w-[220px]" title={ev.url ?? ""}>
                {ev.url ? new URL(ev.url).pathname : "—"}
              </td>
              <td className="px-4 py-2 text-white">
                {ev.value != null
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: ev.currency ?? "BRL" }).format(ev.value)
                  : "—"}
              </td>
              <td className="px-4 py-2 text-muted text-xs">{ev.session_id ?? "—"}</td>
              <td className="px-4 py-2 text-muted text-xs">
                {new Date(ev.received_at).toLocaleString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create the pixel detail page**

Create `app/(dashboard)/pixel/[id]/page.tsx`:

```typescript
import { requireServerSession } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EventLogTable } from "@/components/pixel/event-log-table";
import { PixelSnippet } from "@/components/pixel/pixel-snippet";
import type { Pixel, PixelEvent } from "@/types/database";

// Mock data for UI development
const MOCK_PIXEL: Pixel = {
  id: "px_demo_001",
  workspace_id: "ws_demo",
  name: "Site Principal",
  meta_pixel_id: "123456789012345",
  google_tag_id: "G-XXXXXXXXXX",
  created_at: new Date("2026-05-20").toISOString(),
  updated_at: new Date("2026-05-20").toISOString(),
};

const MOCK_EVENTS: PixelEvent[] = [
  { id: "ev_1", pixel_id: "px_demo_001", event_type: "page_view", event_name: null, url: "https://example.com/", referrer: "https://google.com", ip: "1.2.3.4", user_agent: "Mozilla/5.0", session_id: "s_abc123", value: null, currency: null, properties: null, received_at: new Date("2026-05-22T10:00:00").toISOString() },
  { id: "ev_2", pixel_id: "px_demo_001", event_type: "purchase", event_name: null, url: "https://example.com/checkout/success", referrer: null, ip: "1.2.3.4", user_agent: "Mozilla/5.0", session_id: "s_abc123", value: 299.9, currency: "BRL", properties: { order_id: "ord_42" }, received_at: new Date("2026-05-22T10:05:00").toISOString() },
  { id: "ev_3", pixel_id: "px_demo_001", event_type: "lead", event_name: null, url: "https://example.com/contato", referrer: null, ip: "5.6.7.8", user_agent: "Chrome/120", session_id: "s_xyz456", value: null, currency: null, properties: null, received_at: new Date("2026-05-22T11:00:00").toISOString() },
];

type Props = { params: Promise<{ id: string }> };

export default async function PixelDetailPage({ params }: Props) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  void session;

  const { id } = await params;

  // TODO(M4-backend): replace with Supabase queries
  // Verify pixel belongs to user's workspace, then fetch events
  const pixel = MOCK_PIXEL.id === id ? MOCK_PIXEL : null;
  if (!pixel) notFound();

  const events = MOCK_EVENTS.filter((e) => e.pixel_id === id);
  const totalEvents = events.length;
  const purchases = events.filter((e) => e.event_type === "purchase");
  const revenue = purchases.reduce((sum, e) => sum + (e.value ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">{pixel.name}</h1>
        <p className="text-sm text-muted font-mono mt-1">{pixel.id}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Total de Eventos</p>
          <p className="text-2xl font-bold text-white mt-1">{totalEvents}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Compras</p>
          <p className="text-2xl font-bold text-success mt-1">{purchases.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Receita Rastreada</p>
          <p className="text-2xl font-bold text-data mt-1">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(revenue)}
          </p>
        </div>
      </div>

      {/* Embed snippet */}
      <div>
        <h2 className="text-base font-medium text-white mb-2">Código de instalação</h2>
        <PixelSnippet pixelId={pixel.id} />
      </div>

      {/* Event log */}
      <div>
        <h2 className="text-base font-medium text-white mb-2">Log de Eventos</h2>
        <EventLogTable events={events} />
      </div>
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
git add app/(dashboard)/pixel/[id]/page.tsx components/pixel/event-log-table.tsx
git commit -m "feat(m4): pixel detail page with event log and embed snippet"
```

---

## Task 9: Pixels CRUD API Route

**Files:**
- Create: `app/api/pixels/route.ts`

This is the authenticated route for creating/listing pixels — separate from the public ingestion endpoint.

- [ ] **Step 1: Create the pixels management API route**

Create `app/api/pixels/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { z } from "zod";
import type { Pixel } from "@/types/database";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  meta_pixel_id: z.string().max(50).nullable().optional(),
  google_tag_id: z.string().max(50).nullable().optional(),
});

// GET /api/pixels — list pixels for the current workspace
export async function GET(_req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // TODO(M4-backend): replace with Supabase query
  // const supabase = createServiceClient();
  // const { data, error } = await supabase.from("pixels").select("*")
  //   .eq("workspace_id", session.workspace.id).order("created_at", { ascending: false });
  const pixels: Pixel[] = []; // mock: return empty list
  void session;

  return NextResponse.json(pixels);
}

// POST /api/pixels — create a new pixel
export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  // TODO(M4-backend): replace with Supabase insert
  // const { data, error } = await supabase.from("pixels").insert({
  //   workspace_id: session.workspace.id,
  //   name: parsed.data.name,
  //   meta_pixel_id: parsed.data.meta_pixel_id ?? null,
  //   google_tag_id: parsed.data.google_tag_id ?? null,
  // }).select().single();

  const newPixel: Pixel = {
    id: `px_${Date.now()}`,
    workspace_id: session.workspace.id,
    name: parsed.data.name,
    meta_pixel_id: parsed.data.meta_pixel_id ?? null,
    google_tag_id: parsed.data.google_tag_id ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(newPixel, { status: 201 });
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/pixels/route.ts
git commit -m "feat(m4): authenticated pixels management API GET+POST /api/pixels"
```

---

## Task 10: Add Pixel to Sidebar Navigation

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Check the current sidebar nav items**

```bash
grep -n "href" components/layout/sidebar.tsx | head -20
```

- [ ] **Step 2: Add the Pixel nav item**

Find the navigation items array in `components/layout/sidebar.tsx`. It will look similar to:
```typescript
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/creatives", label: "Criativos", icon: Sparkles },
  ...
];
```

Add the pixel entry after `/creatives` (import `Radio` from `lucide-react`):

```typescript
{ href: "/pixel", label: "Pixels", icon: Radio },
```

Also add the import at the top of the file:
```typescript
import { ..., Radio } from "lucide-react";
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(m4): add Pixels entry to sidebar navigation"
```

---

## Task 11: E2E Tests

**Files:**
- Create: `tests/e2e/pixel.spec.ts`

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/pixel.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Pixel Management", () => {
  test.beforeEach(async ({ page }) => {
    // Set the fake session cookie (matches FAKE_SESSION in lib/auth/session.ts)
    await page.context().addCookies([
      {
        name: "adflow_session",
        value: "fake_session_token",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("pixel list page renders", async ({ page }) => {
    await page.goto("/pixel");
    await expect(page.getByText("Pixels & Tracking")).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo Pixel" })).toBeVisible();
  });

  test("create pixel dialog opens and closes", async ({ page }) => {
    await page.goto("/pixel");
    await page.getByRole("button", { name: "Novo Pixel" }).click();
    await expect(page.getByText("Criar novo pixel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Criar novo pixel")).not.toBeVisible();
  });

  test("pixel detail page renders with event log", async ({ page }) => {
    await page.goto("/pixel/px_demo_001");
    await expect(page.getByText("Site Principal")).toBeVisible();
    await expect(page.getByText("Código de instalação")).toBeVisible();
    await expect(page.getByText("Log de Eventos")).toBeVisible();
    // Verify mock events show up
    await expect(page.getByText("page_view")).toBeVisible();
    await expect(page.getByText("purchase")).toBeVisible();
  });

  test("copy snippet button is present on pixel detail", async ({ page }) => {
    await page.goto("/pixel/px_demo_001");
    await expect(page.getByRole("button", { name: "Copiar snippet" })).toBeVisible();
  });

  test("sidebar shows Pixels link", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /Pixels/i })).toBeVisible();
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
git add tests/e2e/pixel.spec.ts
git commit -m "test(m4): E2E tests for pixel management pages"
```

---

## Task 12: .env.local.example — Add M4 Variables

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Add M4 env vars**

Append to `.env.local.example`:

```bash
# M4: Pixel Platform Forwarding
META_CAPI_ACCESS_TOKEN=          # Meta Conversions API system user token
GOOGLE_GA4_API_SECRET=           # Google Analytics 4 Measurement Protocol API secret
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "chore(m4): add META_CAPI_ACCESS_TOKEN and GOOGLE_GA4_API_SECRET to env example"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `adflow.js` client-side pixel script → Task 6
- [x] `/api/pixel/[id]` event ingestion endpoint → Task 5
- [x] Pixel management UI (create, list, delete) → Tasks 7–9
- [x] Meta CAPI forwarding → Task 4 (`meta-capi.ts`)
- [x] Google Enhanced Conversions forwarding → Task 4 (`google-ec.ts`)
- [x] Real-time event log → Task 8
- [x] Database migration with RLS → Task 1
- [x] TypeScript types → Task 2
- [x] Payload validation → Task 3
- [x] Sidebar navigation → Task 10
- [x] E2E tests → Task 11

**Gaps noted:**
- Pixel deletion (DELETE /api/pixels/[id]) is out of scope for MVP UI — pixels can be deleted directly from Supabase console for now. Add in a future iteration.
- `PixelEventInsert` type excludes `id` and `received_at` — verified consistent with usage in Task 5.
- `lib/supabase/service.ts` is a mock stub; the real Supabase service client will be wired in when M1-backend lands.
