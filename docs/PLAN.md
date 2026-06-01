# AdFlow — Plano de Execução

> Interface primeiro, backend depois. Cada milestone é uma branch, termina num commit de merge e entrega um incremento funcional e testável.

> **Agentes disponíveis:** `@frontend-developer` · `@nextjs-architecture-expert` · `@typescript-pro` · `@security-auditor` · `@code-reviewer` · `@api-security-audit` · `@prompt-engineer`
>
> **Skills disponíveis:** `/brainstorming` antes de qualquer decisão de design ou feature · `/frontend-design` para UI/componentes visuais · `/ui-ux-pro-max` para design system e layouts · `/tailwind-patterns` para padrões Tailwind v4 · `/senior-frontend` para performance e padrões React/Next.js · `/supabase` para qualquer coisa Supabase (auth, RLS, migrations, realtime) · `/supabase-postgres-best-practices` para otimização de queries e schema · `/stripe:stripe-best-practices` para integrações Stripe · `/vercel:nextjs` · `/vercel:deploy` · `/vercel:env` · `/vercel:deployments-cicd` · `/vercel:auth` · `/vercel:vercel-functions` · `/vercel:runtime-cache` · `/vercel:next-cache-components` · `/claude-api` para integrações com Anthropic SDK · `/webapp-testing` para testes E2E e unitários · `/web-performance-optimization` para Core Web Vitals · `/writing-plans` para detalhar um milestone em plano step-by-step · `/commit` para gerar mensagens de commit · `/feature-dev:feature-dev` para desenvolvimento guiado de features completas · `/security-review` para auditoria de segurança da branch · `/code-reviewer` para revisão de PR · `/simplify` para refatorar código após implementação

---

## Visão geral

| # | Milestone | Branch | Depende de |
|---|-----------|--------|------------|
| M0 | Setup & Design System | `feat/m0-setup` ✅ | — |
| M1 | Autenticação & Shell | `feat/m1-auth` ✅ | M0 |
| M2 | Gestão de Campanhas | `feat/m2-campaigns` ✅ | M1 |
| M3 | AI Creative Studio | `feat/m3-creatives` ✅ | M1, M2 |
| M4 | Pixel & Tracking | `feat/m4-pixel-tracking` ✅ | M1 |
| M5 | Analytics & Atribuição | `feat/m5-analytics-attribution` ✅ | M1, M4 |
| M6 | Landing Page AdFlow | `feat/m6-landing` ✅ | M1 |
| M7 | Automação & Alertas | `feat/m7-automation` ✅ | M1, M2, M4, M5 |
| M8 | Programático DSP/SSP | `feat/m8-programmatic` ✅ | M1, M2, M4 |
| M9 | Monetização & Stripe | `feat/m9-stripe` ✅ | M1–M5 |
| MS | Segurança & Hardening | `feat/ms-security` | M1–M9 |
| M10 | Deploy & Produção | `feat/m10-deploy` | M1–M9, MS |
| M11 | AI Traffic Manager (Campaign Diagnostics) | `feat/integrations-api-keys` ✅ | M2, M4, M5 |

---

## M0 — Setup & Design System ✅ CONCLUÍDO

**Branch:** `feat/m0-setup` → mergeado em `main` via PR #1  
**Objetivo:** Repositório configurado, design system funcional, zero código de produto ainda — só a fundação visual e de tooling.

> **Agentes:** `@frontend-developer` · `@nextjs-architecture-expert` · `@security-auditor`
> **Skills:** `/brainstorming` antes de decidir a estrutura de tokens · `/frontend-design` para validar a paleta e tipografia · `/ui-ux-pro-max` para design system · `/tailwind-patterns` para configuração Tailwind v4 · `/vercel:nextjs` para scaffold correto do App Router · `/webapp-testing` para configurar Vitest e Playwright · `/security-review` antes do merge · `/commit` para o commit final

### Interface
- [x] Scaffold Next.js 15 com App Router, TypeScript strict, Tailwind v4
- [x] Instalar e configurar shadcn/ui
- [x] Definir tokens de cor em `app/globals.css` (`--adflow-base`, `--adflow-surface`, `--adflow-border`, `--adflow-muted`, `--adflow-accent`, `--adflow-success`, `--adflow-data`, `--adflow-warning`, `--adflow-danger`)
- [x] Configurar fonte Inter + JetBrains Mono via `next/font/google` no root layout
- [x] App shell completo: sidebar colapsável (desktop) + Sheet hamburger (mobile), topbar, org-switcher, user-menu
- [x] Dashboard placeholder com 4 KPI cards (ROAS, CPA, Spend, Conversões)
- [x] Auth pages: login (magic link + Google OAuth) e signup
- [x] Tokens CSS mapeados como classes Tailwind via `@theme inline` no `globals.css`

### Backend / Config
- [x] Criar `.env.local.example` com todas as variáveis necessárias
- [x] Configurar `next.config.ts` (domínios de imagem, CSP + headers de segurança)
- [x] Configurar `tsconfig.json` com path alias `@/*`
- [x] Instalar e configurar Vitest (`vitest.config.ts`)
- [x] Instalar e configurar Playwright (`playwright.config.ts`)
- [x] Criar `app/api/health/route.ts` retornando `{ status: "ok" }`
- [x] Escrever teste unitário do health endpoint

### Segurança ✅ revisado em 2026-05-15
- [x] `.gitignore` cobre `.env*`, `*.pem`, `*.key`, `.vercel`, `.supabase`, `node_modules`, `.next`, `coverage`, `playwright-report`, `test-results`
- [x] `.env.local` não aparece em `git status` — confirmado via `git check-ignore -v .env.local`
- [x] Nenhuma chave de API prefixada `NEXT_PUBLIC_` no código — build estático confirmado limpo
- [x] Headers CSP configurados em `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `frame-ancestors 'none'`
- [x] **Bug corrigido:** `<form onSubmit>` estava em Server Components (login/signup pages) — extraído para `components/auth/login-form.tsx` e `signup-form.tsx` com `'use client'`; `npm run build` passa sem erros

### Entregáveis
- PR #1 mergeado: https://github.com/CoimbraViih/adtech/pull/1
- `tsc --noEmit` zero erros
- `vitest run` 1/1 passando
- Dark mode permanente via `class="dark"` no `<html>`

---

## M1 — Autenticação & Shell ✅ CONCLUÍDO

**Branch:** `feat/m1-auth` → mergeado em `main`  
**Objetivo:** Usuário consegue criar conta, logar, ver o dashboard shell com sidebar/topbar e fazer logout. Multi-tenant (org + workspace) funcionando com RBAC.

> **Agentes:** `@frontend-developer` · `@nextjs-architecture-expert` · `@typescript-pro` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/brainstorming` para definir fluxo de auth e onboarding · `/supabase` para criar o projeto, migrations e RLS policies · `/supabase-postgres-best-practices` para schema das tabelas core · `/vercel:auth` para integração Supabase Auth + Next.js · `/vercel:nextjs` para middleware de proteção de rotas · `/frontend-design` para login e wizard de onboarding · `/writing-plans` para detalhar as migrations em step-by-step · `/security-review` antes do merge · `/webapp-testing` para E2E de auth · `/commit` para o commit final

### Interface
- [x] `components/auth/login-form.tsx` — magic link + Google OAuth, loading states, inline validation, success state, dev-login link em não-produção
- [x] `components/auth/signup-form.tsx` — Zod validation, success state, redirect automático para onboarding
- [x] `components/auth/user-menu.tsx` — dropdown com nome, e-mail, plano, logout com spinner
- [x] `components/onboarding/onboarding-wizard.tsx` — wizard 2 passos (org → workspace) com StepBar, radio de tipo de org, server error banner
- [x] `app/(auth)/login/page.tsx` + `app/(auth)/signup/page.tsx` — páginas de auth
- [x] `app/(auth)/onboarding/page.tsx` — página de onboarding (rota pública)

### Backend / Fake data (pronto para swap-in Supabase)
- [x] `types/database.ts` — tipos completos: `OrgPlan`, `OrgRole`, `Organization`, `Workspace`, `Profile`, `OrganizationMember`, `WorkspaceMember`, `BillingEvent`, `AuthUser`, `SessionContext`
- [x] `lib/auth/session.ts` — `encodeSession`, `decodeSession`, `buildSessionCookie`, `clearSessionCookie`, `getSessionFromCookies`, `FAKE_SESSION`
- [x] `lib/auth/actions.ts` — Server Actions: `sendMagicLink`, `signUp`, `completeOnboarding`, `logout`, `devLogin` (prod-bloqueado)
- [x] `lib/auth/roles.ts` — RBAC completo: hierarquia de roles + 8 helpers + `roleLabel`
- [x] `lib/supabase/client.ts` — browser stub
- [x] `lib/supabase/server.ts` — `getServerSession`, `requireServerSession`, `getUser`
- [x] `lib/supabase/middleware.ts` — `updateSession` stub
- [x] `middleware.ts` — proteção de rotas (PUBLIC_PATHS / AUTH_ONLY / superadmin / protected)
- [x] `app/(auth)/callback/route.ts` — handler OAuth fake (sem try/catch em torno de redirect)
- [x] `app/api/auth/dev-login/route.ts` — GET shortcut para dev (bloqueado em produção)
- [x] `supabase/migrations/001_initial_schema.sql` — schema core (5 tabelas + triggers)
- [x] `supabase/migrations/002_rbac.sql` — 20 RLS policies + helper functions
- [x] `supabase/migrations/003_billing.sql` — `billing_events` append-only + índice de idempotência

### Testes
- [x] `tests/unit/session.test.ts` — 17 testes: encode/decode, cookie helpers, getSessionFromCookies
- [x] `tests/unit/roles.test.ts` — 38 testes: todos os helpers RBAC em todas as roles
- [x] `tests/unit/middleware.test.ts` — 18 testes: routeDecision (public / auth-only / protected / superadmin / cookie corrompido)
- [x] `tests/e2e/auth.spec.ts` — 25 testes E2E: route protection, login/signup forms, onboarding wizard, logout, dev-login cookie

### Entregáveis
- `tsc --noEmit` zero erros
- `vitest run` 73/73 passando
- Fake session layer com TODO(M1-backend) em todos os pontos de swap-in
- Merge commit: `feat/m1-auth` → `main`

---

## M2 — Gestão de Campanhas ✅ CONCLUÍDO

**Branch:** `feat/m2-campaigns` → mergeado em `main` via PR #2  
**Objetivo:** Gestor de tráfego consegue criar, visualizar, pausar e arquivar campanhas. Integração real com Meta e Google (leitura + escrita de campanhas).

### Interface
- [x] `app/(dashboard)/campaigns/page.tsx` — 4 KPI cards (Gasto, ROAS, CPA, Conversões) + tabela completa
- [x] `app/(dashboard)/campaigns/new/page.tsx` — wizard 4-passos: plataforma → público → orçamento → revisão
- [x] `app/(dashboard)/campaigns/[id]/page.tsx` — 8 métricas + Recharts (ROAS/Spend, Cliques/Impressões, Conversões/CPA) + ad sets
- [x] `components/campaigns/campaign-table.tsx` — busca, filtros plataforma/status, ordenação por coluna, paginação, row actions
- [x] `components/campaigns/campaign-form.tsx` — React Hook Form + Zod, card selector de plataforma, radio objetivos
- [x] `components/campaigns/status-badge.tsx` — badge colorido (ativo/pausado/rascunho/arquivado/in_review/rejected)
- [x] `components/campaigns/platform-icon.tsx` — SVG inline Meta/Google/Programático com tamanho por inline style
- [x] `components/campaigns/campaign-charts.tsx` — Recharts dual-axis com dark tooltip customizado
- [x] `components/campaigns/ad-sets-table.tsx` — tabela estática de conjuntos de anúncios

### Backend / API
- [x] Migration `004_campaigns.sql`: enums + tabelas `campaigns`, `ad_sets`, `ads` + RLS completo
- [x] `app/api/campaigns/route.ts` — GET (lista, filtros platform/status, sync opcional) + POST (criar)
- [x] `app/api/campaigns/[id]/route.ts` — GET + PATCH + DELETE com Zod validation e RBAC
- [x] `lib/meta/client.ts` — Meta Marketing API v21.0 (list, create, update, insights)
- [x] `lib/google/client.ts` — Google Ads API v18 via OAuth2 (GAQL list, mutate, metrics)
- [x] `lib/campaigns/platform.ts` — abstração `createCampaignOnPlatform` / `updateCampaignOnPlatform`
- [x] `lib/campaigns/sync.ts` — `syncCampaignsFromPlatform(workspaceId)` Meta + Google
- [x] Mock data: 6 campanhas, 3 ad sets, 2 ads, 30 dias de snapshots de métricas

### Entregáveis
- PR #2 mergeado: https://github.com/CoimbraViih/adtech/pull/2
- `tsc --noEmit` zero erros
- API verificada: GET/PATCH/DELETE/POST todos passando com validação e auth
- Dados gateados atrás de `TODO(M2-backend)` para swap-in Supabase

---

## M3 — AI Creative Studio ✅ CONCLUÍDO

**Branch:** `feat/m3-creatives` → mergeado em `main`  
**Objetivo:** Gestor gera copy (headlines, descrições, CTAs) via GPT-4o com score de qualidade 0-100 e checagem de política Meta/Google. Banners e vídeos removidos do escopo MVP (postergados para pós-MVP com Stability AI e Runway).

### Interface
- [x] `app/(dashboard)/creatives/page.tsx` — galeria de copies com 3 KPI cards (score médio, total, aprovadas por política)
- [x] `app/(dashboard)/creatives/new/page.tsx` — estúdio copy-only: gerador à esquerda + painel salvar à direita
- [x] `app/(dashboard)/creatives/[id]/page.tsx` — conteúdo (headline, descrição, CTA), score gauge, policy checker, histórico de versões, prompt utilizado, campanha vinculada
- [x] `components/creatives/copy-generator.tsx` — briefing textarea + botão gerar + variações colapsáveis com copiar/usar
- [x] `components/creatives/creative-score.tsx` — gauge SVG circular 0-100 com breakdown por critério (clareza, urgência, CTA, conformidade, relevância)
- [x] `components/creatives/policy-checker.tsx` — checklist Meta/Google com ícones aprovado/reprovado e detalhe de correção
- [x] `components/creatives/creative-card.tsx` — card da galeria com thumbnail, score, status badge, campanha vinculada
- [x] `components/creatives/creative-type-badge.tsx` — badge por tipo com ícone

### Backend / API
- [x] Migration `005_creatives.sql`: tabelas `creatives`, `creative_versions` com enums, 5 índices e 6 RLS policies
- [x] `app/api/creatives/route.ts` — GET (lista, filtros type/status/campaign_id) + POST (salvar) com RBAC + Zod
- [x] `app/api/creatives/generate/copy/route.ts` — POST: briefing → GPT-4o → variações; fallback mockado sem `OPENAI_API_KEY`
- [x] `app/api/creatives/score/route.ts` — POST: criativo → score 0-100 com breakdown; fallback mockado
- [x] `app/api/creatives/policy-check/route.ts` — POST: criativo → checagem de política Meta/Google; fallback mockado
- [x] `lib/ai/openai.ts` — wrapper OpenAI com retry exponencial (3 tentativas, backoff 500ms×2ⁿ), funções: `generateCopyVariations`, `scoreCreative`, `checkPolicy`
- [x] `lib/creatives/mock-data.ts` — 5 copies com scores, policy items e status variados; 4 variações mock para dev

### Entregáveis
- Merge commit: `feat/m3-creatives` → `main`
- `tsc --noEmit` zero erros
- `vitest run` 73/73 passando
- Dados gateados atrás de `TODO(M3-backend)` para swap-in Supabase
- Fallback automático para mocks quando `OPENAI_API_KEY` não configurada

---

## M4 — Pixel & Tracking Server-Side ✅ CONCLUÍDO

**Branch:** `feat/m4-pixel-tracking` → mergeado em `main`  
**Objetivo:** `adflow.js` instalável em qualquer site. Eventos capturados server-side, integrados ao Meta CAPI e Google Enhanced Conversions. Dashboard de pixels com busca e filtros.

### Interface
- [x] `app/(dashboard)/pixel/page.tsx` — lista de pixels com `CreatePixelDialog` e busca/filtros via `PixelListClient`
- [x] `app/(dashboard)/pixel/[id]/page.tsx` — detalhe: 3 KPI cards, snippet de instalação, log de eventos mockado
- [x] `components/pixel/pixel-list-client.tsx` — busca por nome/ID + filtros (Todos/Meta/Google/Sem plataforma)
- [x] `components/pixel/pixel-snippet.tsx` — bloco de código com botão copiar, feedback "Copiado!"
- [x] `components/pixel/create-pixel-dialog.tsx` — dialog com validação (name required, meta_pixel_id/google_tag_id opcionais)
- [x] `components/pixel/pixel-table.tsx` — tabela com link para detalhe de cada pixel
- [x] `components/pixel/event-log-table.tsx` — tabela de eventos com tipo colorido, URL, valor monetário, timestamp

### Backend / API
- [x] `supabase/migrations/006_pixel.sql` — enum `pixel_event_type`, tabelas `pixels` + `pixel_events`, 4 RLS policies, 2 índices
- [x] `public/adflow.js` — IIFE 2.4KB: pageview automático, `window.adflow("track", ...)`, sendBeacon + XHR fallback, IE11+
- [x] `app/api/pixel/[id]/route.ts` — endpoint público: OPTIONS (CORS preflight) + POST (ingestion), validação Zod, fan-out assíncrono
- [x] `app/api/pixels/route.ts` — GET (lista autenticada) + POST (criar pixel com validação Zod)
- [x] `lib/pixel/validate.ts` — schema Zod de PixelEvent com enum de tipos, URL max 2048, value nonnegative, currency 3 chars
- [x] `lib/pixel/meta-capi.ts` — wrapper Meta CAPI v18.0 com mapeamento de tipos de evento
- [x] `lib/pixel/google-ec.ts` — wrapper GA4 Measurement Protocol com mapeamento de tipos de evento
- [x] `lib/pixel/fanout.ts` — `Promise.allSettled` para fan-out sem bloquear response, erros logados
- [x] `lib/supabase/service.ts` — stub de service-role client (TODO(M1-backend) para swap-in)

### Testes
- [x] `tests/unit/pixel-validate.test.ts` — 7 testes: validação Zod (payloads válidos e inválidos)
- [x] `tests/unit/pixel-fanout.test.ts` — 4 testes: fan-out correto, skip sem IDs, tolerância a falha de adapter
- [x] `tests/unit/pixel-route.test.ts` — 4 testes: rota de ingestion (204, 400, 404)
- [x] `tests/unit/pixel-list-filter.test.ts` — 9 testes: busca e filtros por plataforma
- [x] `tests/e2e/pixel.spec.ts` — 18 testes E2E: lista, criar pixel, detalhe, log de eventos

### Entregáveis
- `vitest run` 97/97 passando
- `tsc --noEmit` zero erros novos (erro pré-existente em `lib/pixel/validate.ts:11` documentado)
- CORS configurado no endpoint público (`Access-Control-Allow-Origin: *`)
- Dados gateados atrás de `TODO(M4-backend)` para swap-in Supabase
- Merge commit: `feat/m4-pixel-tracking` → `main`

---

## M5 — Analytics & Atribuição ✅ CONCLUÍDO

**Branch:** `feat/m5-analytics-attribution` → mergeado em `main` via PR #4  
**Objetivo:** Dashboard de analytics com atribuição multi-touch (last-click, linear, time-decay) e dashboard overview completo com cockpit executivo + hub de navegação.

### Interface
- [x] `app/(dashboard)/analytics/page.tsx` — dashboard: filtros de período, seletor de modelo de atribuição, 5 KPI cards, funil de conversão, tabela de canais
- [x] `components/analytics/kpi-cards.tsx` — 5 cards: Total de Eventos, Conversões, Receita, CPA, Ticket Médio
- [x] `components/analytics/funnel-chart.tsx` — Recharts BarChart horizontal com drop-off por etapa
- [x] `components/analytics/channel-table.tsx` — tabela de canais com share de atribuição e barra visual
- [x] `components/analytics/attribution-model-selector.tsx` — seletor de modelo (last-click / linear / time-decay) via URL param
- [x] `components/analytics/date-range-picker.tsx` — picker de período (substituído pelo GlobalDateFilter)
- [x] `components/shared/global-date-filter.tsx` — filtro compartilhado: presets (Hoje/7/30/90 dias), "Todo o período", picker customizado, toggle de comparação (período ant. / ano ant. / desligado)
- [x] `components/dashboard/dashboard-kpi-strip.tsx` — 6 KPI cards com deltas (Spend, Receita, ROAS, CPA, Conversões, CTR)
- [x] `components/dashboard/revenue-bar-chart.tsx` — Recharts BarChart receita por dia
- [x] `components/dashboard/roas-spend-chart.tsx` — Recharts LineChart dual-axis ROAS + Spend
- [x] `components/dashboard/impressions-conversions-chart.tsx` — Recharts AreaChart com gradientes SVG
- [x] `components/dashboard/campaign-status-hub.tsx` — breakdown de status (ativa/pausada/draft/arquivada) com barra empilhada
- [x] `components/dashboard/section-hub-cards.tsx` — hub cards para Criativos, Pixel, Analytics
- [x] `components/dashboard/top-campaigns-table.tsx` — top-5 campanhas por ROAS
- [x] GlobalDateFilter adicionado a todas as seções: Analytics, Campanhas, Criativos, Pixel

### Backend / API
- [x] `supabase/migrations/007_analytics_views.sql` — views `daily_event_counts` e `conversion_sessions`
- [x] `app/api/analytics/summary/route.ts` — GET: KPIs agregados por período e workspace
- [x] `app/api/analytics/funnel/route.ts` — GET: etapas do funil com drop-off rates
- [x] `app/api/analytics/channels/route.ts` — GET: atribuição por canal com modelo escolhido
- [x] `lib/analytics/attribution.ts` — motores: `applyLastClick`, `applyLinear`, `applyTimeDecay`, `extractChannel`, `rollupChannels`
- [x] `lib/analytics/aggregates.ts` — `getKpiSummary`, `getFunnelSteps`, `getChannelAttribution`
- [x] `lib/dashboard/mock-data.ts` — helpers determinísticos: KPIs, deltas, time-series, status counts, top campaigns, creatives summary

### Testes
- [x] `tests/unit/attribution.test.ts` — 7 testes: todos os 3 modelos de atribuição
- [x] `tests/unit/analytics-aggregates.test.ts` — 4 testes: KPI, funil, canal
- [x] `tests/e2e/analytics.spec.ts` — 14 testes E2E: dashboard de analytics completo

### Entregáveis
- PR #4 mergeado: https://github.com/CoimbraViih/adtech/pull/4
- `tsc --noEmit` zero erros
- `vitest run` 11/11 testes unitários passando
- Dados gateados atrás de `TODO(M5-backend)` para swap-in Supabase

---

## M6 — Landing Page AdFlow ✅ CONCLUÍDO

**Branch:** `feat/m6-landing` → mergeado em `main` via PR #7  
**Objetivo:** Landing page pública de marketing da AdFlow — apresenta o produto, converte visitantes em leads/trial e transmite credibilidade para agências e anunciantes brasileiros.

### Interface
- [x] `app/(marketing)/layout.tsx` — header sticky com logo + nav (Features, Preços, FAQ, Login) + footer
- [x] `app/(marketing)/page.tsx` — landing page completa montada com todas as seções
- [x] `components/marketing/hero.tsx` — headline, sub-headline, CTA "Começar grátis" + "Ver demo", stats strip (campanhas, criativos, eventos), mockup do dashboard
- [x] `components/marketing/features.tsx` — 6 pilares: Campanhas Unificadas, AI Creative Studio, Pixel Server-Side, Analytics Multi-Touch, Programático RTB, Automação de Alertas
- [x] `components/marketing/social-proof.tsx` — logos placeholder, depoimentos, métricas de confiança
- [x] `components/marketing/pricing.tsx` — Free / Pro (R$500/mês) / Agency (R$3.000/mês) com feature list e CTAs
- [x] `components/marketing/faq.tsx` — acordeão com perguntas frequentes de agências brasileiras
- [x] `components/marketing/cta-banner.tsx` — seção final de conversão com fundo accent
- [x] `components/marketing/waitlist-form.tsx` — captura nome + e-mail + tamanho da agência, validação inline, toast de sucesso/erro

### Backend / SEO
- [x] Migration `010_leads.sql`: tabela `leads` (email, name, agency_size, source, created_at) com índice único em email
- [x] `app/api/leads/route.ts` — POST: Zod validation, rate limiting in-memory (10 req/hora por IP), upsert mock com TODO(M6-backend)
- [x] `lib/leads/schema.ts` — schema Zod compartilhado entre client e server
- [x] `app/sitemap.ts` — sitemap dinâmico para SEO
- [x] `app/robots.ts` — robots.txt
- [x] Meta tags OpenGraph + Twitter Card no layout de marketing
- [x] `middleware.ts` — `/` e `/api/leads` adicionados a `PUBLIC_PATHS`

### M2 Addon — TikTok Ads + LinkedIn Ads (incluído nesta branch)
- [x] `CampaignPlatform`: `+ "tiktok" | "linkedin"`
- [x] Ícones SVG inline (TikTok preto duplo ciano/vermelho, LinkedIn azul #0A66C2)
- [x] Mock data: 2 campanhas TikTok + 1 LinkedIn (ROAS 13.7x)
- [x] `lib/tiktok/client.ts` — TikTok Ads API v1.3 (list, create, update, insights)
- [x] `lib/linkedin/client.ts` — LinkedIn Marketing API v2 (list, create, analytics)
- [x] Formulário, tabela, Zod schemas e sync atualizados para 4 plataformas

### Testes
- [x] `tests/unit/lead-schema.test.ts` — 8 testes: validação Zod (payloads válidos e inválidos)
- [x] `tests/e2e/landing.spec.ts` — E2E: landing page e fluxo de waitlist

### Entregáveis
- PR #7 mergeado: https://github.com/CoimbraViih/adtech/pull/7
- `tsc --noEmit` zero erros
- Dados gateados atrás de `TODO(M6-backend)` para swap-in Supabase

---

## M7 — Automação & Alertas ✅ CONCLUÍDO

**Branch:** `feat/m8-automation-alerts` → mergeado em `main`  
**Objetivo:** Alertas automáticos de anomalia de campanha (ROAS caindo, CPA explodindo, gasto acima do limite, CTR baixo, conversões abaixo do threshold). Notificações in-app com bell indicator e e-mail via Resend. Avaliação periódica via Vercel Cron a cada 15 minutos.

### Interface
- [x] `app/(dashboard)/automation/page.tsx` — Server Component: carrega regras com `fetchAllRules`, renderiza `AlertRulesTable`
- [x] `components/automation/alert-rules-table.tsx` — tabela com toggle pausar/ativar, editar e remover; empty state; prepend de nova regra
- [x] `components/automation/alert-rule-form.tsx` — modal de criação/edição com 4 campos (nome, condição, limite, cooldown), validação inline, POST/PATCH para API
- [x] `components/automation/notification-bell.tsx` — ícone Bell na topbar com badge de não lidas (máx "9+"), polling 60s
- [x] `components/automation/notification-drawer.tsx` — drawer lateral com lista de alertas não lidos, botão marcar como lida, empty state
- [x] `components/layout/topbar.tsx` — `NotificationBell` adicionado antes do `UserMenu`

### Backend / API
- [x] `supabase/migrations/008_automation.sql` — ENUMs `alert_condition`/`alert_status`, tabelas `alert_rules` + `alert_notifications`, RLS completo (4 policies em rules, 3 em notifications + service role bypass para INSERT do cron)
- [x] `app/api/automation/rules/route.ts` — GET (lista por workspace_id) + POST (cria com status=active, cooldown default 60)
- [x] `app/api/automation/rules/[id]/route.ts` — PATCH (campos whitelist) + DELETE (204)
- [x] `app/api/automation/notifications/route.ts` — GET notificações não lidas por workspace
- [x] `app/api/automation/notifications/[id]/read/route.ts` — POST marca como lida
- [x] `app/api/cron/evaluate-alerts/route.ts` — GET protegido por `Authorization: Bearer $CRON_SECRET`; avalia todas as regras ativas, insere notificações
- [x] `vercel.json` — cron `*/15 * * * *` apontando para `/api/cron/evaluate-alerts`
- [x] `lib/automation/evaluator.ts` — funções puras: `evaluateRule`, `buildNotificationMessage`, `getMetricValue`
- [x] `lib/automation/rules.ts` — helpers Supabase: `fetchActiveRules`, `fetchCampaignMetrics`, `insertNotification`, `markRuleTriggered`, `markNotificationRead`, `fetchUnreadNotifications`, `fetchAllRules`
- [x] `lib/automation/email.ts` — `sendAlertEmail` via Resend REST API; graceful no-op sem `RESEND_API_KEY`
- [x] `types/database.ts` — `AlertCondition`, `AlertStatus`, `AlertRule`, `AlertRuleCreateInput`, `AlertNotification`, `CampaignMetricSnapshot` (M8)
- [x] `.env.local.example` — `RESEND_API_KEY` e `CRON_SECRET` adicionados

### Testes
- [x] `tests/unit/evaluator.test.ts` — 12 testes: 5 condições, null guards, cooldown recente/expirado, status pausado, buildNotificationMessage
- [x] `tests/unit/automation-rules.test.ts` — 4 testes: fetchActiveRules, fetchCampaignMetrics, insertNotification, markRuleTriggered via vi.mock
- [x] `tests/unit/automation-types.test.ts` — 3 testes: AlertCondition enum, AlertRule fields, AlertNotification.read
- [x] `tests/e2e/automation.spec.ts` — 8 testes E2E: título da página, empty state, abrir form, campos, cancelar, bell visível, abrir drawer, fechar drawer

### Entregáveis
- `tsc --noEmit` zero erros
- `vitest run` 127/127 passando
- Formulário de criação de regra validado: nome + threshold obrigatórios, POST para `/api/automation/rules`, onSaved atualiza tabela
- Dados gateados atrás de `TODO(M8-backend)` para swap-in Supabase real

---

## M8 — Programático DSP/SSP ✅ CONCLUÍDO

**Branch:** `feat/m8-programmatic` → mergeado em `main` via PR #6  
**Objetivo:** Compra programática de mídia via OpenRTB 2.6 (Opção B: protocolo real + SSP mock interno). DMP com segmentação comportamental baseada em `pixel_events`. Dashboard de performance RTB. Interface totalmente funcional com dados mock; backend stubado com `TODO(M8-backend)` para swap-in Supabase.

### Interface
- [x] `app/(dashboard)/campaigns/programmatic/page.tsx` — dashboard RTB: 4 KPI cards (Total Bids, Win Rate, CPM Médio, Gasto Total), tabela de campanhas com deal type badges, GlobalDateFilter
- [x] `app/(dashboard)/campaigns/programmatic/new/page.tsx` — wizard 4 passos: Deal → Audiência → Bid & Orçamento → Revisão
- [x] `app/(dashboard)/campaigns/programmatic/[id]/page.tsx` — detalhe: 5 KPI cards, charts RTB, bid log table, config section
- [x] `components/campaigns/rtb-performance.tsx` — Recharts: Bid Landscape (BarChart) + Win Rate ao Longo do Tempo (LineChart dual-axis)
- [x] `components/campaigns/rtb-campaigns-table.tsx` — tabela com busca, deal type badges, DropdownMenu actions
- [x] `components/campaigns/rtb-campaign-form.tsx` — React Hook Form + Zod, card selector de deal type (Globe/Lock/Star/Shield), tags-input de domínios
- [x] `app/(dashboard)/audiences/page.tsx` — DMP: 3 KPI cards, AudiencesListClient, CreateAudienceDialog
- [x] `app/(dashboard)/audiences/[id]/page.tsx` — detalhe: tamanho, regras, campanhas vinculadas
- [x] `components/audiences/audiences-list-client.tsx` — busca + filtros por tipo (Comportamental/Lookalike/Customizado)
- [x] `components/audiences/segment-builder.tsx` — criador de regras por evento de pixel, operador, valor, janela; limite 10 regras; estimativa de tamanho ao vivo
- [x] `components/audiences/create-audience-dialog.tsx` — dialog com SegmentBuilder integrado
- [x] Sidebar: links "Programático" e "Audiências" adicionados

### Backend / API
- [x] `supabase/migrations/009_programmatic.sql` — ENUMs + tabelas `rtb_campaigns`, `bid_requests_log`, `audiences`, `audience_segments`, BIGINT para impressões, RLS split por operação, triggers `set_updated_at()`
- [x] `app/api/rtb/bid/route.ts` — endpoint público OpenRTB 2.6: OPTIONS (CORS) + POST (Bearer token auth, Zod, selectBid + DMP, BidResponse, 204 no-bid, X-Response-Time header)
- [x] `app/api/rtb/campaigns/route.ts` + `[id]/route.ts` — GET/POST/PATCH/DELETE autenticados
- [x] `app/api/audiences/route.ts` + `[id]/route.ts` — GET/POST/PATCH/DELETE autenticados
- [x] `lib/rtb/bidder.ts` — funções puras: `selectBid`, `checkPacing`, `checkFrequencyCap`, `calculateCpm`, `buildBidResponse`
- [x] `lib/rtb/dmp.ts` — `matchUserToSegments`, `evaluateAudienceRules`, `hashUserId` (stubs com TODO(M8-backend))
- [x] `lib/rtb/mock-ssp.ts` — gerador de `BidRequest` OpenRTB 2.6 para demo/testes
- [x] `lib/rtb/mock-data.ts` — 4 campanhas RTB, 5 audiências, 20 bid logs, helpers KPI/landscape/timeseries determinísticos
- [x] `types/database.ts` — 16 novos tipos M8: RTB, DMP, OpenRTB 2.6 (BidRequest/Response/Imp/Bid/SeatBid)
- [x] `.env.local.example` — `RTB_SSP_TOKEN` adicionado

### Testes
- [x] `tests/unit/rtb-bidder.test.ts` — 19 testes: checkPacing, checkFrequencyCap, calculateCpm, selectBid, buildBidResponse
- [x] `tests/unit/dmp-match.test.ts` — 8 testes: matchUserToSegments, evaluateAudienceRules, hashUserId com vi.mock
- [x] `tests/e2e/programmatic.spec.ts` — 8 testes E2E: /campaigns/programmatic e /audiences

### Entregáveis
- `tsc --noEmit` zero erros
- `vitest run` 154/154 passando (27 novos para M8)
- Endpoint OpenRTB 2.6 funcional com SSP mock interno
- Dados gateados atrás de `TODO(M8-backend)` para swap-in Supabase

---

## M9 — Monetização & Stripe ✅ CONCLUÍDO

**Branch:** `feat/m9-stripe` → mergeado em `main` via PR #8  
**Objetivo:** Monetização completa com Stripe — planos Free / Pro / Agency, checkout, portal de billing, webhooks de lifecycle e feature gates por plano no dashboard.

### Interface
- [x] `app/(dashboard)/settings/billing/page.tsx` — Server Component com Suspense boundary; resumo do plano atual, banners de checkout success/canceled, botão "Gerenciar assinatura" e "Ver planos"
- [x] `app/(dashboard)/settings/billing/billing-page-client.tsx` — Client Component; `useSearchParams` para status de checkout, UsageMeters para campanhas/criativos/pixels
- [x] `app/(dashboard)/settings/page.tsx` — redirect para /settings/billing
- [x] `components/billing/plan-card.tsx` — card com feature list (Check/X icons), preço em BRL, CTA de upgrade ou downgrade notice
- [x] `components/billing/upgrade-modal.tsx` — modal com os 3 planos, POST /api/stripe/checkout, redirect via `window.location.href`
- [x] `components/billing/usage-meter.tsx` — barra de progresso com aviso em 80%+, danger em 100%+, verde full quando ilimitado
- [x] `components/billing/plan-badge.tsx` — badge colorido no footer do sidebar (Free/Pro/Agency)
- [x] `components/billing/upgrade-banner.tsx` — banner de gate com Lock icon e botão "Ver planos" abrindo UpgradeModal
- [x] Feature gate aplicado: `/campaigns/programmatic` bloqueia não-Agency com UpgradeBanner

### Backend / API
- [x] `supabase/migrations/011_subscriptions.sql` — tabela `subscriptions` com `plan org_plan` (enum), trigger `sync_org_plan()` sincroniza `organizations.plan`, RLS: owners/admins podem SELECT; service role escreve
- [x] `lib/stripe/client.ts` — singleton Stripe com API version `2026-04-22.dahlia`, `isStripeConfigured()` helper
- [x] `lib/stripe/plans.ts` — `PLANS` record Free/Pro/Agency, limites (campanhas/criativos/pixels), feature flags (`canAccessProgrammatic`, `canAccessAiCreatives`, etc.), `getPlanByPriceId` com guard de empty-string
- [x] `lib/stripe/webhooks.ts` — handlers puros: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [x] `lib/stripe/subscription-service.ts` — Supabase service-role client condicional (real quando env vars presentes, stub otherwise); `upsertSubscription`, `deleteSubscription`, `markSubscriptionPastDue`, `logBillingEvent`, `isEventAlreadyProcessed`
- [x] `app/api/stripe/checkout/route.ts` — POST autenticado (RBAC owner/admin), Zod `plan: z.enum(["pro","agency"])`, guard de produção sem Stripe, null-check em `checkoutSession.url`
- [x] `app/api/stripe/portal/route.ts` — POST autenticado, guard de produção, retorna `{ url }`
- [x] `app/api/stripe/webhook/route.ts` — HMAC com `stripe.webhooks.constructEvent`, idempotência via `isEventAlreadyProcessed`, 4 handlers, sempre retorna 200
- [x] `types/database.ts` — `SubscriptionStatus` (7 variantes) + `Subscription` type
- [x] `.env.local.example` — `STRIPE_PRO_PRICE_ID` e `STRIPE_AGENCY_PRICE_ID` adicionados

### Testes
- [x] `tests/unit/stripe-plans.test.ts` — 31 testes: `PLANS`, limites, `getPlanByPriceId`, feature gates, `formatPlanPrice`, `formatLimit`
- [x] `tests/unit/stripe-webhooks.test.ts` — 8 testes: handlers com payloads mockados
- [x] `vitest run` 201/201 passando; `tsc --noEmit` zero erros

### Entregáveis
- PR #8 mergeado: https://github.com/CoimbraViih/adtech/pull/8
- `tsc --noEmit` zero erros
- `vitest run` 201/201 passando
- Backend pronto para Stripe live: configurar keys reais + aplicar migration `011_subscriptions.sql`
- Idempotência de webhooks implementada via `billing_events.stripe_event_id`
- Feature gates server-side em routes + frontend com UpgradeBanner

---

## MS — Segurança & Hardening

**Branch:** `feat/ms-security`  
**Objetivo:** Consolidar toda a camada de segurança da plataforma após as features estarem estáveis. Auditoria completa, hardening de endpoints, compliance LGPD e testes de penetração internos.

> **Agentes:** `@security-auditor` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/security-review` em cada módulo · `/webapp-testing` para testes de segurança E2E · `/commit` para o commit final

### Auth & Sessão (M1)
- [ ] **Nunca usar `getSession()` server-side** — apenas `getUser()` que valida o JWT no servidor Supabase (resistente a adulteração de cookie)
- [ ] Verificar que todas as rotas dos grupos `(dashboard)` e `(superadmin)` redirecionam para `/login` sem sessão — testar acessando URLs diretas
- [ ] Confirmar que role `superadmin` só é atribuída via banco (migration), nunca via input do usuário
- [ ] RLS smoke-test: logar com role `viewer` e tentar escrita — deve retornar 403
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exclusivamente server-side — jamais com prefixo `NEXT_PUBLIC_`
- [ ] Validar que o callback OAuth (`/callback`) verifica o `state` CSRF antes de trocar o code por sessão

### Campanhas (M2)
- [ ] Tokens de API externa (`META_ACCESS_TOKEN`, `GOOGLE_ADS_TOKEN`) exclusivamente server-side
- [ ] Todos os endpoints `app/api/campaigns/` verificam autenticação **e** role antes de qualquer operação
- [ ] Validar e sanitizar input do formulário de campanha server-side com `zod` nos route handlers
- [ ] Rate limiting no endpoint de criação de campanha
- [ ] Nunca logar tokens de acesso Meta/Google em `console.log` — verificar wrappers de API

### AI Creative Studio (M3)
- [ ] **Prompt injection:** sanitizar briefing do usuário antes de incluir no prompt OpenAI
- [ ] **Rate limiting por usuário** nos endpoints de geração (GPT-4o e Stability AI são caros) — N gerações/hora por workspace via Upstash Redis ou contador no banco
- [ ] Chaves de AI (`OPENAI_API_KEY`, etc.) exclusivamente server-side
- [ ] Validar tipo e tamanho de uploads antes de encaminhar à API externa — rejeitar tipos inesperados para evitar SSRF
- [ ] Definir TTL em URLs pré-assinadas de banners/vídeos — revalidar antes de servir

### Pixel & Tracking (M4) — atenção redobrada (endpoint público)
- [ ] **Validar `pixel_id`** antes de persistir: checar existência e status ativo — rejeitar IDs inválidos com 404 (não 403)
- [ ] **Rate limiting agressivo**: 1000 eventos/min por IP + 10.000/min por pixel_id — Vercel Edge Middleware ou Upstash Redis
- [ ] **Nunca logar PII** (e-mail, CPF, telefone) — mascarar antes de persistir no log de debug
- [ ] **CORS restritivo**: aceitar apenas origens cadastradas para o pixel
- [ ] **Payload máximo**: rejeitar requests > 10KB
- [ ] **IP mascarado**: armazenar apenas os 3 primeiros octetos — respeitar LGPD
- [ ] `adflow.js` não deve enviar cookies de sessão ou localStorage automaticamente

### Analytics & Atribuição (M5)
- [ ] Queries de analytics sempre filtram por `workspace_id` da sessão — nunca aceitar `workspace_id` de URL sem revalidar permissão
- [ ] Exportação de CSV sem PII no padrão — oferecer como opt-in explícito com aviso LGPD
- [ ] Verificar que role `viewer` não consegue POST em endpoints de analytics

### Landing Page AdFlow (M6)
- [ ] **Formulário de waitlist (endpoint público)**: Zod + rate limiting agressivo por IP (10 req/hora) — rejeitar payloads > 5KB
- [ ] Nunca logar e-mails ou dados pessoais de lead em `console.log` — LGPD
- [ ] CAPTCHA (hCaptcha ou Cloudflare Turnstile) no formulário de waitlist antes do go-live
- [ ] Meta tags sem vazamento de rotas internas do dashboard

### Automação & Alertas (M7)
- [ ] Chaves de mensageria (`RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, `WHATSAPP_TOKEN`) exclusivamente server-side
- [ ] Validar assinatura HMAC-SHA256 no webhook do motor de execução
- [ ] Limitar frequência de envio por contato — máximo 3 e-mails/dia por lead no mesmo funil
- [ ] Logs de execução sem conteúdo completo de mensagens com PII
- [ ] Alertas de anomalia não expõem dados financeiros completos — resumir e redirecionar ao dashboard

### Programático DSP/SSP (M8)
- [ ] Autenticar endpoint de bid com token ou IP allowlist do SSP parceiro
- [ ] Validar schema do bid request com `zod` antes de processar
- [ ] DMP e LGPD: implementar opt-out e exclusão de segmento
- [ ] Anonimizar IP do usuário final nos logs de bid request
- [ ] Limitar tamanho de bid requests aceitos a 50KB

### Monetização & Stripe (M9)
- [ ] **Validar assinatura HMAC** em `app/api/stripe/webhook/route.ts` com `stripe.webhooks.constructEvent` — rejeitar requisições sem header `Stripe-Signature`
- [ ] `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` exclusivamente server-side — jamais prefixados `NEXT_PUBLIC_`
- [ ] Feature gates validados server-side em cada route handler — nunca confiar apenas no frontend para bloquear plano inferior
- [ ] Endpoint de checkout retorna apenas a URL da Stripe Session — nunca expõe o `customer_id` ao client
- [ ] Idempotência nos handlers de webhook: verificar evento já processado antes de atualizar `subscriptions`

### Auditoria final pré-produção
- [ ] Rotação de secrets: gerar novas chaves de produção — nunca reusar as de desenvolvimento
- [ ] Varredura de segredos no repositório: `trufflehog` ou `gitleaks` em toda a história do git
- [ ] `npm audit` — corrigir vulnerabilidades `high` e `critical`
- [ ] Rate limiting global confirmado em todos os endpoints públicos
- [ ] Headers de segurança validados com securityheaders.com — mínimo nota A
- [ ] Auditoria de RLS completa com Supabase de produção
- [ ] `STRIPE_WEBHOOK_SECRET` de produção ativo — validação de assinatura confirmada
- [ ] `vercel env ls` — nenhuma variável sensível marcada como `NEXT_PUBLIC_`
- [ ] Página de Política de Privacidade e Termos de Uso presentes antes do go-live (LGPD)
- [ ] `Referrer-Policy`, `Permissions-Policy` e `Cross-Origin-Opener-Policy` nos headers de produção
- [ ] Revisão final com `@security-auditor` nos endpoints críticos: auth callback, pixel ingestion, bid RTB, Stripe webhook, waitlist de lead

### Commit final
```
git checkout main && git merge feat/ms-security
git commit -m "feat(ms): security hardening, LGPD compliance, full audit across all modules"
```

---

## M10 — Deploy & Produção

**Branch:** `feat/m10-deploy`  
**Depende de:** M1–M9, MS (exceto M6 e M9 que podem ser deployados antes)  
**Objetivo:** Plataforma em produção na Vercel + AWS São Paulo, com CI/CD, monitoramento, Stripe real e domínio `adflow.app` configurado.

> **Agentes:** `@security-auditor` · `@api-security-audit` · `@nextjs-architecture-expert` · `@code-reviewer`
> **Skills:** `/vercel:deploy` para configuração do projeto na Vercel e promoção para produção · `/vercel:env` para gerenciar variáveis de ambiente de produção · `/vercel:deployments-cicd` para configurar GitHub Actions e pipeline de CI/CD · `/vercel:vercel-firewall` para regras de firewall e proteção de endpoints · `/vercel:runtime-cache` para estratégia de cache em produção · `/vercel:next-cache-components` para otimização de cache das páginas · `/stripe:stripe-best-practices` para configuração do Stripe em modo live, webhooks e billing portal · `/web-performance-optimization` para Core Web Vitals e otimizações finais · `/security-review` auditoria completa pré-produção · `/webapp-testing` para rodar toda a suite E2E em staging antes do go-live · `/commit` para o commit final de deploy

### Configuração de infraestrutura
- [ ] Configurar projeto na Vercel, conectar repositório GitHub, configurar branch `main` como produção
- [ ] Configurar variáveis de ambiente de produção na Vercel (Supabase prod, Stripe live, OpenAI, etc.)
- [ ] Configurar domínio `adflow.app` na Vercel com SSL automático
- [ ] Configurar Supabase em modo produção: connection pooling (PgBouncer), backups diários, point-in-time recovery
- [ ] Configurar Stripe em modo live: produtos (Free/Pro/Agency), preços, webhook de produção
- [ ] Configurar GitHub Actions: CI roda `npm test` + `npm run test:e2e` em todo PR; bloqueio de merge se falhar

### Monitoramento & Observabilidade
- [ ] Configurar Vercel Analytics (Core Web Vitals)
- [ ] Configurar Sentry para error tracking (frontend + API routes)
- [ ] Configurar alertas de uptime (UptimeRobot ou BetterUptime) no endpoint `/api/health`
- [ ] Configurar logging estruturado nas API routes (Vercel Log Drains → Datadog ou Logtail)
- [ ] Dashboard de métricas de produto (usuários ativos, campanhas criadas, criativos gerados, eventos de pixel)

### Billing
- [ ] Ativar Stripe Billing Portal para gerenciamento de assinatura pelo cliente
- [ ] Configurar Stripe Tax para emissão de nota fiscal (opcional, Brasil)
- [ ] Testar fluxo completo: cadastro → free trial → upgrade para Pro → cobrança → downgrade

### Commit final
```
git checkout main && git merge feat/m10-deploy
git commit -m "feat(m10): production deploy, CI/CD, monitoring, Stripe live, security hardening"
```

---

## M11 — AI Traffic Manager (Campaign Diagnostics) ✅ CONCLUÍDO

**Branch:** `feat/integrations-api-keys` → mergeado em `main`  
**Depende de:** M2 (campaigns), M4 (pixel), M5 (analytics)  
**Plano detalhado:** `docs/superpowers/plans/2026-05-29-m10-ai-traffic-manager.md`  
**Objetivo:** Motor de diagnóstico automático de campanhas. Detecta underperformance contra benchmarks com regras determinísticas e produz recomendações acionáveis escritas pelo GPT-4o. Human-in-the-loop: o usuário aprova ou descarta cada card — sem mutação automática de campanhas.

> **Skills usadas:** `/brainstorming` · `/supabase` · `/supabase-postgres-best-practices` · `/claude-api` · `/frontend-design` · `/webapp-testing`

### Database
- [x] `supabase/migrations/015_ai_diagnostics.sql` — enums `diagnostic_severity/status/entity`, tabelas `campaign_benchmarks` + `ai_diagnostics`, índices, triggers `set_updated_at()`, RLS, seed de benchmarks de mercado

### TypeScript / Biblioteca de diagnósticos
- [x] `types/database.ts` — `DiagnosticSeverity`, `DiagnosticStatus`, `DiagnosticEntity`, `CampaignBenchmark`, `AiDiagnostic`
- [x] `lib/ai/diagnostics/types.ts` — contratos `Skill`, `CampaignContext`, `SkillFinding`
- [x] `lib/ai/diagnostics/benchmarks.ts` — `resolveBenchmarks`: workspace override > default de mercado
- [x] `lib/ai/diagnostics/context.ts` — builder de `CampaignContext[]` (métricas + benchmarks + delta 7d)
- [x] `lib/ai/diagnostics/skills/low-ctr.ts` — CTR < benchmark com volume → criativo/audiência
- [x] `lib/ai/diagnostics/skills/high-cpa.ts` — CPA > target com conversões > 0 → oferta/página/audiência
- [x] `lib/ai/diagnostics/skills/creative-fatigue.ts` — frequência alta + CTR delta ≤ −20% → rotacionar criativo
- [x] `lib/ai/diagnostics/skills/spend-no-conversion.ts` — gasto ≥ 3× CPA target, conversões = 0 → rastreamento/segmentação (critical)
- [x] `lib/ai/diagnostics/skills/click-no-convert.ts` — CTR bom, CVR < 0.5% com cliques > 100 → landing page/oferta
- [x] `lib/ai/diagnostics/skills/learning-phase.ts` — < 50 conversões E < 7 dias → info, não alterar
- [x] `lib/ai/diagnostics/skills/index.ts` — registry `SKILLS[]`
- [x] `lib/ai/diagnostics/llm.ts` — GPT-4o JSON schema → `{ rationale, suggested_action }`, fallback seguro em erro de API
- [x] `lib/ai/diagnostics/engine.ts` — orquestrador: context → trigger skills → LLM → upsert `ai_diagnostics`

### API Routes
- [x] `app/api/ai/diagnostics/run/route.ts` — POST autenticado, workspace RBAC member+, chama engine
- [x] `app/api/ai/diagnostics/[id]/route.ts` — PATCH: atualiza status (`acknowledged/applied/dismissed`)

### Interface — integrado em Campanhas (não página standalone)
- [x] `app/(dashboard)/analytics/diagnostics/page.tsx` — página de diagnósticos por severidade (critical → warning → info)
- [x] `app/(dashboard)/campaigns/[id]/page.tsx` — seção Diagnósticos integrada ao detalhe da campanha com DiagnosticCard colapsável + RunDiagnosticsButton
- [x] `components/dashboard/campaign-alerts-widget.tsx` — widget no dashboard: campanhas com alertas, ícone de atenção, preview hover com rationale + ação sugerida
- [x] `components/diagnostics/diagnostic-card.tsx` — chip de severidade, preview strip colapsável, rationale completo, ação recomendada, metrics_snapshot, Apply/Dismiss com UI otimista
- [x] `components/diagnostics/severity-summary.tsx` — contagens por severidade
- [x] `components/diagnostics/run-diagnostics-button.tsx` — POST → spinner → refresh; aceita `campaignId` opcional
- [x] `lib/campaigns/mock-data.ts` — `MOCK_DIAGNOSTICS` + `getMockDiagnostics(campaignId)` com `TODO(M2-backend)` para swap-in Supabase
- [x] `lib/dashboard/mock-data.ts` — `CampaignAlert` type + `getCampaignAlerts()` com dados consistentes com MOCK_DIAGNOSTICS
- [x] Diagnósticos removidos do menu de navegação (integrados nativamente ao detalhe da campanha)

### Integrações de plataforma (incluídas nesta branch)
- [x] `app/(dashboard)/settings/integrations/page.tsx` — gestão de API keys por plataforma (Meta, Google, TikTok, LinkedIn)
- [x] `app/api/settings/integrations/route.ts` + `[provider]/route.ts` + `[provider]/test/route.ts` — CRUD de credenciais + endpoint de teste
- [x] `lib/integrations/` — `credentials.ts`, `crypto.ts`, `providers.ts`, `types.ts` — armazenamento criptografado de API keys

### Testes
- [x] `tests/unit/diagnostics-skills.test.ts` — fixture trigger + fixture não-trigger para cada skill
- [x] `tests/unit/diagnostics-benchmarks.test.ts` — workspace override bate default de mercado
- [x] `tests/e2e/diagnostics.spec.ts` — page render, nav, run button
- [x] `tests/unit/integrations-credentials.test.ts` + `integrations-crypto.test.ts` + `integrations-providers.test.ts`

### Entregáveis
- `tsc --noEmit` zero erros
- `vitest run` 299/299 passando
- Regra `spend-no-conversion` produz `critical` em campanha com gasto e zero conversões
- Re-run não cria duplicatas (partial unique index `open` por entity+skill)
- Diagnósticos visíveis no detalhe de cada campanha e no dashboard com preview hover
- Dados mock consistentes entre dashboard widget e detalhe da campanha

---

## Ordem de execução recomendada

```
M0 (setup)
  └─ M1 (auth + shell)
       ├─ M2 (campanhas)
       │    └─ M3 (criativos AI)   ← paralelo com M4
       ├─ M4 (pixel)
       │    ├─ M5 (analytics)
       │    │    └─ M11 (AI traffic manager) ← depende M2 + M4 + M5
       │    ├─ M7 (automação)      ← depende M2 + M4 + M5
       │    └─ M8 (programático)   ← depende M2 + M4
       ├─ M6 (landing page AdFlow) ← paralelo, depende só M1
       └─ M9 (monetização Stripe)  ← depende M1–M5
            └─ MS (segurança)
                 └─ M10 (deploy)
```

**Regra:** Interface mockada sempre antes do backend. Cada milestone deve estar demonstrável com dados reais antes de iniciar o próximo.
