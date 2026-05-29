# Integrations & API Keys — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar área de Settings → Integrações onde o owner/admin cadastra chaves de API de 12 provedores; chaves são criptografadas (AES-256-GCM) e armazenadas no Supabase por organização, eliminando dependência de `.env.local` para variáveis de plataforma.

**Architecture:** Camada `lib/integrations/` centraliza crypto + CRUD; cada API client existente ganha param `organizationId` e lê do banco com fallback para `process.env` (zero breaking changes durante transição). UI usa abas por categoria + grid de cards + modal write-only (credenciais nunca voltam ao cliente em plaintext).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (service-role), Node `crypto` (AES-256-GCM), Zod, Vitest, shadcn/ui (Dialog, Tabs, Badge).

**Branch:** Criar `feat/integrations-api-keys` a partir de `feat/ms-security` (ou de `main` após merge do MS).

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/014_api_credentials.sql` | Criar |
| `lib/integrations/types.ts` | Criar |
| `lib/integrations/crypto.ts` | Criar |
| `lib/integrations/credentials.ts` | Criar |
| `lib/integrations/providers.ts` | Criar |
| `lib/auth/roles.ts` | Modificar — add `canManageIntegrations` |
| `types/database.ts` | Modificar — add `OrgApiCredential`, `IntegrationStatus` |
| `app/api/settings/integrations/route.ts` | Criar |
| `app/api/settings/integrations/[provider]/route.ts` | Criar |
| `app/api/settings/integrations/[provider]/test/route.ts` | Criar |
| `app/(dashboard)/settings/integrations/page.tsx` | Criar |
| `components/settings/integrations-grid.tsx` | Criar |
| `components/settings/integration-card.tsx` | Criar |
| `components/settings/integration-modal.tsx` | Criar |
| `components/layout/nav-items.ts` | Modificar |
| `lib/meta/client.ts` | Modificar |
| `lib/google/client.ts` | Modificar |
| `lib/tiktok/client.ts` | Modificar |
| `lib/linkedin/client.ts` | Modificar |
| `lib/ai/openai.ts` | Modificar |
| `lib/automation/email.ts` | Modificar |
| `lib/pixel/meta-capi.ts` | Modificar |
| `lib/pixel/google-ec.ts` | Modificar |
| `tests/unit/integrations-crypto.test.ts` | Criar |
| `tests/unit/integrations-credentials.test.ts` | Criar |
| `tests/unit/integrations-providers.test.ts` | Criar |
| `.env.local.example` | Modificar — remover vars de plataforma, add ENCRYPTION_KEY |

---

## Task 1: Tipos, migration e RBAC helper

**Files:**
- Create: `supabase/migrations/014_api_credentials.sql`
- Modify: `types/database.ts`
- Modify: `lib/auth/roles.ts`

- [ ] **Step 1.1: Criar migration**

```sql
-- supabase/migrations/014_api_credentials.sql
-- API credentials per organization, encrypted at rest.
-- credentials column is an AES-256-GCM blob: "iv:authTag:ciphertext" (hex).
-- Never store plaintext here.

CREATE TABLE org_api_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  credentials     TEXT NOT NULL,
  last_tested_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

CREATE TRIGGER org_api_credentials_updated_at
  BEFORE UPDATE ON org_api_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE org_api_credentials ENABLE ROW LEVEL SECURITY;

-- Owners and admins can read, write and delete their org's credentials
CREATE POLICY "api_creds: owners and admins can read"
  ON org_api_credentials FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "api_creds: owners and admins can write"
  ON org_api_credentials FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "api_creds: owners and admins can update"
  ON org_api_credentials FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "api_creds: owners and admins can delete"
  ON org_api_credentials FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

- [ ] **Step 1.2: Adicionar tipos em `types/database.ts`**

Abrir `types/database.ts` e adicionar ao final do arquivo:

```typescript
// ─── Integrations ─────────────────────────────────────────────────────────────

export type OrgApiCredential = {
  id: string;
  organization_id: string;
  provider: string;
  credentials: string; // AES-256-GCM encrypted blob — never plaintext
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationStatus = {
  provider: string;
  configured: boolean;
  last_tested_at: string | null;
};
```

- [ ] **Step 1.3: Adicionar `canManageIntegrations` em `lib/auth/roles.ts`**

Adicionar após `canManageWorkspaces`:

```typescript
/** Can configure org-level API credentials (owner or admin only) */
export function canManageIntegrations(session: SessionContext): boolean {
  return hasMinRole(session.role, "admin");
}
```

- [ ] **Step 1.4: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 1.5: Commit**

```bash
git add supabase/migrations/014_api_credentials.sql types/database.ts lib/auth/roles.ts
git commit -m "feat(integrations): migration org_api_credentials + types + canManageIntegrations RBAC"
```

---

## Task 2: Módulo de criptografia AES-256-GCM

**Files:**
- Create: `lib/integrations/crypto.ts`
- Create: `tests/unit/integrations-crypto.test.ts`

- [ ] **Step 2.1: Escrever `tests/unit/integrations-crypto.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("integrations/crypto", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // 32-byte key as 64 hex chars
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
    vi.resetModules();
  });

  it("round-trips a JSON string", async () => {
    const { encrypt, decrypt } = await import("@/lib/integrations/crypto");
    const original = JSON.stringify({ api_key: "sk-test-123", extra: "value" });
    const blob = encrypt(original);
    expect(decrypt(blob)).toBe(original);
  });

  it("produces different ciphertext for the same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/integrations/crypto");
    const input = "same-input";
    const blob1 = encrypt(input);
    const blob2 = encrypt(input);
    expect(blob1).not.toBe(blob2);
  });

  it("blob has format iv:authTag:ciphertext", async () => {
    const { encrypt } = await import("@/lib/integrations/crypto");
    const blob = encrypt("test");
    const parts = blob.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(24); // 12-byte IV → 24 hex chars
    expect(parts[1]).toHaveLength(32); // 16-byte auth tag → 32 hex chars
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/integrations/crypto");
    const blob = encrypt("secret");
    const parts = blob.split(":");
    const tampered = `${parts[0]}:${parts[1]}:ffffffff`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt } = await import("@/lib/integrations/crypto");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    const { encrypt } = await import("@/lib/integrations/crypto");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });
});
```

- [ ] **Step 2.2: Confirmar que os testes falham**

```bash
npx vitest run tests/unit/integrations-crypto.test.ts
```

Esperado: todos falhando com "Cannot find module".

- [ ] **Step 2.3: Criar `lib/integrations/crypto.ts`**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32");
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts a plaintext string and returns "iv:authTag:ciphertext" (all hex). */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypts a blob produced by encrypt(). Throws on tampered or malformed input. */
export function decrypt(blob: string): string {
  const parts = blob.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted blob format");
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
```

- [ ] **Step 2.4: Rodar testes — todos devem passar**

```bash
npx vitest run tests/unit/integrations-crypto.test.ts
```

Esperado: 6/6 passando.

- [ ] **Step 2.5: Commit**

```bash
git add lib/integrations/crypto.ts tests/unit/integrations-crypto.test.ts
git commit -m "feat(integrations): AES-256-GCM crypto module with full test coverage"
```

---

## Task 3: Módulo de credenciais (CRUD no Supabase)

**Files:**
- Create: `lib/integrations/credentials.ts`
- Create: `tests/unit/integrations-credentials.test.ts`

- [ ] **Step 3.1: Escrever `tests/unit/integrations-credentials.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the service client
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

// Mock crypto to avoid needing ENCRYPTION_KEY in tests
vi.mock("@/lib/integrations/crypto", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
  decrypt: vi.fn((v: string) => v.replace("encrypted:", "")),
}));

import { createServiceClient } from "@/lib/supabase/service";

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "upsert", "update", "delete", "eq", "order", "limit"];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.single = vi.fn(async () => ({ data: overrides.singleData ?? null, error: overrides.singleError ?? null }));
  chain.maybeSingle = vi.fn(async () => ({ data: overrides.maybeData ?? null, error: null }));
  chain.then = vi.fn(async (resolve: (v: unknown) => void) => resolve({ data: overrides.listData ?? [], error: null }));
  return chain;
}

describe("integrations/credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  it("getCredentials returns null when no row exists", async () => {
    const chain = makeChain({ maybeData: null });
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);

    const { getCredentials } = await import("@/lib/integrations/credentials");
    const result = await getCredentials("org-1", "meta");
    expect(result).toBeNull();
  });

  it("getCredentials decrypts and returns parsed JSON", async () => {
    const stored = { access_token: "EAA123", ad_account_id: "act_456" };
    const chain = makeChain({ maybeData: { credentials: `encrypted:${JSON.stringify(stored)}` } });
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);

    const { getCredentials } = await import("@/lib/integrations/credentials");
    const result = await getCredentials("org-1", "meta");
    expect(result).toEqual(stored);
  });

  it("upsertCredentials encrypts before storing", async () => {
    const { encrypt } = await import("@/lib/integrations/crypto");
    const chain = makeChain();
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);

    const { upsertCredentials } = await import("@/lib/integrations/credentials");
    await upsertCredentials("org-1", "openai", { api_key: "sk-test" });

    expect(encrypt).toHaveBeenCalledWith(JSON.stringify({ api_key: "sk-test" }));
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("deleteCredentials calls delete().eq().eq()", async () => {
    const chain = makeChain();
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);

    const { deleteCredentials } = await import("@/lib/integrations/credentials");
    await deleteCredentials("org-1", "resend");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(chain.eq).toHaveBeenCalledWith("provider", "resend");
  });

  it("listCredentialStatuses returns configured providers only", async () => {
    const rows = [
      { provider: "meta", last_tested_at: "2026-05-29T10:00:00Z" },
      { provider: "openai", last_tested_at: null },
    ];
    const chain = makeChain({ listData: rows });
    vi.mocked(createServiceClient).mockReturnValue({ from: () => chain } as ReturnType<typeof createServiceClient>);

    const { listCredentialStatuses } = await import("@/lib/integrations/credentials");
    const result = await listCredentialStatuses("org-1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ provider: "meta", configured: true, last_tested_at: "2026-05-29T10:00:00Z" });
  });
});
```

- [ ] **Step 3.2: Confirmar que falham**

```bash
npx vitest run tests/unit/integrations-credentials.test.ts
```

Esperado: falha com "Cannot find module".

- [ ] **Step 3.3: Criar `lib/integrations/credentials.ts`**

```typescript
import { createServiceClient } from "@/lib/supabase/service";
import { encrypt, decrypt } from "@/lib/integrations/crypto";
import type { IntegrationStatus } from "@/types/database";

export async function getCredentials(
  organizationId: string,
  provider: string
): Promise<Record<string, string> | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("org_api_credentials")
    .select("credentials")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  if (!data) return null;

  try {
    const row = data as { credentials: string };
    return JSON.parse(decrypt(row.credentials)) as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * Returns a single credential field, falling back to the matching env var.
 * This allows a zero-breaking-change migration: DB takes priority, env is the fallback.
 */
export async function getCredentialField(
  organizationId: string,
  provider: string,
  field: string,
  envFallback?: string
): Promise<string | null> {
  const creds = await getCredentials(organizationId, provider);
  if (creds?.[field]) return creds[field];
  return envFallback ? (process.env[envFallback] ?? null) : null;
}

export async function upsertCredentials(
  organizationId: string,
  provider: string,
  fields: Record<string, string>
): Promise<void> {
  const supabase = createServiceClient();
  const encrypted = encrypt(JSON.stringify(fields));
  await supabase
    .from("org_api_credentials")
    .upsert(
      { organization_id: organizationId, provider, credentials: encrypted },
      { onConflict: "organization_id,provider" }
    );
}

export async function deleteCredentials(
  organizationId: string,
  provider: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("org_api_credentials")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", provider);
}

export async function markTested(
  organizationId: string,
  provider: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("org_api_credentials")
    .update({ last_tested_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
}

export async function listCredentialStatuses(
  organizationId: string
): Promise<IntegrationStatus[]> {
  const supabase = createServiceClient();
  const { data } = (await supabase
    .from("org_api_credentials")
    .select("provider, last_tested_at")
    .eq("organization_id", organizationId)) as { data: Array<{ provider: string; last_tested_at: string | null }> | null };

  if (!data) return [];
  return data.map((row) => ({
    provider: row.provider,
    configured: true,
    last_tested_at: row.last_tested_at,
  }));
}
```

- [ ] **Step 3.4: Rodar testes**

```bash
npx vitest run tests/unit/integrations-credentials.test.ts
```

Esperado: 5/5 passando.

- [ ] **Step 3.5: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 3.6: Commit**

```bash
git add lib/integrations/credentials.ts tests/unit/integrations-credentials.test.ts
git commit -m "feat(integrations): credentials CRUD module with encrypt/decrypt and env fallback"
```

---

## Task 4: Definições de provedores (12 integrações + testConnection)

**Files:**
- Create: `lib/integrations/types.ts`
- Create: `lib/integrations/providers.ts`
- Create: `tests/unit/integrations-providers.test.ts`

- [ ] **Step 4.1: Criar `lib/integrations/types.ts`**

```typescript
export type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  helpText?: string;
  secret: boolean; // renders as password input, masked after save
};

export type TestResult = {
  ok: boolean;
  message: string;
};

export type ProviderCategory = "ads" | "ai" | "communication" | "programmatic";

export type ProviderDef = {
  key: string;
  label: string;
  description: string;
  category: ProviderCategory;
  docsUrl: string;
  fields: CredentialField[];
  testConnection: (creds: Record<string, string>) => Promise<TestResult>;
};
```

- [ ] **Step 4.2: Escrever `tests/unit/integrations-providers.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";

describe("integrations/providers", () => {
  it("exports 12 providers", () => {
    expect(Object.keys(PROVIDERS)).toHaveLength(12);
  });

  const providerKeys = [
    "meta", "google", "tiktok", "linkedin",
    "openai", "anthropic", "stability", "runway", "elevenlabs",
    "resend", "whatsapp", "rtb",
  ];

  providerKeys.forEach((key) => {
    it(`provider "${key}" has required fields`, () => {
      const p = PROVIDERS[key];
      expect(p).toBeDefined();
      expect(p.label).toBeTruthy();
      expect(p.category).toMatch(/^(ads|ai|communication|programmatic)$/);
      expect(p.fields.length).toBeGreaterThan(0);
      expect(typeof p.testConnection).toBe("function");
    });

    it(`provider "${key}" fields have keys and labels`, () => {
      const p = PROVIDERS[key];
      for (const field of p.fields) {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(typeof field.secret).toBe("boolean");
      }
    });
  });

  it("PROVIDER_CATEGORIES has 4 categories with correct labels", () => {
    expect(PROVIDER_CATEGORIES).toHaveLength(4);
    const keys = PROVIDER_CATEGORIES.map((c) => c.key);
    expect(keys).toContain("ads");
    expect(keys).toContain("ai");
    expect(keys).toContain("communication");
    expect(keys).toContain("programmatic");
  });

  it("rtb testConnection returns ok:true for non-empty token", async () => {
    const result = await PROVIDERS.rtb.testConnection({ ssp_token: "my-secret-token" });
    expect(result.ok).toBe(true);
  });

  it("rtb testConnection returns ok:false for empty token", async () => {
    const result = await PROVIDERS.rtb.testConnection({ ssp_token: "" });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 4.3: Confirmar que falham**

```bash
npx vitest run tests/unit/integrations-providers.test.ts
```

- [ ] **Step 4.4: Criar `lib/integrations/providers.ts`**

```typescript
import type { ProviderDef, ProviderCategory, TestResult } from "@/lib/integrations/types";

async function fetchSafe(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    const body = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: (err as Error).message };
  }
}

const PROVIDERS_LIST: ProviderDef[] = [
  // ── Ads ────────────────────────────────────────────────────────────────────
  {
    key: "meta",
    label: "Meta Ads",
    description: "Gerencie campanhas e sincronize métricas do Meta Ads Manager.",
    category: "ads",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxxx...", secret: true,
        helpText: "Meta Business Suite → Configurações → Acesso à API → Gerar token" },
      { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_123456789", secret: false },
    ],
    async testConnection(creds) {
      const r = await fetchSafe(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${creds.access_token}`
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao Meta Ads." };
      return { ok: false, message: `Token inválido ou expirado. (HTTP ${r.status})` };
    },
  },
  {
    key: "google",
    label: "Google Ads",
    description: "Gerencie campanhas e acesse relatórios do Google Ads via API.",
    category: "ads",
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
    fields: [
      { key: "developer_token", label: "Developer Token", placeholder: "ABcDeFgHiJkL...", secret: true,
        helpText: "Google Ads → Ferramentas → API Center → Developer Token" },
      { key: "client_id", label: "OAuth2 Client ID", placeholder: "xxxxx.apps.googleusercontent.com", secret: false },
      { key: "client_secret", label: "OAuth2 Client Secret", placeholder: "GOCSPX-...", secret: true },
      { key: "refresh_token", label: "Refresh Token", placeholder: "1//0g...", secret: true,
        helpText: "Gerado via OAuth2 consent flow" },
      { key: "customer_id", label: "Customer ID", placeholder: "1234567890", secret: false,
        helpText: "Sem traços — apenas números" },
    ],
    async testConnection(creds) {
      // Exchange refresh token for access token
      const tokenRes = await fetchSafe("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          refresh_token: creds.refresh_token,
          grant_type: "refresh_token",
        }).toString(),
      });
      if (!tokenRes.ok) return { ok: false, message: `OAuth2 falhou. Verifique Client ID, Secret e Refresh Token. (HTTP ${tokenRes.status})` };
      const { access_token } = JSON.parse(tokenRes.body) as { access_token?: string };
      if (!access_token) return { ok: false, message: "Não foi possível obter access_token do Google." };
      // Lightweight API check
      const r = await fetchSafe(
        `https://googleads.googleapis.com/v18/customers/${creds.customer_id}/googleAds:search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "developer-token": creds.developer_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
        }
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao Google Ads." };
      return { ok: false, message: `Google Ads retornou erro. (HTTP ${r.status})` };
    },
  },
  {
    key: "tiktok",
    label: "TikTok Ads",
    description: "Gerencie campanhas TikTok e sincronize performance.",
    category: "ads",
    docsUrl: "https://ads.tiktok.com/marketing_api/docs",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", secret: true,
        helpText: "TikTok Ads Manager → Ativo → Aplicativo → Access Token" },
      { key: "advertiser_id", label: "Advertiser ID", placeholder: "7123456789012345678", secret: false },
    ],
    async testConnection(creds) {
      const r = await fetchSafe(
        `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${creds.advertiser_id}"]`,
        { headers: { "Access-Token": creds.access_token } }
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao TikTok Ads." };
      return { ok: false, message: `Token inválido. (HTTP ${r.status})` };
    },
  },
  {
    key: "linkedin",
    label: "LinkedIn Ads",
    description: "Gerencie campanhas B2B e acesse analytics do LinkedIn.",
    category: "ads",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "AQXxxxxxxxx...", secret: true,
        helpText: "LinkedIn Developer Portal → OAuth2 → gerar token com escopo r_ads,rw_ads" },
      { key: "account_id", label: "Account ID (URN)", placeholder: "123456789", secret: false },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      });
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao LinkedIn." };
      return { ok: false, message: `Token inválido. (HTTP ${r.status})` };
    },
  },
  // ── AI ─────────────────────────────────────────────────────────────────────
  {
    key: "openai",
    label: "OpenAI",
    description: "GPT-4o para geração de copy, scoring e verificação de política.",
    category: "ai",
    docsUrl: "https://platform.openai.com/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-proj-...", secret: true,
        helpText: "platform.openai.com → API Keys → Create new secret key" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${creds.api_key}` },
      });
      if (r.ok) return { ok: true, message: "API Key válida — OpenAI conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "anthropic",
    label: "Anthropic",
    description: "Claude para análise avançada e insights de campanha.",
    category: "ai",
    docsUrl: "https://console.anthropic.com/settings/keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-ant-...", secret: true,
        helpText: "console.anthropic.com → API Keys" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": creds.api_key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (r.ok || r.status === 529) return { ok: true, message: "API Key válida — Anthropic conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "stability",
    label: "Stability AI",
    description: "Geração de banners e imagens para criativos.",
    category: "ai",
    docsUrl: "https://platform.stability.ai/account/keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-...", secret: true,
        helpText: "platform.stability.ai → Account → API Keys" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.stability.ai/v1/user/account", {
        headers: { Authorization: `Bearer ${creds.api_key}` },
      });
      if (r.ok) return { ok: true, message: "API Key válida — Stability AI conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "runway",
    label: "Runway ML",
    description: "Geração de vídeos para criativos dinâmicos.",
    category: "ai",
    docsUrl: "https://docs.runwayml.com",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "key_...", secret: true,
        helpText: "app.runwayml.com → Account → API → Generate API Key" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.runwayml.com/v1/tasks", {
        headers: { Authorization: `Bearer ${creds.api_key}`, "X-Runway-Version": "2024-11-06" },
      });
      if (r.ok || r.status === 200) return { ok: true, message: "API Key válida — Runway conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    description: "Voice-over automático para vídeos de campanha.",
    category: "ai",
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk_...", secret: true,
        helpText: "elevenlabs.io → Profile → API Keys" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": creds.api_key },
      });
      if (r.ok) return { ok: true, message: "API Key válida — ElevenLabs conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  // ── Communication ──────────────────────────────────────────────────────────
  {
    key: "resend",
    label: "Resend",
    description: "E-mails transacionais e alertas de automação.",
    category: "communication",
    docsUrl: "https://resend.com/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_...", secret: true,
        helpText: "resend.com → API Keys → Create API Key" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${creds.api_key}` },
      });
      if (r.ok) return { ok: true, message: "API Key válida — Resend conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "whatsapp",
    label: "WhatsApp Business",
    description: "Automação de mensagens via WhatsApp Business API.",
    category: "communication",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: [
      { key: "token", label: "Access Token", placeholder: "EAAxxxxxxxx...", secret: true,
        helpText: "Meta for Developers → WhatsApp → Configuration → Access Token" },
      { key: "phone_id", label: "Phone Number ID", placeholder: "123456789012345", secret: false,
        helpText: "Meta for Developers → WhatsApp → Getting Started → Phone Number ID" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe(
        `https://graph.facebook.com/v21.0/${creds.phone_id}?access_token=${creds.token}`
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao WhatsApp Business." };
      return { ok: false, message: `Credenciais inválidas. (HTTP ${r.status})` };
    },
  },
  // ── Programmatic ───────────────────────────────────────────────────────────
  {
    key: "rtb",
    label: "RTB / SSP",
    description: "Token de autenticação para parceiros SSP no endpoint de bid.",
    category: "programmatic",
    docsUrl: "",
    fields: [
      { key: "ssp_token", label: "SSP Bearer Token", placeholder: "Qualquer string secreta longa", secret: true,
        helpText: "Compartilhe este token com o SSP parceiro para autenticar requests ao endpoint /api/rtb/bid" },
    ],
    async testConnection(creds) {
      if (!creds.ssp_token || creds.ssp_token.trim().length === 0) {
        return { ok: false, message: "Token não pode ser vazio." };
      }
      return { ok: true, message: "Token configurado. Compartilhe-o com o SSP parceiro." };
    },
  },
];

export const PROVIDERS: Record<string, ProviderDef> = Object.fromEntries(
  PROVIDERS_LIST.map((p) => [p.key, p])
);

export type CategoryMeta = { key: ProviderCategory; label: string };

export const PROVIDER_CATEGORIES: CategoryMeta[] = [
  { key: "ads",           label: "Anúncios" },
  { key: "ai",            label: "IA / Criativos" },
  { key: "communication", label: "Comunicação" },
  { key: "programmatic",  label: "Programático" },
];
```

- [ ] **Step 4.5: Rodar testes**

```bash
npx vitest run tests/unit/integrations-providers.test.ts
```

Esperado: todos passando (incluindo os 12 providers individualmente).

- [ ] **Step 4.6: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 4.7: Commit**

```bash
git add lib/integrations/types.ts lib/integrations/providers.ts tests/unit/integrations-providers.test.ts
git commit -m "feat(integrations): provider definitions for 12 integrations with testConnection"
```

---

## Task 5: API Routes (GET list, POST/DELETE, POST test)

**Files:**
- Create: `app/api/settings/integrations/route.ts`
- Create: `app/api/settings/integrations/[provider]/route.ts`
- Create: `app/api/settings/integrations/[provider]/test/route.ts`

- [ ] **Step 5.1: Criar `app/api/settings/integrations/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { listCredentialStatuses } from "@/lib/integrations/credentials";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";
import type { IntegrationStatus } from "@/types/database";

// GET /api/settings/integrations
// Returns integration statuses + provider metadata. Never returns credential values.
export async function GET() {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const configured = await listCredentialStatuses(session.organization.id);
  const configuredMap = new Map<string, IntegrationStatus>(
    configured.map((s) => [s.provider, s])
  );

  const categories = PROVIDER_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    providers: Object.values(PROVIDERS)
      .filter((p) => p.category === cat.key)
      .map((p) => {
        const status = configuredMap.get(p.key);
        return {
          key: p.key,
          label: p.label,
          description: p.description,
          docsUrl: p.docsUrl,
          fields: p.fields.map((f) => ({
            key: f.key,
            label: f.label,
            placeholder: f.placeholder,
            helpText: f.helpText ?? null,
            secret: f.secret,
          })),
          configured: !!status,
          last_tested_at: status?.last_tested_at ?? null,
        };
      }),
  }));

  return NextResponse.json({ categories });
}
```

- [ ] **Step 5.2: Criar `app/api/settings/integrations/[provider]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageIntegrations } from "@/lib/auth/roles";
import { upsertCredentials, deleteCredentials } from "@/lib/integrations/credentials";
import { PROVIDERS } from "@/lib/integrations/providers";

type RouteContext = { params: Promise<{ provider: string }> };

// POST /api/settings/integrations/[provider]  — save credentials
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { provider } = await ctx.params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageIntegrations(session)) {
    return NextResponse.json({ error: "Apenas owners e admins podem configurar integrações." }, { status: 403 });
  }

  const providerDef = PROVIDERS[provider];
  if (!providerDef) {
    return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  // Build a dynamic Zod schema from the provider's field definitions
  const shape: Record<string, z.ZodString> = {};
  for (const field of providerDef.fields) {
    shape[field.key] = z.string().min(1, `${field.label} é obrigatório.`);
  }
  const schema = z.object(shape);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first.message }, { status: 422 });
  }

  await upsertCredentials(session.organization.id, provider, parsed.data);
  return NextResponse.json({ ok: true });
}

// DELETE /api/settings/integrations/[provider]  — remove credentials
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { provider } = await ctx.params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageIntegrations(session)) {
    return NextResponse.json({ error: "Apenas owners e admins podem remover integrações." }, { status: 403 });
  }

  if (!PROVIDERS[provider]) {
    return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
  }

  await deleteCredentials(session.organization.id, provider);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5.3: Criar `app/api/settings/integrations/[provider]/test/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageIntegrations } from "@/lib/auth/roles";
import { getCredentials, markTested } from "@/lib/integrations/credentials";
import { PROVIDERS } from "@/lib/integrations/providers";

type RouteContext = { params: Promise<{ provider: string }> };

// POST /api/settings/integrations/[provider]/test  — test live connection
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { provider } = await ctx.params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageIntegrations(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  const providerDef = PROVIDERS[provider];
  if (!providerDef) {
    return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
  }

  const creds = await getCredentials(session.organization.id, provider);
  if (!creds) {
    return NextResponse.json({ ok: false, message: "Integração não configurada. Salve as credenciais primeiro." });
  }

  try {
    const result = await providerDef.testConnection(creds);
    if (result.ok) {
      await markTested(session.organization.id, provider);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[integrations/test/${provider}]`, (err as Error).message);
    return NextResponse.json({ ok: false, message: "Erro ao testar conexão. Verifique as credenciais." });
  }
}
```

- [ ] **Step 5.4: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 5.5: Rodar vitest para garantir que nada quebrou**

```bash
npx vitest run
```

- [ ] **Step 5.6: Commit**

```bash
git add app/api/settings/integrations/
git commit -m "feat(integrations): API routes — GET list, POST/DELETE save/remove, POST test connection"
```

---

## Task 6: UI — IntegrationCard + IntegrationModal

**Files:**
- Create: `components/settings/integration-card.tsx`
- Create: `components/settings/integration-modal.tsx`

- [ ] **Step 6.1: Criar `components/settings/integration-card.tsx`**

```typescript
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { IntegrationModal } from "@/components/settings/integration-modal";

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type IntegrationCardProps = {
  providerKey: string;
  label: string;
  description: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  lastTestedAt: string | null;
  onSaved: () => void;
};

export function IntegrationCard({
  providerKey,
  label,
  description,
  docsUrl,
  fields,
  configured,
  lastTestedAt,
  onSaved,
}: IntegrationCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remover integração ${label}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/settings/integrations/${providerKey}`, { method: "DELETE" });
      onSaved();
    } finally {
      setDeleting(false);
    }
  }

  const testedDate = lastTestedAt
    ? new Date(lastTestedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : null;

  return (
    <>
      <div className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-lg p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--adflow-fg)] truncate">{label}</p>
            <p className="text-xs text-[color:var(--adflow-fg-muted)] line-clamp-2 mt-0.5">{description}</p>
          </div>
          {configured ? (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-[color:var(--adflow-success)] text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] text-[10px] px-2 py-0.5 rounded-full">
              <Circle className="w-3 h-3" /> Não configurado
            </span>
          )}
        </div>

        {/* Last tested */}
        {testedDate && (
          <p className="text-[10px] text-[color:var(--adflow-fg-muted)]">
            Testado em {testedDate}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 text-xs font-semibold bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white rounded-md py-1.5 transition-colors"
          >
            {configured ? "Editar" : "Configurar"}
          </button>
          {configured && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-md bg-[color:var(--adflow-border)] hover:bg-[color:var(--adflow-danger)]/10 hover:text-[color:var(--adflow-danger)] text-[color:var(--adflow-fg-muted)] transition-colors disabled:opacity-50"
              aria-label="Remover integração"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <IntegrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        providerKey={providerKey}
        label={label}
        docsUrl={docsUrl}
        fields={fields}
        configured={configured}
        onSaved={() => { setModalOpen(false); onSaved(); }}
      />
    </>
  );
}
```

- [ ] **Step 6.2: Criar `components/settings/integration-modal.tsx`**

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type TestResult = { ok: boolean; message: string };

type IntegrationModalProps = {
  open: boolean;
  onClose: () => void;
  providerKey: string;
  label: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  onSaved: () => void;
};

export function IntegrationModal({
  open,
  onClose,
  providerKey,
  label,
  docsUrl,
  fields,
  configured,
  onSaved,
}: IntegrationModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setValues({});
    setTestResult(null);
    setError(null);
    onClose();
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/integrations/${providerKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Erro ao salvar.");
        return;
      }
      onSaved();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestResult(null);
    setTesting(true);
    try {
      const res = await fetch(`/api/settings/integrations/${providerKey}/test`, {
        method: "POST",
      });
      const data = await res.json() as TestResult;
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Erro de rede ao testar conexão." });
    } finally {
      setTesting(false);
    }
  }

  const allFilled = fields.every((f) => values[f.key]?.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{configured ? "Editar" : "Configurar"} — {label}</span>
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[color:var(--adflow-data)] hover:underline flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {configured && (
            <p className="text-xs text-[color:var(--adflow-fg-muted)] bg-[color:var(--adflow-border)] rounded-md px-3 py-2">
              Credenciais já configuradas. Preencha os campos abaixo para substituí-las.
            </p>
          )}

          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wide mb-1.5">
                {field.label}
              </label>
              <input
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded-md px-3 py-2 text-sm font-mono text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)]"
                autoComplete="off"
              />
              {field.helpText && (
                <p className="text-[10px] text-[color:var(--adflow-fg-muted)] mt-1">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Test result */}
          {testResult && (
            <div className={`text-xs rounded-md px-3 py-2 ${
              testResult.ok
                ? "bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-[color:var(--adflow-success)]"
                : "bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30 text-[color:var(--adflow-danger)]"
            }`}>
              {testResult.ok ? "✓" : "✗"} {testResult.message}
            </div>
          )}

          {error && (
            <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 text-xs bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] rounded-md py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !configured}
              className="text-xs bg-[color:var(--adflow-border)] text-[color:var(--adflow-data)] hover:bg-[color:var(--adflow-data)]/10 disabled:opacity-50 rounded-md px-3 py-2 transition-colors"
            >
              {testing ? "Testando…" : "Testar conexão"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !allFilled}
              className="flex-1 text-xs font-semibold bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 disabled:opacity-50 text-white rounded-md py-2 transition-colors"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6.3: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 6.4: Commit**

```bash
git add components/settings/integration-card.tsx components/settings/integration-modal.tsx
git commit -m "feat(integrations): IntegrationCard and IntegrationModal UI components"
```

---

## Task 7: Página de integrações + IntegrationsGrid + link na sidebar

**Files:**
- Create: `components/settings/integrations-grid.tsx`
- Create: `app/(dashboard)/settings/integrations/page.tsx`
- Modify: `components/layout/nav-items.ts`

- [ ] **Step 7.1: Criar `components/settings/integrations-grid.tsx`**

```typescript
"use client";

import { useState, useCallback } from "react";
import { IntegrationCard } from "@/components/settings/integration-card";

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type ProviderStatus = {
  key: string;
  label: string;
  description: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  last_tested_at: string | null;
};

type Category = {
  key: string;
  label: string;
  providers: ProviderStatus[];
};

type IntegrationsGridProps = {
  initialCategories: Category[];
};

export function IntegrationsGrid({ initialCategories }: IntegrationsGridProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeTab, setActiveTab] = useState(initialCategories[0]?.key ?? "ads");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        const data = await res.json() as { categories: Category[] };
        setCategories(data.categories);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const activeCategory = categories.find((c) => c.key === activeTab);

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-0 border-b border-[color:var(--adflow-border)] mb-6">
        {categories.map((cat) => {
          const configuredCount = cat.providers.filter((p) => p.configured).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === cat.key
                  ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-fg)]"
                  : "border-transparent text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
              }`}
            >
              {cat.label}
              {configuredCount > 0 && (
                <span className="ml-2 text-[10px] bg-[color:var(--adflow-success)]/20 text-[color:var(--adflow-success)] px-1.5 py-0.5 rounded-full">
                  {configuredCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {activeCategory && (
        <div className={`grid gap-4 ${
          activeCategory.providers.length === 1
            ? "grid-cols-1 max-w-sm"
            : activeCategory.providers.length === 2
            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {activeCategory.providers.map((provider) => (
            <IntegrationCard
              key={provider.key}
              providerKey={provider.key}
              label={provider.label}
              description={provider.description}
              docsUrl={provider.docsUrl}
              fields={provider.fields}
              configured={provider.configured}
              lastTestedAt={provider.last_tested_at}
              onSaved={refresh}
            />
          ))}
        </div>
      )}

      {refreshing && (
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-4">Atualizando…</p>
      )}
    </div>
  );
}
```

- [ ] **Step 7.2: Criar `app/(dashboard)/settings/integrations/page.tsx`**

```typescript
import { IntegrationsGrid } from "@/components/settings/integrations-grid";
import { requireServerSession } from "@/lib/supabase/server";
import { listCredentialStatuses } from "@/lib/integrations/credentials";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";
import { redirect } from "next/navigation";
import type { IntegrationStatus } from "@/types/database";

export default async function IntegrationsPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const configured = await listCredentialStatuses(session.organization.id);
  const configuredMap = new Map<string, IntegrationStatus>(
    configured.map((s) => [s.provider, s])
  );

  const categories = PROVIDER_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    providers: Object.values(PROVIDERS)
      .filter((p) => p.category === cat.key)
      .map((p) => {
        const status = configuredMap.get(p.key);
        return {
          key: p.key,
          label: p.label,
          description: p.description,
          docsUrl: p.docsUrl,
          fields: p.fields.map((f) => ({
            key: f.key,
            label: f.label,
            placeholder: f.placeholder,
            helpText: f.helpText ?? null,
            secret: f.secret,
          })),
          configured: !!status,
          last_tested_at: status?.last_tested_at ?? null,
        };
      }),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">Integrações</h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-1">
          Configure as chaves de API das plataformas que a AdFlow vai gerenciar.
          As credenciais são criptografadas e armazenadas com segurança.
        </p>
      </div>
      <IntegrationsGrid initialCategories={categories} />
    </div>
  );
}
```

- [ ] **Step 7.3: Adicionar link de Integrações na sidebar**

Abrir `components/layout/nav-items.ts` e importar o ícone `Plug` e adicionar o item:

```typescript
import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  BarChart3,
  Radio,
  FileText,
  Zap,
  Settings,
  Layers,
  Users,
  Plug,           // ← adicionar
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard },
  { label: "Campanhas",     href: "/campaigns",               icon: Megaphone },
  { label: "Programático",  href: "/campaigns/programmatic",  icon: Layers },
  { label: "Audiências",    href: "/audiences",               icon: Users },
  { label: "Criativos",     href: "/creatives",               icon: Sparkles },
  { label: "Analytics",     href: "/analytics",               icon: BarChart3 },
  { label: "Pixel",         href: "/pixel",                   icon: Radio },
  { label: "Landing Pages", href: "/landing-pages",           icon: FileText },
  { label: "Automação",     href: "/automation",              icon: Zap },
  { label: "Integrações",   href: "/settings/integrations",   icon: Plug },   // ← adicionar
  { label: "Configurações", href: "/settings",                icon: Settings },
];
```

- [ ] **Step 7.4: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.5: Rodar vitest — todos os testes existentes passam**

```bash
npx vitest run
```

- [ ] **Step 7.6: Commit**

```bash
git add components/settings/integrations-grid.tsx "app/(dashboard)/settings/integrations/page.tsx" components/layout/nav-items.ts
git commit -m "feat(integrations): IntegrationsGrid page + sidebar link"
```

---

## Task 8: Refatorar clients para ler credenciais do banco (com fallback env)

**Files:**
- Modify: `lib/meta/client.ts`
- Modify: `lib/google/client.ts`
- Modify: `lib/tiktok/client.ts`
- Modify: `lib/linkedin/client.ts`
- Modify: `lib/ai/openai.ts`
- Modify: `lib/automation/email.ts`
- Modify: `lib/pixel/meta-capi.ts`
- Modify: `lib/pixel/google-ec.ts`

**Princípio:** cada função pública recebe `organizationId: string` como primeiro parâmetro. Usa `getCredentialField(organizationId, provider, field, "ENV_FALLBACK")` para ler do banco com fallback para env var. Fallback garante compatibilidade com dev/fake session.

- [ ] **Step 8.1: Atualizar `lib/meta/client.ts`**

Abrir o arquivo. Localizar onde `process.env.META_ACCESS_TOKEN` e `process.env.META_AD_ACCOUNT_ID` são usados. Adicionar no topo do arquivo:

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";
```

Criar helper interno:

```typescript
async function getMetaCredentials(organizationId: string) {
  const [token, accountId] = await Promise.all([
    getCredentialField(organizationId, "meta", "access_token", "META_ACCESS_TOKEN"),
    getCredentialField(organizationId, "meta", "ad_account_id", "META_AD_ACCOUNT_ID"),
  ]);
  return { token: token ?? "", accountId: accountId ?? "" };
}
```

Adicionar `organizationId: string` como primeiro parâmetro das funções exportadas `listMetaCampaigns`, `createMetaCampaign`, `updateMetaCampaign`, `getMetaInsights` (ou equivalentes). Substituir uso de `process.env.META_ACCESS_TOKEN` por `(await getMetaCredentials(organizationId)).token`.

- [ ] **Step 8.2: Atualizar `lib/google/client.ts`**

Mesmo padrão. Adicionar import de `getCredentialField`. Criar:

```typescript
async function getGoogleCredentials(organizationId: string) {
  const [devToken, clientId, clientSecret, refreshToken, customerId] = await Promise.all([
    getCredentialField(organizationId, "google", "developer_token", "GOOGLE_ADS_DEVELOPER_TOKEN"),
    getCredentialField(organizationId, "google", "client_id", "GOOGLE_ADS_CLIENT_ID"),
    getCredentialField(organizationId, "google", "client_secret", "GOOGLE_ADS_CLIENT_SECRET"),
    getCredentialField(organizationId, "google", "refresh_token", "GOOGLE_ADS_REFRESH_TOKEN"),
    getCredentialField(organizationId, "google", "customer_id", "GOOGLE_ADS_CUSTOMER_ID"),
  ]);
  return {
    devToken: devToken ?? "",
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
    refreshToken: refreshToken ?? "",
    customerId: customerId ?? "",
  };
}
```

Adicionar `organizationId: string` às funções exportadas e usar o helper.

- [ ] **Step 8.3: Atualizar `lib/tiktok/client.ts`**

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";

async function getTikTokCredentials(organizationId: string) {
  const [token, advertiserId] = await Promise.all([
    getCredentialField(organizationId, "tiktok", "access_token", "TIKTOK_ACCESS_TOKEN"),
    getCredentialField(organizationId, "tiktok", "advertiser_id", "TIKTOK_ADVERTISER_ID"),
  ]);
  return { token: token ?? "", advertiserId: advertiserId ?? "" };
}
```

Adicionar `organizationId` às funções exportadas do client TikTok.

- [ ] **Step 8.4: Atualizar `lib/linkedin/client.ts`**

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";

async function getLinkedInCredentials(organizationId: string) {
  const [token, accountId] = await Promise.all([
    getCredentialField(organizationId, "linkedin", "access_token", "LINKEDIN_ACCESS_TOKEN"),
    getCredentialField(organizationId, "linkedin", "account_id", "LINKEDIN_ACCOUNT_ID"),
  ]);
  return { token: token ?? "", accountId: accountId ?? "" };
}
```

- [ ] **Step 8.5: Atualizar `lib/ai/openai.ts`**

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";

async function getApiKey(organizationId: string): Promise<string> {
  const key = await getCredentialField(organizationId, "openai", "api_key", "OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY não configurada. Configure em Settings → Integrações.");
  return key;
}
```

Modificar `generateCopyVariations`, `scoreCreative`, `checkPolicy` para aceitar `organizationId: string` e usar `getApiKey(organizationId)`.

- [ ] **Step 8.6: Atualizar `lib/automation/email.ts`**

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";
```

Adicionar `organizationId: string` ao parâmetro de `sendAlertEmail`. Usar:

```typescript
const apiKey = await getCredentialField(organizationId, "resend", "api_key", "RESEND_API_KEY");
if (!apiKey) { console.info("[email] Resend não configurado — alerta não enviado"); return; }
```

- [ ] **Step 8.7: Atualizar `lib/pixel/meta-capi.ts`**

```typescript
import { getCredentialField } from "@/lib/integrations/credentials";
```

Adicionar `organizationId: string` e usar `getCredentialField(organizationId, "meta", "access_token", "META_ACCESS_TOKEN")`.

- [ ] **Step 8.8: Atualizar `lib/pixel/google-ec.ts`**

Mesmo padrão — reutiliza credenciais `google`.

- [ ] **Step 8.9: Atualizar os call sites**

Os route handlers que chamam esses clients precisam passar `session.organization.id`. Locais a atualizar:
- `app/api/campaigns/route.ts` — `createCampaignOnPlatform` e `syncCampaignsFromPlatform`
- `lib/campaigns/platform.ts` — expor `organizationId` nos helpers internos
- `lib/campaigns/sync.ts` — aceitar `organizationId`
- `app/api/creatives/generate/copy/route.ts` — `generateCopyVariations`
- `app/api/creatives/score/route.ts` — `scoreCreative`
- `app/api/creatives/policy-check/route.ts` — `checkPolicy`
- `lib/automation/evaluator.ts` — passar `organizationId` ao `sendAlertEmail`
- `lib/pixel/fanout.ts` — passar `organizationId` ao fan-out para CAPI/EC

- [ ] **Step 8.10: `tsc --noEmit` zero erros**

```bash
npx tsc --noEmit
```

- [ ] **Step 8.11: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos os testes anteriores (236+) passando.

- [ ] **Step 8.12: Commit**

```bash
git add lib/meta/client.ts lib/google/client.ts lib/tiktok/client.ts lib/linkedin/client.ts lib/ai/openai.ts lib/automation/email.ts lib/pixel/meta-capi.ts lib/pixel/google-ec.ts lib/campaigns/ app/api/campaigns/route.ts app/api/creatives/ lib/automation/evaluator.ts lib/pixel/fanout.ts
git commit -m "feat(integrations): refactor all API clients to read credentials from DB with env fallback"
```

---

## Task 9: Atualizar `.env.local.example` e rodar suite final

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 9.1: Reescrever `.env.local.example`**

```bash
# ── Supabase (infraestrutura — obrigatório) ───────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Stripe (monetização — obrigatório para billing) ───────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=

# ── Segurança ────────────────────────────────────────────────────────────────
CRON_SECRET=           # Qualquer string segura. Ex: openssl rand -hex 32
ENCRYPTION_KEY=        # 64 hex chars (32 bytes). Gerar: openssl rand -hex 32

# ── App ──────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─────────────────────────────────────────────────────────────────────────────
# As variáveis abaixo foram MOVIDAS para a UI de Integrações:
# Settings → Integrações → [plataforma]
#
# META_ACCESS_TOKEN / META_AD_ACCOUNT_ID
# GOOGLE_ADS_DEVELOPER_TOKEN / GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET
# GOOGLE_ADS_REFRESH_TOKEN / GOOGLE_ADS_CUSTOMER_ID
# TIKTOK_ACCESS_TOKEN / TIKTOK_ADVERTISER_ID
# LINKEDIN_ACCESS_TOKEN / LINKEDIN_ACCOUNT_ID
# OPENAI_API_KEY
# ANTHROPIC_API_KEY
# STABILITY_API_KEY / RUNWAY_API_KEY / ELEVENLABS_API_KEY
# RESEND_API_KEY
# WHATSAPP_TOKEN / WHATSAPP_PHONE_ID
# RTB_SSP_TOKEN
# ─────────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 9.2: Suite final completa**

```bash
npx tsc --noEmit && npx vitest run
```

Esperado: zero erros TypeScript, todos os testes passando.

- [ ] **Step 9.3: Commit final**

```bash
git add .env.local.example
git commit -m "feat(integrations): update .env.local.example — platform keys moved to UI"
```

---

## Self-review

**Spec coverage:**
- ✅ 12 provedores em 4 categorias implementados em `providers.ts`
- ✅ AES-256-GCM em `crypto.ts` com ENCRYPTION_KEY do env
- ✅ Credenciais write-only (GET retorna apenas status, nunca valores)
- ✅ `canManageIntegrations` adicionado ao RBAC
- ✅ Migration com RLS owner/admin
- ✅ Botão "Testar conexão" (modal + route /test)
- ✅ Fallback env vars garante zero breaking changes
- ✅ `lib/pixel/meta-capi.ts` e `google-ec.ts` reutilizam credenciais Meta/Google
- ✅ `.env.local.example` atualizado

**Type consistency:**
- `IntegrationStatus` definido em `types/database.ts` (Task 1), usado em `credentials.ts` (Task 3) e `route.ts` (Task 5) ✅
- `ProviderDef`, `CredentialField`, `TestResult` em `types.ts` (Task 4), usados em `providers.ts` e componentes ✅
- `Field` type nos componentes UI replica a estrutura de `CredentialField` sem importar o tipo server-only ✅

**Sem placeholders:** todas as implementações são completas com código real.
