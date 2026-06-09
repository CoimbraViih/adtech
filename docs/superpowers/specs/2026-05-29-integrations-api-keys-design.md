# Integrações & API Keys — Design Spec

**Data:** 2026-05-29  
**Branch:** `feat/integrations-api-keys`  
**Depende de:** MS (feat/ms-security merged), M1–M9

---

## Objetivo

Criar uma área de configuração no dashboard onde o owner/admin da organização cadastra suas chaves de API de plataformas externas (Meta Ads, Google Ads, TikTok, LinkedIn, OpenAI, Anthropic, etc.). As chaves são criptografadas e armazenadas no Supabase por organização. O `.env.local` passa a conter apenas variáveis de infraestrutura (Supabase, Stripe, Cron, chave de criptografia).

---

## Decisões de Design

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Escopo das credenciais | Por **organização** | Agência usa as mesmas contas em todos os workspaces; workspace scope adicionado depois se necessário |
| Layout | Abas por categoria + grid de cards + modal de edição | Visão geral rápida (A) + status por integração num relance (C) |
| Criptografia | AES-256-GCM via `ENCRYPTION_KEY` no `.env.local` | Chave no servidor, nunca no banco; sem dependência de KMS externo no MVP |
| Visibilidade dos valores | Write-only (estilo GitHub Secrets) | Chaves nunca voltam ao cliente em plaintext; apenas "configurado em DD/MM/YYYY" |
| Testar conexão | Chamada real à API do provedor | Validação real > validação de formato |
| Meta CAPI + Google EC | Reutilizam credenciais Meta Ads / Google Ads | Zero campos extras; detectado automaticamente |

---

## `.env.local` — estado final

```bash
# Infraestrutura (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Monetização (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=

# Segurança
CRON_SECRET=
ENCRYPTION_KEY=          # 64 hex chars (32 bytes) — gerado uma vez: openssl rand -hex 32

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Todas as demais chaves (Meta, Google, TikTok, LinkedIn, OpenAI, Anthropic, Stability, Runway, ElevenLabs, Resend, WhatsApp, RTB) saem do `.env.local` e entram na UI de Integrações.

---

## Provedores suportados

### Anúncios
| Provider key | Nome | Campos |
|---|---|---|
| `meta` | Meta Ads | `access_token`, `ad_account_id` |
| `google` | Google Ads | `developer_token`, `client_id`, `client_secret`, `refresh_token`, `customer_id` |
| `tiktok` | TikTok Ads | `access_token`, `advertiser_id` |
| `linkedin` | LinkedIn Ads | `access_token`, `account_id` |

### IA / Criativos
| Provider key | Nome | Campos |
|---|---|---|
| `openai` | OpenAI | `api_key` |
| `anthropic` | Anthropic | `api_key` |
| `stability` | Stability AI | `api_key` |
| `runway` | Runway ML | `api_key` |
| `elevenlabs` | ElevenLabs | `api_key` |

### Comunicação
| Provider key | Nome | Campos |
|---|---|---|
| `resend` | Resend | `api_key` |
| `whatsapp` | WhatsApp Business | `token`, `phone_id` |

### Programático
| Provider key | Nome | Campos |
|---|---|---|
| `rtb` | RTB / SSP | `ssp_token` |

> Meta CAPI e Google Enhanced Conversions não aparecem na UI — reutilizam `meta` e `google` automaticamente.

---

## Arquitetura

### Banco de dados

```sql
-- supabase/migrations/014_api_credentials.sql
CREATE TABLE org_api_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  credentials     TEXT NOT NULL,   -- AES-256-GCM encrypted JSON blob
  last_tested_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);
-- RLS: owner/admin do org pode SELECT/INSERT/UPDATE/DELETE
-- Service role: acesso total para os API clients server-side
```

### Criptografia

`lib/integrations/crypto.ts`
- `encrypt(plaintext: string): string` → `"iv:authTag:ciphertext"` (hex)
- `decrypt(blob: string): string` → plaintext
- Usa `crypto.createCipheriv("aes-256-gcm", key, iv)` do Node
- `ENCRYPTION_KEY` = 32 bytes em hex (64 chars) do `.env.local`

### Acesso às credenciais pelos clients

`lib/integrations/credentials.ts`
- `getCredentials(organizationId: string, provider: string): Promise<Record<string, string> | null>`
  - Faz SELECT no Supabase (service role), decripta o blob, retorna o objeto
  - Retorna `null` se não configurado
- `upsertCredentials(organizationId, provider, fields): Promise<void>`
  - Encripta o objeto, faz UPSERT no banco
- `deleteCredentials(organizationId, provider): Promise<void>`
- `markTested(organizationId, provider): Promise<void>`

### Definições de provedores

`lib/integrations/providers.ts`
- Exporta `PROVIDERS: Record<string, ProviderDef>` com:
  - `label`, `category`, `fields[]`, `docsUrl`, `testConnection(creds) → Promise<TestResult>`
- `testConnection` faz chamada mínima real à API do provedor:
  - **Meta:** `GET /me?fields=id,name&access_token=...`
  - **Google:** list campaigns com developer_token (lightweight)
  - **TikTok:** `GET /advertiser/info/` com access_token
  - **LinkedIn:** `GET /organizationAcls` 
  - **OpenAI:** `GET /models` com Bearer token
  - **Anthropic:** POST mínimo para `/v1/messages` (1 token)
  - **Stability AI:** `GET /v1/user/balance`
  - **Runway:** `GET /v1/user`
  - **ElevenLabs:** `GET /v1/user`
  - **Resend:** `GET /domains` com Bearer
  - **WhatsApp:** `GET /{phone_id}` com Bearer
  - **RTB:** validação local (token presente e não vazio)

### Refatoração dos API clients

Cada client existente passa a aceitar um `organizationId` e chama `getCredentials()` em vez de `process.env`:

```typescript
// Antes:
const token = process.env.META_ACCESS_TOKEN ?? "";

// Depois:
const creds = await getCredentials(organizationId, "meta");
const token = creds?.access_token ?? "";
if (!token) throw new Error("Meta Ads não configurado para esta organização.");
```

Clients afetados:
- `lib/meta/client.ts`
- `lib/google/client.ts`
- `lib/tiktok/client.ts`
- `lib/linkedin/client.ts`
- `lib/ai/openai.ts`
- `lib/automation/email.ts` (Resend)
- `lib/pixel/meta-capi.ts` (reutiliza credenciais Meta)
- `lib/pixel/google-ec.ts` (reutiliza credenciais Google)
- `lib/rtb/bidder.ts` (RTB token)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/014_api_credentials.sql` | Criar | Tabela `org_api_credentials` + RLS |
| `lib/integrations/crypto.ts` | Criar | AES-256-GCM encrypt/decrypt |
| `lib/integrations/credentials.ts` | Criar | CRUD de credenciais no Supabase |
| `lib/integrations/providers.ts` | Criar | Definições + testConnection por provedor |
| `lib/integrations/types.ts` | Criar | Tipos: `ProviderDef`, `CredentialField`, `TestResult` |
| `app/api/settings/integrations/route.ts` | Criar | GET (lista status) |
| `app/api/settings/integrations/[provider]/route.ts` | Criar | POST (salvar), DELETE |
| `app/api/settings/integrations/[provider]/test/route.ts` | Criar | POST (testar conexão) |
| `app/(dashboard)/settings/integrations/page.tsx` | Criar | Server Component — página principal |
| `components/settings/integrations-grid.tsx` | Criar | Client Component — abas + grid de cards |
| `components/settings/integration-card.tsx` | Criar | Card individual com status + botões |
| `components/settings/integration-modal.tsx` | Criar | Modal de configuração/edição |
| `lib/meta/client.ts` | Modificar | Ler credenciais do DB |
| `lib/google/client.ts` | Modificar | Ler credenciais do DB |
| `lib/tiktok/client.ts` | Modificar | Ler credenciais do DB |
| `lib/linkedin/client.ts` | Modificar | Ler credenciais do DB |
| `lib/ai/openai.ts` | Modificar | Ler credenciais do DB |
| `lib/automation/email.ts` | Modificar | Ler credenciais do DB |
| `lib/pixel/meta-capi.ts` | Modificar | Reutilizar credenciais Meta |
| `lib/pixel/google-ec.ts` | Modificar | Reutilizar credenciais Google |
| `components/layout/sidebar.tsx` | Modificar | Adicionar link "Integrações" em Settings |
| `tests/unit/integrations-crypto.test.ts` | Criar | Testes de encrypt/decrypt |
| `tests/unit/integrations-credentials.test.ts` | Criar | Testes de CRUD com mock Supabase |
| `tests/unit/integrations-providers.test.ts` | Criar | Testes de field validation por provider |

---

## Fluxo de dados

```
Usuário preenche modal → POST /api/settings/integrations/[provider]
  → requireServerSession() + canManageIntegrations() (owner/admin)
  → encrypt(JSON.stringify(fields))
  → upsertCredentials(org_id, provider, encrypted_blob)
  → retorna { ok: true } — NUNCA retorna os valores

API client (ex: createCampaignOnPlatform) → getCredentials(org_id, "meta")
  → SELECT encrypted_blob FROM org_api_credentials WHERE organization_id = org_id AND provider = "meta"
  → decrypt(blob) → { access_token, ad_account_id }
  → usa as credenciais na chamada à API
```

---

## Segurança

- Credenciais **nunca** retornam ao cliente em plaintext — `GET /api/settings/integrations` retorna apenas `{ provider, configured: true, last_tested_at }`
- Campos no modal exibem `••••••••••` para credenciais já salvas (write-only)
- Apenas roles `owner` e `admin` podem criar/editar/deletar integrações
- `ENCRYPTION_KEY` nunca vai para o banco; fica exclusivamente no `.env.local`
- Blob criptografado usa IV aleatório por operação (AES-256-GCM) — mesmo valor gera cipher diferente
- RLS no Supabase: leitura/escrita restrita ao `organization_id` do usuário autenticado

---

## RBAC

| Ação | Roles permitidas |
|------|-----------------|
| Ver lista de integrações (status) | owner, admin, member, viewer |
| Configurar / editar credenciais | owner, admin |
| Deletar credenciais | owner, admin |
| Testar conexão | owner, admin |

---

## Tratamento de erros

- Credencial não configurada → API client lança `IntegrationNotConfiguredError` → route handler retorna `{ error: "Meta Ads não configurado. Configure em Settings → Integrações." }` com status 503
- Teste de conexão falha → retorna `{ ok: false, message: "Token inválido ou expirado." }` — nunca expõe o token
- `ENCRYPTION_KEY` ausente → `assertSecretsNotPublic()` já verifica; adicionalmente `crypto.ts` lança no módulo se ausente

---

## Testes

- **Unit:** `crypto.ts` (round-trip encrypt/decrypt, IV aleatório), `credentials.ts` (CRUD com Supabase mockado), `providers.ts` (fields de cada provider, labels)
- **Integration:** API routes com mock de session e Supabase
- **E2E:** Não neste ciclo — requer chaves reais de sandbox

---

## Fora do escopo (post-MVP)

- Escopo por workspace (per-workspace credentials)
- Rotação automática de tokens OAuth2 (Google refresh token)
- Audit log de quando a chave foi alterada e por quem
- Múltiplas contas por provedor (ex: 2 contas Meta na mesma organização)
