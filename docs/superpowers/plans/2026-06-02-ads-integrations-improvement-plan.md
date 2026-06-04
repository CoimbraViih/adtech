# Plano de Melhoria — Integrações de Anúncios (Meta, Google, LinkedIn, TikTok)

**Data:** 2026-06-02
**Escopo:** `lib/meta`, `lib/google`, `lib/linkedin`, `lib/tiktok`, `lib/campaigns` (sync/platform), `lib/integrations`, `app/api/campaigns`
**Status:** Proposta — somente plano (nenhuma alteração de código aplicada)

Este documento compara o que já existe no projeto com a documentação oficial atual de cada plataforma (junho/2026) e organiza as melhorias em quatro frentes pedidas: **corretude de API**, **robustez**, **cobertura de features** e **atribuição / loop de otimização**.

---

## 1. Resumo do estado atual

O que já está implementado e funcional como base:

- **4 clients** (`lib/meta`, `lib/google`, `lib/tiktok`, `lib/linkedin`) com `list / create / update / insights` em nível de campanha.
- **Camada de abstração** (`lib/campaigns/platform.ts`) que roteia create/update por plataforma.
- **Sync** (`lib/campaigns/sync.ts`) que percorre as 4 plataformas e monta o objeto de upsert.
- **Credenciais multi-tenant** já existem: tabela `org_api_credentials` com criptografia (`lib/integrations/crypto.ts`), CRUD em `lib/integrations/credentials.ts` e `testConnection` por provider em `lib/integrations/providers.ts`.
- **Schema pronto** (`supabase/migrations/004_campaigns.sql`): `campaigns`, `ad_sets`, `ads` com métricas denormalizadas e RLS.
- **UI de integrações** (`app/(dashboard)/settings/integrations`) para colar tokens e testar conexão.

Ou seja: o **alicerce está bom**. Os problemas são (a) versões de API defasadas, (b) bugs de multi-tenant/auth, (c) o sync ainda é mock e (d) ausência de robustez (retry, paginação, refresh de token) e de cobertura (ad sets/ads, OAuth, conversões offline).

---

## 2. Achados críticos transversais (corrigir primeiro)

Estes itens afetam todas as plataformas e devem vir antes do resto.

### 2.1 O sync ainda é mock e está com gate errado
`lib/campaigns/sync.ts` faz `console.log` em vez de `supabase.from("campaigns").upsert(...)`, e cada bloco é condicionado a `process.env.META_ACCESS_TOKEN` etc. Como as credenciais reais vivem em `org_api_credentials` (por organização), **o sync nunca roda para um tenant real** — só rodaria se houvesse env vars globais. Da mesma forma, `app/api/campaigns` (GET) ainda retorna `MOCK_CAMPAIGNS`.

**Correção:** trocar o gate `process.env.*` por "tem credencial salva para o provider?" (`getCredentials(orgId, provider)`), e implementar o upsert real no Supabase com `onConflict: "workspace_id,external_id"`. Persistir também `ctr` e `cpc` (já existem colunas no schema).

### 2.2 Multi-tenant quebrado no Google
Em `lib/google/client.ts`, `getAccessToken()` e `getCredentials()` leem `process.env.GOOGLE_ADS_*` diretamente, ignorando as credenciais por organização (só o `refreshToken` é parcialmente repassado). Além disso, `cachedToken` é um **global de módulo sem chave por org** — em produção multi-tenant um tenant pode receber o access token de outro.

**Correção:** todas as credenciais (developer_token, client_id, client_secret, customer_id, login_customer_id) devem vir de `getGoogleCredentials(orgId)`; o cache de token deve ser keyed por `organizationId` (ou por refresh_token hash).

### 2.3 Token nunca é refrescado (exceto Google)
Meta, LinkedIn e TikTok hoje assumem um token de longa duração colado manualmente. Mas:
- **Meta**: token de usuário de longa duração expira em ~60 dias; System User token é o correto para servidor.
- **LinkedIn**: access token ~60 dias, com refresh token (refresh ~1 ano).
- **TikTok**: o access token de negócios é longo, mas o fluxo recomendado é OAuth com refresh.

Sem refresh, as integrações "quebram sozinhas" semanas depois de configuradas.

**Correção:** armazenar `refresh_token` + `expires_at` no `org_api_credentials` e ter um helper de refresh por provider, chamado antes de cada request quando perto de expirar (padrão já existente no Google, generalizar).

### 2.4 Sem rate limiting / retry / backoff nas chamadas de saída
Existe `lib/security/rate-limit` mas só é usado nas rotas internas. Nenhum client trata HTTP 429, `X-Business-Use-Case-Usage` (Meta), `RESOURCE_EXHAUSTED` (Google) ou `code 40100`/`50002` (TikTok).

**Correção:** criar um wrapper `fetchWithRetry` (backoff exponencial + jitter, respeito a `Retry-After`) e um limiter de saída por (org, provider).

### 2.5 Falha parcial silenciosa no sync
`sync.ts` só lança erro quando **as 4 plataformas falham** (`errors.length === 4`). Falha de 1–3 plataformas passa silenciosa e o usuário vê dados velhos sem aviso.

**Correção:** registrar status de sync por plataforma (sucesso/erro/última execução) numa tabela `sync_runs` e expor na UI; nunca engolir erro individual.

### 2.6 N+1 de insights
O sync chama `getInsights` uma vez por campanha. Com dezenas de campanhas isso estoura rate limit e fica lento.

**Correção:** usar relatórios em nível de conta com `level=campaign` (Meta `/insights`), GAQL único por customer (Google), `report/integrated/get` com lista de campanhas (TikTok), `adAnalytics` com pivot CAMPAIGN (LinkedIn) — 1 chamada de métricas por conta, não por campanha.

---

## 3. Por plataforma — versões e correções

### 3.1 Meta (Marketing API)

| Item | Atual no código | Documentação (jun/2026) | Ação |
|------|-----------------|--------------------------|------|
| Versão | `v21.0` | última **v25.0** (fev/2026); v23+ é o piso suportado | Subir para v23.0+ e centralizar a versão numa constante única |
| Auth | `access_token` na **query string** | recomendado header `Authorization: Bearer` | Mover token para header (evita vazar token em logs/proxies) |
| Token | usuário longo-prazo, sem refresh | **System User token** para servidor | Migrar para System User + checagem de expiração |
| Cobertura | só campanha | adset, ad, adcreative | Adicionar ad sets/ads (ver §4.3) |
| Insights | 1 chamada por campanha | `level=campaign` na conta | Batch por conta |

Observações adicionais: o objetivo `OUTCOME_*` mapeado está correto para a API nova (ODAX). Atenção a mudanças recentes: Advantage+ Shopping/App **não podem mais ser criados/atualizados via API** (a partir de v25, válido para todas as versões após mai/2026) — o create deve validar e bloquear esses casos com mensagem clara.

### 3.2 Google Ads API

| Item | Atual no código | Documentação (jun/2026) | Ação |
|------|-----------------|--------------------------|------|
| Versão | `v18` | última ~**v24.x**; **v21 chega a EOL em ago/2026**; releases agora **mensais** | Subir para v24+ e criar processo de bump (suporte de 1 ano por versão) |
| `login-customer-id` | recebe o **customer_id** | deve ser o **ID da conta gestora (MCC)** | Adicionar campo `login_customer_id` separado nas credenciais |
| Update de budget | `updateGoogleCampaign` **ignora** `dailyBudget` (só status) | budget é recurso à parte (`campaignBudgets:mutate`) | Implementar update real de budget |
| Multi-tenant | lê `process.env` (ver §2.2) | credencial por org | Corrigir conforme §2.2 |
| Mapeamento objetivo→canal | `sales` → `PERFORMANCE_MAX` fixo | canal é decisão de campanha, não derivada do objetivo | Tornar canal um campo explícito (Search/PMax/Display/Video) |

### 3.3 LinkedIn (Marketing API)

| Item | Atual no código | Documentação (jun/2026) | Ação |
|------|-----------------|--------------------------|------|
| Endpoint | `/v2/adCampaignsV2` (legado) | base **`/rest/adCampaigns`** versionada | Migrar para o namespace `/rest/` |
| Header de versão | `LinkedIn-Version: 202401` (antigo) | `Linkedin-Version: AAAAMM` mensal; versões >1 ano são **sunset** | Atualizar para versão corrente (ex.: `202605`) |
| Analytics | `/v2/adAnalyticsV2` | `/rest/adAnalytics` | Migrar |
| Criação com status | cria já `ACTIVE` | criar em `DRAFT` e ativar | Criar em DRAFT, ativar em passo separado |
| Header X-RestLi | `X-RestLi-Method` em update | usar protocolo Rest.li 2.0 (`X-RestLi-Protocol-Version: 2.0.0`) | Ajustar headers do partial update |

A `202401` muito provavelmente já está fora da janela de suporte (mín. 1 ano) — esta migração é **urgente** ou as chamadas começam a falhar.

### 3.4 TikTok (Business/Marketing API)

| Item | Atual no código | Documentação (jun/2026) | Ação |
|------|-----------------|--------------------------|------|
| Versão base | `open_api/v1.3` | **correto** (a Business API continua em v1.3; v2 é a API de conteúdo/consumer, outra coisa) | Manter |
| Paginação | `campaign/get` sem cursor | resposta traz `page_info` (`page`, `total_number`, `has_more`) | Iterar páginas até `has_more=false` |
| Refresh de token | inexistente | OAuth com refresh token (365 dias) | Implementar refresh |
| Rate limit | não tratado | limites por endpoint | Aplicar `fetchWithRetry` (§2.4) |
| Métricas | 1 chamada por campanha | `report/integrated/get` aceita lista de `campaign_id` | Batch por advertiser |

O TikTok é o client mais próximo do correto; faltam paginação, refresh e batch.

---

## 4. As quatro frentes — backlog detalhado

### Frente A — Corretude de API
1. Bump de versões: Meta v23+, Google v24+, LinkedIn `/rest/` + versão corrente. (TikTok ok.)
2. Meta: token via header `Authorization: Bearer`.
3. Google: corrigir multi-tenant (§2.2), `login_customer_id` separado, update de budget real.
4. LinkedIn: migração completa para `/rest/` + Rest.li 2.0 + criar em DRAFT.
5. Revisar mapeamentos objetivo/status/canal por plataforma e cobrir com testes unitários (já há `tests/unit/integrations-*`).

### Frente B — Robustez
1. `fetchWithRetry` central (backoff + jitter + `Retry-After`).
2. Limiter de saída por (org, provider) reaproveitando `lib/security/rate-limit`.
3. Refresh automático de token para Meta/LinkedIn/TikTok; cache de access token **keyed por org**.
4. Paginação real (LinkedIn `start/count`, TikTok `page`, Meta `paging.next`, Google sem limite fixo de 1000).
5. Tabela `sync_runs` + status por plataforma na UI; nada de falha silenciosa (§2.5).
6. Insights em batch por conta (§2.6).

### Frente C — Cobertura de features
1. **Sync real no Supabase** (§2.1) — sair do mock; é o desbloqueador de quase tudo.
2. **OAuth onboarding** em vez de colar token manual: rotas `/api/integrations/[provider]/oauth/start` e `/callback` para Meta, Google, LinkedIn e TikTok (reduz fricção e resolve refresh).
3. **Ad sets e ads**: estender clients e o sync para popular `ad_sets` e `ads` (schema já existe). Necessário para diagnóstico fino e para o loop de IA atuar no nível certo.
4. **Conversões offline / server-side**: ligar `lib/pixel/meta-capi.ts` e `lib/pixel/google-ec.ts` (já existem) ao fluxo de conversão para fechar o ciclo de mensuração.
5. **Webhooks** (onde houver): Meta Lead Ads / mudanças de status, para reduzir polling.

### Frente D — Atribuição / loop de otimização (o diferencial)
1. **Unificar métricas** das 4 plataformas + pixel próprio num modelo de atribuição comum (normalizar spend, conversions, revenue, ROAS, CPA por campanha/adset/ad).
2. **Reconciliação pixel × plataforma**: comparar conversões reportadas pela plataforma com as capturadas pelo pixel server-side; sinalizar divergências (o "ground truth" do produto).
3. **Realimentar o AI Traffic Manager** (M11, já concluído): usar o desempenho normalizado para alimentar a geração da próxima leva de criativos e recomendações de budget — fechando o "closed optimization loop" descrito no CLAUDE.md.
4. **Janela de atribuição configurável** por workspace e modelo (last-click, data-driven), persistida e aplicada no cálculo.

---

## 5. Roadmap priorizado

**~~Fase 1 — Tornar real e correto~~** ✅ Done (branch `feat/m-ads-integrations`, PR #10)
Sync real no Supabase (§2.1) · multi-tenant Google (§2.2) · bumps de versão e migração LinkedIn `/rest/` (§3) · update de budget Google · status de sync por plataforma (§2.5).
*Resultado: integrações funcionam de verdade por tenant, sem quebrar por versão sunset.*

**~~Fase 2 — Robustez~~** ✅ Done (branch `feat/m-ads-f2-robustness`, PR #11)
`fetchWithRetry` + limiter de saída · refresh de token Meta/LinkedIn/TikTok · paginação · insights em batch.
*Resultado: integrações que não caem sozinhas e aguentam volume.*

**~~Fase 3 — Cobertura~~** ✅ Done (branch `feat/m-ads-f3-coverage`, PR in progress — 2026-06-04)
OAuth onboarding · sync de ad sets/ads · conversões offline (CAPI/Enhanced Conversions) · webhooks.
*Resultado: onboarding sem fricção e dados em todos os níveis.*

**Fase 4 — Loop de otimização (2–3 semanas)** — Planned
Modelo de atribuição unificado · reconciliação pixel × plataforma · realimentação do AI Traffic Manager · janelas de atribuição.
*Resultado: o diferencial competitivo do produto, ligado de ponta a ponta.*

---

## 6. Checklist rápido de "quick wins" (baixo risco, alto valor)

- [ ] Meta: mover `access_token` da query para header.
- [ ] Meta: subir `v21.0` → `v23.0`+ (constante única).
- [ ] Google: subir `v18` → `v24`+; implementar update de budget; `login_customer_id` separado; cache de token por org.
- [ ] LinkedIn: `/v2/adCampaignsV2` → `/rest/adCampaigns` + versão corrente; criar em DRAFT.
- [ ] TikTok: paginação por `page_info`.
- [ ] Sync: trocar gate `process.env` por "tem credencial salva?" e implementar upsert real.
- [ ] Sync: parar de engolir falha parcial; registrar `sync_runs`.

---

## Fontes (documentação consultada)

- Meta — [Graph/Marketing API v23.0](https://developers.facebook.com/blog/post/2025/05/29/introducing-graph-api-v23-and-marketing-api-v23/) · [Versões](https://developers.facebook.com/docs/marketing-api/marketing-api-changelog/versions/) · [Changelog v24/v25](https://developers.facebook.com/docs/marketing-api/marketing-api-changelog/)
- Google Ads — [Sunset dates](https://developers.google.com/google-ads/api/docs/sunset-dates) · [Release notes](https://developers.google.com/google-ads/api/docs/release-notes) · [Releases mensais a partir de 2026](https://ppc.land/google-ads-api-shifts-to-monthly-releases-starting-january-2026/)
- LinkedIn — [Versionamento LMS](https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-05) · [Criar/gerenciar campanhas](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaigns?view=li-lms-2026-02) · [Mudanças recentes](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes?view=li-lms-2026-03)
- TikTok — [Rate limits Business API v1.3](https://business-api.tiktok.com/portal/docs/rate-limits-for-tto-api/v1.3) · [Gestão de access token](https://developers.tiktok.com/doc/oauth-user-access-token-management) · [Portal de docs](https://business-api.tiktok.com/portal/docs)
