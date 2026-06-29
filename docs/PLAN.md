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
| MS | Segurança & Hardening | `feat/integrations-api-keys` ✅ | M1–M9 |
| M11 | AI Traffic Manager (Campaign Diagnostics) | `feat/integrations-api-keys` ✅ | M2, M4, M5 |
| M-ADS | Melhorias de Integrações de Anúncios | `feat/m-ads-integrations` ✅ F1 F2 F3 F4 | M2, M11, MS |
| M14 | Pixel Observability & SLO | `feat/m14-pixel-observability` ✅ | M4 |
| M13 | Event Data Layer (ClickHouse) | `feat/m13-event-data-layer` ✅ | M14 |
| M22 | Monetização para Go-Live (usage-based + fiscal BR) | `feat/m22-monetization` | M-ADS (campaign_metrics_daily) |
| M10 | Deploy & Produção | `feat/m10-deploy` | M14, M13 |
| M17 | Consent & LGPD / Cookieless | `feat/m17-consent-lgpd` ✅ | M13 |
| M16 | E-commerce Integrations (Nuvemshop / VTEX / Shopify) | `feat/m16-ecommerce` ✅ | M10, M13 |
| M18 | Data Transparency (event explorer + export) | `feat/m18-data-transparency` ✅ | M13 |
| M15 | Creative Asset Uploads + DCO | `feat/m15-dco` ✅ | M16, M13, M3 |
| M19 | Predictive & Autonomous Optimization | `feat/m19-predictive-optimization` ✅ | M13, M16, M11 |
| M20 | White-label Agency Portal | `feat/m20-whitelabel` ✅ | M18 |
| M21 | In-app AI Assistant & Guided Onboarding | ✅ Done — PR #28 | M13 (parcial) |
| M8-DMP | DMP Completion (avaliação real de regras) | `feat/m8-dmp-complete` | M13, M16 |
| M12 | PMP & Deal Enforcement (adiado) | `feat/m12-pmp` | M19 |

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

## M6 — Landing Page AdHunter ✅ CONCLUÍDO

**Branch:** `feat/m6-landing-v2` → mergeado em `main` via PR #16  
**Objetivo:** Landing page pública de marketing da AdHunter — design sci-fi cinematográfico com Three.js WebGL, GSAP ScrollTrigger e glassmorphism. Converte visitantes em leads com waitlist capture e formulário server-side seguro.

> **Atenção (auditoria 2026-06-22):** M6 entregou o **site de marketing** (`app/(marketing)/`), não um builder de LP. Existe um item **"Landing Pages"** no sidebar do dashboard apontando para `/landing-pages`, mas essa rota **não existe → 404**. O builder nunca foi construído. Ações pendentes no M10: remover o item do nav (`nav-items.ts`), remover a feature "Landing Pages sem código" de `components/marketing/features.tsx`, e limpar referências de M6/LP-builder da CLAUDE.md e do PRD.

### Interface (redesign sci-fi — PR #16)
- [x] `components/marketing/particle-universe.tsx` — Three.js WebGL: 1800 partículas neon (ember/cyan/violet/magenta/green) + 3000 estrelas, mouse parallax, nebulae pulsando — background fixo em toda a landing
- [x] `components/marketing/hero.tsx` — preloader GSAP (barra gradiente + contador 0→100%), HUD frame com cantos cyan + scan line animada + labels de coordenadas, entrada com `blur(8px)→0`, mockup dashboard com parallax no scroll
- [x] `components/marketing/features.tsx` — grid `gap-px` com GSAP staggered ScrollTrigger, neon hover glow por card, ícones simbólicos por feature
- [x] `components/marketing/social-proof.tsx` — cards com `rotateX` 3D na entrada, metric hero com text-shadow neon
- [x] `components/marketing/pricing.tsx` — `scale(0.95)→1` na entrada, hover `translateY(-6px)` + box-shadow colorido por plano
- [x] `components/marketing/faq.tsx` — slide-in from left via GSAP, `+` gira 45° em cyan ao abrir
- [x] `components/marketing/cta-banner.tsx` — layout horizontal, box-shadow ember pulsante no botão, glassmorphism container
- [x] `components/marketing/waitlist-form.tsx` — sci-fi inline style, focus border cyan, estado de sucesso com SVG checkmark verde
- [x] `components/marketing/header.tsx` — transparente → frosted glass (`blur(16px)`) no scroll, scan line animada embaixo, CrosshairLogo SVG
- [x] `components/marketing/footer.tsx` — minimal, JetBrains Mono, status `SYS.ADHUNTER.v2.0 // ONLINE`
- [x] `app/(marketing)/layout.tsx` — `ParticleUniverse` como background fixo, Manrope body font, metadata AdHunter
- [x] `app/(marketing)/page.tsx` — waitlist section 2-column com social signal "247 agências na fila · 53 vagas restantes"
- [x] `app/layout.tsx` — Space Grotesk + Manrope adicionados via `next/font/google`
- [x] `app/globals.css` — keyframes: `hud-scan`, `hud-blink`, `neon-pulse`, `ember-pulse` + variáveis `--font-display`/`--font-marketing`

### Dependências adicionadas
- [x] `gsap@^3.15.0` + `@gsap/react@^2.1.2` — animações ScrollTrigger
- [x] `three@^0.184.0` + `@types/three@^0.184.1` — WebGL particle universe
- [x] `lenis@^1.3.23` — smooth scroll

### Backend / SEO (mantido de PR #7)
- [x] Migration `010_leads.sql`: tabela `leads` com índice único em email e RLS service_role
- [x] `app/api/leads/route.ts` — POST: Zod v4, rate limiting in-memory (10 req/hora por IP), payload limit 5KB
- [x] `lib/leads/schema.ts` — schema Zod compartilhado entre client e server
- [x] `app/sitemap.ts` + `app/robots.ts` — SEO
- [x] `middleware.ts` — `/` e `/api/leads` em `PUBLIC_PATHS`

### Testes
- [x] `tests/unit/lead-schema.test.ts` — 8 testes: validação Zod (payloads válidos e inválidos)
- [x] `vitest run` — 425/425 passando após merge com main

### Entregáveis
- PR #16 mergeado: https://github.com/CoimbraViih/adtech/pull/16
- `tsc --noEmit` zero erros em `components/marketing/` e `app/(marketing)/`
- `vitest run` 425/425 passando
- Design: sci-fi cinematográfico com Three.js WebGL + GSAP ScrollTrigger
- Brand: AdHunter — crosshair SVG, Space Grotesk + Manrope, tagline "Mire melhor. Gaste menos."

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

## MS — Segurança & Hardening ✅ CONCLUÍDO

**Branch:** `feat/integrations-api-keys` → mergeado em `main` via PR #9  
**Objetivo:** Consolidar toda a camada de segurança da plataforma após as features estarem estáveis. Auditoria completa, hardening de endpoints, compliance LGPD e testes de penetração internos.

> **Agentes:** `@security-auditor` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/security-review` em cada módulo · `/webapp-testing` para testes de segurança E2E

### Auth & Sessão (M1)
- [x] **Nunca usar `getSession()` server-side** — apenas `getUser()` via `requireServerSession()`
- [x] Middleware protege todos os grupos `(dashboard)` e `(superadmin)` — `PUBLIC_PATHS` allowlist explícita
- [x] Role `superadmin` só atribuída via migration, nunca via input do usuário
- [x] `SUPABASE_SERVICE_ROLE_KEY` exclusivamente server-side — zero prefixos `NEXT_PUBLIC_`
- [x] Callback OAuth (`/callback`) valida CSRF `state` antes de trocar o code — fail-closed guard

### Campanhas (M2)
- [x] Tokens de API externa lidos exclusivamente server-side via `lib/integrations/credentials.ts` (AES-256-GCM)
- [x] Todos os endpoints `app/api/campaigns/` verificam autenticação e role via `requireServerSession()`
- [x] Input sanitizado server-side com Zod em todos os route handlers
- [x] Rate limiting no endpoint de criação de campanha (`lib/security/rate-limit.ts`)
- [x] Tokens Meta/Google scrubados de logs de erro — nunca expostos em `console.error`

### AI Creative Studio (M3)
- [x] **Prompt injection:** briefing sanitizado com `sanitizeInput()` antes de compor o prompt OpenAI
- [x] **Rate limiting por workspace** nos endpoints de geração — contador in-memory com janela deslizante
- [x] Chaves de AI (`OPENAI_API_KEY`, etc.) exclusivamente server-side

### Pixel & Tracking (M4) — endpoint público
- [x] `pixel_id` validado antes de persistir — IDs inválidos retornam 404
- [x] **Rate limiting**: por IP + por pixel_id via `lib/security/rate-limit.ts`
- [x] **CORS restritivo**: `null` origin rejeitada; apenas origens cadastradas aceitas
- [x] **Payload máximo 10KB**: `lib/security/payload.ts` rejeita requests acima do limite
- [x] **IP mascarado LGPD**: apenas 3 primeiros octetos armazenados (`lib/security/ip.ts`)

### Analytics & Atribuição (M5)
- [x] Queries sempre filtram por `workspace_id` da sessão — nunca aceitam workspace de URL sem revalidar
- [x] Role `viewer` não consegue POST em endpoints de analytics (RBAC em route handlers)

### Landing Page AdFlow (M6)
- [x] **Waitlist**: Zod + rate limiting agressivo por IP (10 req/hora) + rejeição de payloads > 5KB
- [x] E-mails de lead nunca logados em `console.log` — LGPD
- [ ] CAPTCHA (hCaptcha ou Cloudflare Turnstile) — pendente para go-live em produção

### Automação & Alertas (M7)
- [x] `RESEND_API_KEY` exclusivamente server-side
- [x] Logs de execução sem PII — `sanitizeInput()` aplicado antes de persistir mensagens
- [x] Alertas de anomalia resumem métricas sem expor dados financeiros completos

### Programático DSP/SSP (M8)
- [x] Endpoint de bid autenticado com Bearer token (`RTB_SSP_TOKEN`)
- [x] Schema de bid request validado com Zod antes de processar
- [x] **DMP opt-out LGPD**: `app/api/audiences/optout/route.ts` + `013_dmp_optout.sql` com SHA-256 hash
- [x] IP do usuário final anonimizado nos logs de bid request
- [x] Bid requests limitados a 50KB com rejeição explícita

### Monetização & Stripe (M9)
- [x] **HMAC validado** em `app/api/stripe/webhook/route.ts` com `stripe.webhooks.constructEvent`
- [x] `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` exclusivamente server-side
- [x] Feature gates validados server-side em route handlers — frontend apenas reflete o estado
- [x] Checkout retorna apenas a URL da Stripe Session — `customer_id` nunca exposto ao client
- [x] Idempotência de webhooks via `billing_events.stripe_event_id`

### Auditoria pós-merge (2026-06-01) — multi-agente

Segunda passagem de auditoria cobrindo segurança + qualidade de código + compatibilidade Next.js 15. Todos os issues abaixo foram corrigidos no mesmo commit.

**Segurança:**
- [x] **CSRF callback invertido** (`app/(auth)/callback/route.ts`) — condição `!storedState` bloqueava todos os logins; corrigido para rejeitar apenas em mismatch explícito
- [x] **Open-redirect em dev-login** (`app/api/auth/dev-login/route.ts`) — parâmetro `?next=` sanitizado igual ao middleware
- [x] **Stripe webhook 200 sem secrets em produção** (`app/api/stripe/webhook/route.ts`) — retorna 500 em produção quando secrets ausentes
- [x] **IDOR em automation/rules POST** — `workspace_id` derivado da sessão; nunca aceito do body
- [x] **IDOR em automation/notifications GET** — `workspace_id` validado contra sessão antes de buscar
- [x] **IDOR em audiences GET** — removido override de `workspace_id` via query string
- [x] **Payload check em leads** — payload lido como texto antes de parsear (bypassa ausência de `Content-Length`)
- [x] **CSP connect-src wildcard** — restringido de `https:` para `https://*.supabase.co https://api.stripe.com`
- [x] **PUBLIC_PATHS duplicados** — `/login` e `/signup` removidos de `PUBLIC_PATHS` (já cobertas por `AUTH_ONLY_PATHS`)
- [x] **PATCH de rules sem Zod** (`app/api/automation/rules/[id]/route.ts`) — allowlist substituída por schema Zod tipado com `.strict()`

**Qualidade de código:**
- [x] **`isSubmitting` nunca resetado no happy path** (`campaign-form.tsx`) — `setIsSubmitting(false)` adicionado antes do `router.push`
- [x] **`getValues()` stale em Step4Review** — substituído por `form.watch()` para subscrever mudanças
- [x] **`DiagnosticCard` confundia "aplicado" com "descartado"** — estados separados; aplicado mostra banner de confirmação em vez de remover o card
- [x] **`RunDiagnosticsButton` engolia erros silenciosamente** — checagem de `res.ok` + estado de erro visível

**Next.js 15:**
- [x] **Auditoria completa** — zero violações de `params`/`cookies`/`searchParams` síncronos; todos os padrões corretos

### Auditoria final pré-produção (pendente para M10)
- [ ] Rotação de secrets: gerar novas chaves de produção — nunca reusar as de desenvolvimento
- [ ] Varredura de segredos: `trufflehog` ou `gitleaks` em toda a história do git
- [ ] `npm audit` — corrigir vulnerabilidades `high` e `critical`
- [ ] Headers de segurança validados com securityheaders.com — mínimo nota A
- [ ] Auditoria de RLS completa com Supabase de produção
- [ ] `vercel env ls` — nenhuma variável sensível marcada como `NEXT_PUBLIC_`
- [ ] Página de Política de Privacidade e Termos de Uso (LGPD)
- [ ] Revisão final com `@security-auditor` nos endpoints críticos: auth callback, pixel ingestion, bid RTB, Stripe webhook, waitlist

### Entregáveis
- `tsc --noEmit` zero erros
- `vitest run` 299/299 passando (inclui testes de segurança: rate-limit, ip-mask, sanitize, payload, security-ai, security-pixel)
- Utilitários: `lib/security/rate-limit.ts`, `lib/security/ip.ts`, `lib/security/sanitize.ts`, `lib/security/payload.ts`
- DMP opt-out LGPD funcional com migration `013_dmp_optout.sql`
- PR #9 mergeado: https://github.com/CoimbraViih/adtech/pull/9

---

## M11 — AI Traffic Manager (Diagnósticos de Campanha) ✅ CONCLUÍDO

**Branch:** `feat/integrations-api-keys` → mergeado em `main`  
**Depende de:** M2 (campaigns), M4 (pixel), M5 (analytics)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-22-MASTER-plano-execucao.md`  
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

## M-ADS — Melhorias de Integrações de Anúncios

**Branch:** `feat/m-ads-integrations` → mergeado em `main` via PR #10 (Fase 1 ✅)  
**Depende de:** M2 (campanhas), M11 (AI Traffic Manager), MS (segurança)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-22-MASTER-plano-execucao.md`  
**Objetivo:** Tornar as integrações com Meta, Google, TikTok e LinkedIn funcionais e robustas em produção. Hoje os clients existem mas operam com bugs de multi-tenant, versões de API defasadas, sync ainda mockado e nenhum retry/refresh automático. Este milestone fecha essas lacunas em 4 fases sequenciais.

> **Agentes:** `@backend-architect` · `@typescript-pro` · `@api-security-audit` · `@code-reviewer`  
> **Skills:** `/brainstorming` · `/webapp-testing` · `/supabase` · `/writing-plans`

---

### Fase 1 — Corretude e multi-tenant ✅ CONCLUÍDO

**Branch:** `feat/m-ads-integrations` → mergeado em `main` via PR #10 (`be2b90a`)  
**Resultado:** `tsc --noEmit` zero erros · `npm test` 299/299 passando · auditoria de segurança limpa

**Problema raiz:** sync jamais rodava para um tenant real porque (a) `sync.ts` checava `process.env.META_ACCESS_TOKEN` em vez das credenciais do banco, (b) o Google client tinha `cachedToken` global de módulo e lia `process.env` diretamente, e (c) a API do LinkedIn usada (`/v2/adCampaignsV2 + LinkedIn-Version: 202401`) estava no limiar do sunset (janela de 1 ano).

#### Backend — Google client (multi-tenant fix)
- [x] `lib/google/client.ts` — removido `cachedToken` global; substituído por `Map<string, {token:string; expiresAt:number}>` keyed por `organizationId`
- [x] `lib/google/client.ts` — removidos `getCredentials(customerId?)` e `getAccessToken(refreshToken?)` que liam `process.env`; toda autenticação passa por `getGoogleCredentials(orgId)` antes de chegar ao `googleFetch`
- [x] `lib/google/client.ts` — campo `login_customer_id` separado de `customer_id` (MCC vs conta folha) nas credenciais; header `login-customer-id` atualizado
- [x] `lib/google/client.ts` — versão subida `v18` → `v24`; constante `GOOGLE_ADS_API_VERSION = "v24"`
- [x] `lib/google/client.ts` — update real de `dailyBudget` em `updateGoogleCampaign` implementado (query GAQL para budget resource name + `campaignBudgets:mutate`)
- [x] `lib/google/client.ts` — parâmetros `opts?` removidos de todas as funções públicas; `organizationId` é o único identificador

#### Backend — LinkedIn client (migração urgente)
- [x] `lib/linkedin/client.ts` — migrado de `/v2/adCampaignsV2` para `/rest/adCampaigns`; analytics de `/v2/adAnalyticsV2` para `/rest/adAnalytics`
- [x] `lib/linkedin/client.ts` — `LinkedIn-Version` atualizado para `202506`; constante `LINKEDIN_API_VERSION`
- [x] `lib/linkedin/client.ts` — `X-RestLi-Protocol-Version: 2.0.0` adicionado nos headers de partial update
- [x] `lib/linkedin/client.ts` — `getAccessToken(override?)` e `getAdAccountId(override?)` removidos; `getLinkedInCredentials(orgId)` com throw se ausente
- [x] `lib/linkedin/client.ts` — parâmetros `opts?` removidos de todas as funções públicas

#### Backend — Meta e TikTok (limpeza)
- [x] `lib/meta/client.ts` — subido `v21.0` → `v25.0`; `access_token` movido da query string para header `Authorization: Bearer <token>`
- [x] `lib/pixel/meta-capi.ts` — URL bumped de `v18.0` para `v25.0`
- [x] `lib/tiktok/client.ts` — `getAccessToken(override?)` e `getAdvertiserId(override?)` removidos; `getTikTokCredentials(orgId)` exclusivamente
- [x] `lib/tiktok/client.ts` — parâmetros `opts?` removidos de todas as funções públicas
- [x] `lib/integrations/providers.ts` — Meta/WhatsApp bumped para v25.0; Google bumped para v24

#### Backend — Sync e guards DB-first (bug crítico corrigido)
- [x] `lib/campaigns/sync.ts` — guards `if (process.env.META_ACCESS_TOKEN)` substituídos por `hasCredentials(orgId, provider)` via `getCredentialField`
- [x] `lib/campaigns/sync.ts` — **bug crítico:** `hasCredentials` usava campo `access_token` para Google (inexistente); corrigido para `refresh_token` (campo correto do schema Google)
- [x] `lib/campaigns/sync.ts` — retorna status por plataforma `{platform, synced, error}[]`; falhas parciais não engolidas
- [x] `lib/campaigns/sync.ts` — upsert stub com `TODO(M-ADS-backend)` para swap-in Supabase real

#### Backend — platform.ts
- [x] `lib/campaigns/platform.ts` — repasse de `opts` (accessToken, customerId etc.) removido; `createCampaignOnPlatform` e `updateCampaignOnPlatform` recebem apenas `organizationId` + payload tipado

#### Auditoria de segurança (Fase 1)
- [x] Nenhum token em `console.log`/`console.error` nos clients
- [x] `Authorization: Bearer` (não query string) confirmado no Meta
- [x] Cache Google keyed por org; zero risco de cross-tenant token leak
- [x] `hasCredentials` retorna apenas `boolean` — nunca expõe o valor
- [x] `app/api/campaigns/route.ts` chama `requireServerSession()` antes de qualquer sync

---

### Fase 2 — Robustez ✅ CONCLUÍDO

**Branch:** `feat/m-ads-f2-robustness` → mergeado em `main` via PR #11 (`d5d3395`)  
**Resultado:** `tsc --noEmit` zero erros · `npm test` 342/342 passando · 2 bugs críticos corrigidos na revisão final

**Bugs críticos corrigidos na revisão final:**
- `lib/campaigns/sync.ts` — `hasCredentials` recebia `workspaceId` em vez de `organizationId`; lookup sempre retornava `false`; sync nunca disparava para nenhum tenant real
- `lib/meta/client.ts` — `getMetaAccountInsights` estava sem safety limit no loop de paginação (risco de loop infinito em produção)

#### Backend — fetchWithRetry
- [x] `lib/integrations/fetch-retry.ts` — backoff exponencial 500ms × 2^n, jitter ±20%, respeito a `Retry-After`, retriable: 429/502/503/504; não-retriable: 401/403/404
- [x] `lib/meta/client.ts`, `lib/google/client.ts`, `lib/tiktok/client.ts`, `lib/linkedin/client.ts` — `fetchWithRetry` integrado; OAuth token-refresh permanece com `fetch` nativo (intencional)

#### Backend — Refresh automático de token
- [x] `lib/integrations/credentials.ts` — `saveTokenRefresh(orgId, provider, {accessToken, refreshToken?, expiresAt})`: merge no blob JSON existente + re-encripta; preserva outros campos da row
- [x] `lib/linkedin/token-refresh.ts` — `refreshLinkedInTokenIfNeeded`: guarda 7 dias; skip se `expires_at` null ou campos ausentes; best-effort (try/catch em getLinkedInCredentials)
- [x] `lib/meta/token-refresh.ts` — `refreshMetaTokenIfNeeded`: fb_exchange_token flow; fallback 60 dias; skip se `app_id`/`app_secret` ausentes
- [x] `supabase/migrations/020_credentials_expiry.sql` — colunas `expires_at TIMESTAMPTZ` e `refresh_token TEXT` em `org_api_credentials` (idempotente)

#### Backend — Paginação real
- [x] `lib/tiktok/client.ts` — loop por `page_info.has_more`; safety limit 1000
- [x] `lib/linkedin/client.ts` — loop por `start/count`; safety limit 1000
- [x] `lib/meta/client.ts` — loop por `paging.next`; safety limit 5000
- [x] `lib/google/client.ts` — loop por `nextPageToken`; removido `LIMIT 1000` do GAQL; safety limit 10000

#### Backend — Insights em batch + sync_runs
- [x] `lib/meta/client.ts` — `getMetaAccountInsights`: 1 call `/{accountId}/insights?level=campaign` (não N por campanha)
- [x] `lib/tiktok/client.ts` — `getTikTokBatchInsights`: 1 call com lista de campaign IDs via filtering IN
- [x] `lib/linkedin/client.ts` — `getLinkedInAccountInsights`: 1 call `adAnalytics?pivot=CAMPAIGN` por conta
- [x] `lib/google/client.ts` — `getGoogleAccountMetrics`: 1 GAQL sem filtro de campanha
- [x] `lib/campaigns/sync.ts` — usa batch insights; registra `sync_runs` após cada plataforma com status/contagem/timestamps
- [x] `supabase/migrations/021_sync_runs.sql` — tabela `sync_runs` com RLS completo + índice `(workspace_id, platform, started_at DESC)`

#### Interface — Status de sync
- [x] `app/api/campaigns/sync/route.ts` — POST autenticado, RBAC member+, Zod, workspace IDOR guard
- [x] `components/integrations/sync-status-widget.tsx` — badge verde/amarelo/vermelho + botão spinner; best-effort
- [x] `app/(dashboard)/settings/integrations/page.tsx` — consulta `sync_runs` e exibe status por plataforma
- [x] `types/database.ts` — `SyncRunStatus` + `SyncRun`

#### Testes (43 novos)
- [x] `tests/unit/fetch-retry.test.ts` — 9 testes (backoff, Retry-After, não-retry em 401/404, exaustão)
- [x] `tests/unit/save-token-refresh.test.ts` — 6 testes (merge de blob, criptografia, campos preservados)
- [x] `tests/unit/token-refresh.test.ts` — 14 testes (LinkedIn + Meta, null guard, 7-day guard, best-effort)
- [x] `tests/unit/sync-batch-insights.test.ts` — 14 testes (1 call por plataforma, sync_runs INSERT)

#### Auditoria de segurança (Fase 2)
- [x] Nenhum token em `console.log`/`console.error` nos arquivos novos
- [x] `saveTokenRefresh` criptografa via `encrypt()` antes de salvar — zero plaintext
- [x] `sync/route.ts` verifica workspace ownership antes de sync — sem IDOR
- [x] Token refresh best-effort — falhas não bloqueiam chamadas reais da API

---

### Fase 3 — Cobertura de features ✅ CONCLUÍDO

**Branch:** `feat/m-ads-f3-coverage` → mergeado em `main` via PR #12 (`7c62ca2`)  
**Resultado:** `tsc --noEmit` zero erros · `npm test` 387/387 passando · auditoria de segurança limpa  
**Execução:** subagent-driven development (3 tasks A/B/C em série, spec review + code quality review por task)

**Bugs críticos encontrados e corrigidos durante reviews:**
- Task A: Meta `exchangeCode` enviava `client_secret` em GET URL → corrigido para POST body
- Task A: `state` validation tests não testavam o handler real → substituídos por testes do callback real
- Task B: `listGoogleAdGroups` GAQL usava `'${campaignId}'` com aspas (IDs numéricos não são strings em GAQL) → removidas
- Task B: `MetaAd.status` tipado como `MetaAdSetStatus` (incompleto) → novo `MetaAdStatus` com statuses de nível de ad
- Task B: `(el.id as string)` unsafe cast no LinkedIn → substituído por verificação `typeof`
- Task C: `ga4_api_secret` ausente dos logs de erro do workspace lookup → `console.warn` adicionado

#### Task A — OAuth onboarding ✅
- [x] `lib/integrations/oauth.ts` — `buildAuthUrl` + `exchangeCode` para Meta/Google/LinkedIn/TikTok com scopes mínimos e expiry fallbacks por provider
- [x] `app/api/integrations/[provider]/oauth/start/route.ts` — GET autenticado; state UUID em cookie HttpOnly `Max-Age: 600`; redirect para `buildAuthUrl`
- [x] `app/api/integrations/[provider]/oauth/callback/route.ts` — valida state CSRF; `exchangeCode`; salva via `upsertCredentials` + `saveTokenRefresh`; deleta cookie em sucesso E erro; redireciona
- [x] UI: botão "Conectar com [Logo]" por plataforma + fallback manual colapsável + badge "Conectado via OAuth" com account ID e expiração
- [x] `.env.local.example` — `META_APP_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET`
- [x] `tests/unit/oauth-flow.test.ts` + `tests/unit/oauth-callback.test.ts` — 18 testes: buildAuthUrl por provider, exchangeCode, state no handler real

#### Task B — Ad sets e ads ✅
- [x] `lib/meta/client.ts` — `listMetaAdSets` + `listMetaAds` paginados via `paging.next`
- [x] `lib/google/client.ts` — `listGoogleAdGroups` + `listGoogleAds` via GAQL (IDs sem aspas)
- [x] `lib/tiktok/client.ts` — `listTikTokAdGroups` + `listTikTokAds` via `/adgroup/get/` + `/ad/get/`
- [x] `lib/linkedin/client.ts` — `listLinkedInCreatives` via `/rest/adCreatives` (LinkedIn sem nível de ad set)
- [x] `lib/campaigns/sync.ts` — ad sets/ads sync após campanhas por plataforma; erros isolados em try/catch
- [x] `tests/unit/sync-adsets.test.ts` — 19 testes: todas as funções + error isolation

#### Task C — Pixel fanout por org ✅
- [x] `lib/pixel/fanout.ts` — `fanoutToPlatforms(event, pixel, organizationId)` — sem hardcoded `""`
- [x] `lib/pixel/meta-capi.ts` — token movido de query string para `Authorization: Bearer`
- [x] `lib/pixel/google-ec.ts` — campo corrigido de `refresh_token` para `ga4_api_secret`
- [x] `app/api/pixel/[id]/route.ts` — workspace lookup para `organization_id`; fallback `""` com `console.warn`
- [x] `tests/unit/pixel-fanout-org.test.ts` — 11 testes: org forwarding, empty org skip, Meta header, Google field

#### Auditoria de segurança (Fase 3)
- [x] OAuth secrets exclusivamente server-side — zero `NEXT_PUBLIC_` em segredos
- [x] State cookie: `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Max-Age=600`
- [x] Cookie deletado em sucesso E erro no callback (via `errorRedirect` helper)
- [x] Meta `exchangeCode` usa POST — `client_secret` no body, não na URL
- [x] Meta CAPI token em `Authorization: Bearer`, não em query string
- [x] `ga4_api_secret` nunca logado; workspace errors logados com `console.warn`

---

### Fase 4 — Loop de otimização

#### Backend — Modelo de atribuição unificado
- [x] `lib/analytics/cross-platform.ts` — `normalizeCampaignMetrics(campaigns[])`: converte métricas das 4 plataformas + pixel próprio para schema comum `{spend, impressions, clicks, conversions, revenue, roas, cpa}` por `(workspace_id, campaign_id, date)`
- [x] `lib/analytics/cross-platform.ts` — `reconcileWithPixel(campaignMetrics, pixelEvents)`: compara conversões reportadas pela plataforma com as capturadas pelo pixel server-side; retorna `{reported, measured, divergence_pct}` por campanha
- [x] Migration `022_campaign_metrics_daily.sql` — tabela `campaign_metrics_daily`: `workspace_id`, `campaign_id`, `platform`, `date DATE`, métricas numéricas, `pixel_conversions INT` (do pixel próprio); índice único em `(campaign_id, date)`; populated pelo sync

#### Backend — Realimentação do AI Traffic Manager
- [x] `lib/ai/diagnostics/context.ts` — estender `CampaignContext` com `pixelConversions` e `divergencePct`: diagnósticos passam a considerar a divergência pixel×plataforma como sinal de rastreamento quebrado
- [x] `lib/ai/diagnostics/skills/tracking-divergence.ts` — nova skill: `pixel_conversions < platform_conversions * 0.5` + gasto > threshold → severidade `warning`; rationale = "pixel server-side registrando menos da metade das conversões reportadas pela plataforma"

#### Interface — Dashboard de reconciliação
- [x] `app/(dashboard)/analytics/reconciliation/page.tsx` — tabela por campanha: spend, conversões plataforma, conversões pixel, divergência %; alerta visual quando divergência > 30%
- [x] Sidebar: link "Reconciliação" sob Analytics

#### Testes
- [x] `tests/unit/cross-platform-metrics.test.ts` — normalização e reconciliação com dados de fixture
- [x] `tests/unit/diagnostics-tracking-divergence.test.ts` — trigger e não-trigger da nova skill
- [x] `tests/e2e/analytics-reconciliation.spec.ts` — página de reconciliação renderiza

---

### Entregáveis por fase

| Fase | Resultado verificável | Status |
|------|-----------------------|--------|
| 1 | `syncCampaignsFromPlatform` dispara para tenants reais; Google multi-tenant sem cache global; LinkedIn na API `/rest/`; Meta v25.0 com `Authorization: Bearer`; bug `hasCredentials` Google corrigido | ✅ PR #10 mergeado (`be2b90a`) — 299/299 testes |
| 2 | `fetchWithRetry` cobrindo os 4 clients; LinkedIn/Meta com refresh automático; sync registra `sync_runs`; UI mostra status por plataforma | ✅ PR #11 mergeado (`d5d3395`) — 342/342 testes |
| 3 | Botão OAuth conecta Meta, Google, LinkedIn; ad sets e ads sincronizados; pixel fan-out usa credenciais por org | ✅ PR #12 mergeado (`7c62ca2`) — 387/387 testes |
| 4 | `campaign_metrics_daily` populado; skill `tracking-divergence` ativa no AI Traffic Manager; página de reconciliação visível | ✅ PR #13 mergeado (`19fdda4`) — 413/413 testes |
| Backend | Upserts reais de `campaigns`/`ad_sets`/`ads` em `sync.ts`; TikTok token refresh wired; todos os mocks substituídos por queries Supabase | ✅ `commit 99c50b3` + `commit 08be84e` |

`tsc --noEmit` zero erros e `vitest run` passando após cada fase.

### Fixes pós-auditoria (2026-06-22)

| Commit | O que foi feito |
|--------|----------------|
| `9bed850` | Security: middleware IDOR fixes, cron guard, env check |
| `99c50b3` | Sync: DB upserts campaigns/ad_sets/ads ativos + TikTok token refresh |
| `08be84e` | Mocks: todos os `MOCK_*` substituídos por queries Supabase reais |
| `1cca082` | Alerts: evaluate-alerts resolve org por workspace + welcome email |
| `0f894fa` | Cleanup: código morto removido, docs atualizados |

**Pendente (ações manuais — fora do código):**
- Configurar `META_APP_ID`/`META_APP_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` nas envs Vercel
- Remover 5 repos clonados na raiz (`everything-claude-code/`, `impeccable/`, `opensquad/`, `superpowers/`, `three.js/`) — ~2,3 GB
- Aplicar migration `025_fix_handle_new_user_safe.sql` no Supabase de produção

---

## M14 — Pixel Observability & SLO ✅ CONCLUÍDO

**Branch:** `feat/m14-pixel-observability` → mergeado em `main` via PR #18 (`d4a402e`)  
**Depende de:** M4 (pixel)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-22-MASTER-plano-execucao.md` §4  
**Objetivo:** Garantir que nenhum evento do pixel seja perdido silenciosamente e que `/api/pixel/[id]` tenha SLO medido antes do deploy de produção. Pré-requisito de M13.

> **Skills usadas:** `/supabase` · `/webapp-testing` · `/vercel:vercel-functions`

### Database
- [x] `supabase/migrations/027_pixel_dead_letter.sql` — tabela `pixel_dead_letter` com `pixel_id TEXT`, `organization_id UUID NULL`, `rejection_reason` (enum `DeadLetterReason`), `event_payload JSONB`, `created_at`; RLS `USING (false) WITH CHECK (false)` — apenas service role escreve; 2 índices idempotentes; aplicada em produção ✅

### Backend / Observabilidade
- [x] `lib/observability/metrics.ts` — `logPixelMetric`: console.log estruturado JSON com `level`, `event`, `pixelId`, `organizationId`, `outcome` (union `PixelOutcome`), `latencyMs`, `eventType`, `ts`
- [x] `lib/pixel/dead-letter.ts` — `writeToDeadLetter`: insere em `pixel_dead_letter` via service client; captura `{ error }` tuple do Supabase (não apenas thrown exceptions); loga `error.message` em falha
- [x] `app/api/pixel/[id]/route.ts` — instrumentado com `logPixelMetric` em todos os paths (accepted, rejected_validation, rejected_payload_too_large, rejected_rate_limit, rejected_not_found, rejected_cors, error_persistence); latência medida com `Date.now()`; dead-letter em falha de persistência
- [x] `app/api/health/route.ts` — deep health check: ping Supabase via `COUNT(*)` em `pixels`, ping storage via `list` do bucket `creative-assets`; retorna `{ status, checks: { db, storage } }` com 503 em falha
- [x] `lib/observability/synthetic.ts` — `runSyntheticCheck(pixelId)`: POST para `/api/pixel/[id]` com evento `synthetic_ping`; mede latência; valida `status 200`
- [x] `app/api/cron/pixel-synthetic/route.ts` — cron protegido por `CRON_SECRET` fail-closed (guard `!cronSecret` antes do compare); chama `runSyntheticCheck`; loga resultado
- [x] `vercel.json` — cron `pixel-synthetic` adicionado com schedule `0 1 * * *` (diário — limite Hobby plan; Pro Vercel permite `*/1 * * * *`)

### Fixes de segurança e corretude (pós-revisão final)
- [x] **CRON_SECRET bypass** — `if (!cronSecret || authHeader !== ...)` evita comparar contra `"Bearer undefined"` quando env var não está configurada
- [x] **`writeToDeadLetter` engolia erros Supabase** — `{ error }` tuple capturado e logado
- [x] **Outcome semântico 413** — label corrigido de `rejected_rate_limit` para `rejected_payload_too_large`

### SLOs definidos
- Disponibilidade `/api/pixel` ≥ 99,9%
- p95 de latência < 200ms
- Perda de evento < 0,1%

### Testes
- [x] `tests/unit/observability-metrics.test.ts` — 3 testes: JSON válido, organizationId null, todos os 7 valores de `PixelOutcome`
- [x] `tests/unit/pixel-dead-letter.test.ts` — writeToDeadLetter via service client mockado
- [x] `tests/e2e/pixel-ingestion.spec.ts` — E2E de ingestão fim-a-fim (evento entra, deep health check)

### Entregáveis
- PR #18 mergeado: https://github.com/CoimbraViih/adtech/pull/18
- `tsc --noEmit` zero erros; `vitest run` passando
- `pixel_dead_letter` aplicada em produção (Supabase prod) ✅
- Deploy em produção: `https://adhunter-eta.vercel.app` (`dpl_H5gSabivWzmThHUUY9y8xvfJhqFz`) ✅
- **Pendente:** adicionar `SYNTHETIC_PIXEL_ID` nas env vars da Vercel para ativar o cron sintético

---

---

# PLANEJADOS

> Sequência de execução: ~~M13~~ ✅ → ~~M17~~ ✅ → ~~M16~~ ✅ → ~~M19~~ ✅ → **M22 → M10 → M18 → M15 → ~~M20~~ ✅ → ~~M21~~ ✅ → M8-DMP → (reavaliar M12)**
>
> M10 pode subir em beta sem M22 — mas **cobrar clientes exige M22** primeiro. M12 (PMP) deliberadamente adiado para depois de M19.

---

## M13 — Event Data Layer (ClickHouse) ✅ CONCLUÍDO

**Branch:** `feat/m13-event-data-layer` → mergeado em `main` via PR #19 (`49e3834`)  
**Depende de:** M14  
**Plano detalhado:** `docs/superpowers/plans/2026-06-22-MASTER-plano-execucao.md` §5  
**Objetivo:** Mover eventos do pixel do Postgres para ClickHouse com ingestão event-driven (padrão transactional outbox). Pré-requisito do loop de IA (M19), data transparency (M18), DMP real (M8-DMP) e otimização preditiva.

> **Skills:** `/supabase` · `/supabase-postgres-best-practices` · `/webapp-testing`

### Database / Infra
- [x] `supabase/migrations/028_events_outbox.sql` — tabela `events_outbox` (outbox transacional): `id`, `organization_id`, `workspace_id`, `pixel_id`, `payload JSONB`, `attempts INT DEFAULT 0`, `processed_at TIMESTAMPTZ NULL`, `created_at`; RLS AS RESTRICTIVE service role (USING(false)/WITH CHECK(false)); partial index em `(created_at) WHERE processed_at IS NULL`
- [x] `infra/clickhouse/schema.sql` — tabela `events` MergeTree particionada por `toYYYYMMDD(event_time)`, ORDER BY `(organization_id, workspace_id, event_time)`, TTL 2 anos; LowCardinality em `event_type` e `consent_state`
- [x] `infra/clickhouse/materialized_views.sql` — `mv_conversions_campaign_day` (SummingMergeTree: conversions + revenue por campanha/dia) + `mv_funnel_steps` (SummingMergeTree: event_count por tipo/dia)

### Backend
- [x] `lib/events/schema.ts` — tipos `AdFlowEvent` + `ConsentState` ('granted' | 'denied' | 'unknown'); placeholder para M17
- [x] `lib/events/clickhouse.ts` — client HTTP (Vercel-compatible, sem TCP nativo): `isClickHouseConfigured`, `chInsert`, `chQuery`, `chQueryWithParams` com `{name:Type}` placeholder syntax (SQL-injection safe via `param_${key}` URL params)
- [x] `lib/events/ingest.ts` — `enqueueEvent`: grava em `events_outbox` via service client; fire-and-forget no pixel route; retorna `{ queued: boolean }` sem lançar exceção
- [x] `lib/events/consumer.ts` — `drainOutbox`: batch de 500 eventos, MAX_ATTEMPTS=3, retry por linha individual (não batch) no catch, marca `processed_at` no sucesso
- [x] `lib/events/query.ts` — `getConversionsByCampaign` + `getFunnelByDay` com `chQueryWithParams` sobre as MVs; sem interpolação de strings de entrada do usuário
- [x] `app/api/pixel/[id]/route.ts` — `void enqueueEvent(adflowEvent)` adicionado como fire-and-forget após INSERT em `pixel_events` (dual write — backward compatible com M5)
- [x] `app/api/cron/drain-events-outbox/route.ts` — cron protegido por `CRON_SECRET` fail-closed; chama `drainOutbox`; loga resultado JSON
- [x] `scripts/backfill-events-to-outbox.ts` — script one-time: paginação por offset em `pixel_events`, join `pixels(workspace_id, workspaces(organization_id))`, insert em `events_outbox`
- [x] `vercel.json` — cron `drain-events-outbox` adicionado com schedule `0 2 * * *` (diário 2am — limite Hobby plan; 3 crons no total)

### Testes
- [x] `tests/unit/events-schema.test.ts` — 3 testes: shape de AdFlowEvent, 3 valores ConsentState, campos opcionais nulos
- [x] `tests/unit/clickhouse-client.test.ts` — 6 testes: `isClickHouseConfigured`, `chInsert` skip sem config / rows vazios / HTTP 500, `chQuery` retorna [] sem config; `vi.resetModules()` + dynamic import para re-avaliar env vars no nível de módulo
- [x] `tests/unit/events-ingest.test.ts` — 3 testes: `queued: true` no sucesso, campos corretos em `events_outbox`, `queued: false` em erro Supabase sem throw
- [x] `tests/unit/events-consumer.test.ts` — 4 testes: skip quando não configurado, outbox vazia, sucesso com contagem, falha incrementa attempts por linha
- [x] `tests/unit/events-query.test.ts` — 4 testes: `getConversionsByCampaign` e `getFunnelByDay` usam `chQueryWithParams`

### Correções críticas (pós-review)
- [x] **Per-row attempts increment** — `drainOutbox` incrementa `attempts` por linha individualmente no catch; removida pré-incrementação incorreta de batch com `rows[0].attempts`
- [x] **SQL injection em query.ts** — `chQueryWithParams` adicionado ao client com `{name:Type}` placeholders + `param_${key}` via URLSearchParams; zero interpolação de dados externos no SQL

### Entregáveis
- PR #19 mergeado: https://github.com/CoimbraViih/adtech/pull/19
- `tsc --noEmit` zero erros; `vitest run` 435/435 passando (20 novos testes M13)
- Pixel responde 204 mesmo com ClickHouse indisponível (outbox acumula e drena depois)
- Dual write backward-compatible: `pixel_events` (Postgres) continua alimentando M5 analytics
- Deploy em produção: aguardando build Vercel (`dpl_8JGGa4Xe5t2FLjsD8xWjvuXs7b2S`)

### Ações manuais pré-ativação (ClickHouse Cloud)
- [ ] Criar conta ClickHouse Cloud (sa-east-1) e rodar `infra/clickhouse/schema.sql` + `infra/clickhouse/materialized_views.sql`
- [ ] Configurar `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE` nas envs da Vercel
- [ ] Aplicar `supabase/migrations/028_events_outbox.sql` no Supabase de produção
- [ ] Executar `scripts/backfill-events-to-outbox.ts` uma vez após a migration

---

## M22 — Monetização para Go-Live (% spend + fiscal BR)

**Branch:** `feat/m22-monetization`  
**Depende de:** M-ADS (`campaign_metrics_daily` já pronto)  
**Objetivo:** Cobrar de verdade. M9 entregou assinatura fixa com price IDs de teste — descartado. O modelo de go-live é **sem mensalidade**, taxa marginal sobre o gasto gerenciado + piso R$197/conta ativa. **É o gate de comercialização — sem este milestone, o produto não pode ser vendido.**

> **Skills:** `/stripe:stripe-best-practices` · `/supabase` · `/webapp-testing`  
> **Decisão pendente (travar antes de codar):** Stripe puro vs. gateway BR (Iugu / Asaas / Vindi) para NFS-e + Pix.

### Modelo de precificação (decisão travada)

| Faixa de gasto/mês | Taxa marginal |
|--------------------|---------------|
| R$0 – R$2.000 | 10% |
| R$2.001 – R$5.000 | 5% |
| Acima de R$5.000 | 3% |

**Piso:** `max(R$197, taxa_marginal)` quando `spend > 0` — nunca cobra de quem não gastou nada.  
**Modelo:** pós-pago fee-only. Cliente paga a mídia na própria conta; AdHunter fatura só a taxa via Stripe.  
**Custo de IA (OpenAI):** absorvido pela AdHunter e embutido na taxa/piso — o cliente **não** paga tokens à parte.  
**Risco de margem:** medir custo de IA por conta/mês; alertar quando se aproximar da taxa cobrada.

### Database
- [ ] `supabase/migrations/027_usage_billing.sql` — tabelas `usage_records`, `invoices`, `billing_periods`; multi-tenant + RLS

### Backend
- [ ] `lib/billing/managed-spend.ts` — `getManagedSpend(orgId, period)`: soma spend de `campaign_metrics_daily` por org/período
- [ ] `lib/billing/fee-calculator.ts` — `calculateFee(spend)`: faixas marginais 10/5/3% + `max(R$197, fee)` quando spend > 0
- [ ] `app/api/cron/close-billing-period/route.ts` — cron mensal: calcula fee → cria invoice no Stripe → cliente paga por link; dunning automático
- [ ] `lib/stripe/plans.ts` — remover planos fixos Free/Pro/Agency; substituir por modelo de consumo
- [ ] `app/api/stripe/webhook/route.ts` — tratar `invoice.paid`, `invoice.payment_failed` (dunning → `past_due`)
- [ ] `lib/billing/fiscal/` — emissão de NFS-e, Pix/boleto (gateway BR ou Stripe BR — aguarda decisão)
- [ ] Substituir price IDs de teste por produto de consumo real em BRL no Stripe

### Interface
- [ ] `app/(dashboard)/settings/billing/page.tsx` — exibir gasto do período, fee calculada, histórico de faturas, métodos de pagamento BR
- [ ] Remover UI de "planos" (Free/Pro/Agency) — substituir por medidor de spend + estimativa da taxa

### Entregáveis
- `calculateFee(2000)` → R$197 (piso); `calculateFee(3000)` → R$200 + R$50 = R$250; `calculateFee(6000)` → R$200 + R$150 + R$30 = R$380 (testados unitariamente)
- Cron fecha o ciclo → invoice gerada no Stripe → cliente recebe link de pagamento
- Pagamento falho → org vai para `past_due` → feature-gate aplicado
- NFS-e emitida automaticamente após pagamento confirmado
- Zero price IDs de teste em produção
- `tsc --noEmit` zero erros; `vitest run` passando

---

## M10 — Deploy & Produção

**Branch:** `feat/m10-deploy`  
**Depende de:** M14 (observabilidade), M13 (event data layer atrás de flag), M1–M9, MS  
**Objetivo:** Plataforma em produção na Vercel com CI/CD, monitoramento, branding AdHunter e smoke test verde como gate de promoção.

> **Distinção:** deploy ≠ comercialização. M10 pode subir em **beta gratuito**. Para cobrar clientes, **M22 é obrigatório** antes do go-live comercial.

### Enxugamento & UX (pré-go-live — Onda 1 do plano mestre)

> Princípio: o usuário só deve ver caminhos que entregam. Zero menu que dá 404, zero tela meia-pronta.

- [ ] **Remover `Landing Pages` do sidebar** (`nav-items.ts`) — rota `/landing-pages` não existe → 404 em produção
- [ ] **Remover feature "Landing Pages sem código"** de `components/marketing/features.tsx` — não prometer o que não existe
- [ ] **Esconder `campaigns/programmatic/` e `audiences/`** atrás de feature flag — RTB e DMP são Onda 2 (hoje stub); menu de go-live = Dashboard · Campanhas · Criativos · Pixel · Analytics · Automação · Configurações
- [ ] **Empty state do dashboard:** "Conecte Meta/Google" como primeira ação quando não há integração ativa (estado vazio hoje mostra KPIs zerados sem orientação)
- [ ] **Onboarding de conexão em destaque** — integração OAuth 1 clique + seletor de contas ad (sem token manual), conforme F5 de M-ADS
- [ ] Configurar `META_APP_ID`/`META_APP_SECRET` e `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` nas envs Vercel de produção (sem isso, OAuth quebra)
- [ ] Remover 5 repos clonados da raiz (`everything-claude-code/`, `impeccable/`, `opensquad/`, `superpowers/`, `three.js/`) — ~2,3 GB fora do git

### Infra & CI

- [ ] Domínio customizado `adhunter.io` na Vercel com SSL
- [ ] GitHub Actions: CI com `npm test` + bloqueio de merge
- [ ] Vercel Analytics (Core Web Vitals)
- [ ] Alertas de uptime no `/api/health`
- [ ] Logging estruturado (Vercel Log Drains)
- [ ] Rotação de secrets de produção (nunca reusar as de dev)
- [ ] `npm audit` — corrigir vulnerabilidades `high` e `critical`
- [ ] Headers de segurança validados com securityheaders.com — mínimo nota A
- [ ] Pipeline CI: `npm test` + `npm run test:e2e` + lint + typecheck obrigatórios no merge
- [ ] Smoke test pós-deploy (synthetic do M14) como gate de promoção
- [ ] M13 (ClickHouse) sobe atrás de feature flag lendo Postgres como fallback

### Já feito

> **URLs de produção:** https://adhunter-eta.vercel.app · Supabase `vxxitabxtpnzagepplll` (sa-east-1) · Sentry org `hunter-gr`

- [x] Vercel conectado ao GitHub (`CoimbraViih/adtech`), branch `main` como produção
- [x] Env vars configuradas: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET` etc.
- [x] Sentry configurado (`sentry.client.config.ts` + `sentry.server.config.ts`)
- [x] CSP, GSAP preloader fallback, Three.js error boundary, cron schedule corrigidos em produção
- [x] Branding AdHunter completo — PR #17 mergeado (`5bdc3d8`)
- [x] Signup fix: `try-catch` defensivo nas Server Actions (`c3bbbf3`)

### Billing (postergado)
- [ ] Stripe live — aguarda M22

---

## M17 — Consent & LGPD / Cookieless ✅ CONCLUÍDO

**Branch:** `feat/m17-consent-lgpd` → mergeado em `main` via PR #21  
**Depende de:** M13 (para apagamento no event store)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-24-m17-consent-lgpd.md`  
**Objetivo:** Transformar o pixel server-side no argumento cookieless e fechar o gap de consentimento/LGPD que bloqueia venda no BR.

### Entregado

- **Migration 031** — `consent_records`, `data_deletion_requests`, `consent_state` em `events_outbox`, `strip_pii_from_outbox` RPC (SECURITY DEFINER)
- **`lib/consent/mode.ts`** — GCM v2 normalizer (`analytics_storage` → `ConsentState`)
- **`lib/consent/cmp.ts`** — AdOpt CMP embed snippet generator com sanitização XSS
- **`lib/pixel/validate.ts`** — `consent_state` + `gcm_signals` no schema Zod do pixel
- **`app/api/pixel/[id]/route.ts`** — resolve consent, strip PII quando negado, gating de fanout, escrita em `consent_records`
- **`public/adflow.js`** — reescrito: fila de eventos, `adflow("consent", "default"/"update")`, `window.__adflowConsentCallback`, descarta fila quando denied
- **`app/api/lgpd/deletion/route.ts`** — GET/POST `/api/lgpd/deletion` com RBAC (owner/admin), chama `strip_pii_from_outbox`
- **`app/(dashboard)/settings/privacy/`** — página de privacidade (snippet CMP + UI de requisições LGPD)
- **23 novos testes passando** (consent-mode, pixel-validate-consent, lgpd-deletion, pixel-route)
- `tsc --noEmit` → 0 erros

---

## M16 — E-commerce Integrations (Nuvemshop / VTEX / Shopify) ✅ CONCLUÍDO

**Branch:** `feat/m16-ecommerce` → mergeado em `main` via PR #22 (`3642de1`)  
**Depende de:** M10 (deploy), M13 (event store)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-24-m16-ecommerce-integrations.md`  
**Objetivo:** Wedge de go-to-market no Brasil — integrar plataformas de venda (não só de anúncio). Alimenta retargeting, DCO (M15) e atribuição com conversões reais.

### Database
- [x] `supabase/migrations/029_commerce.sql` — tabelas `product_catalogs`, `products`, `commerce_orders`; UNIQUE `(organization_id, provider)` em catalogs; UNIQUE `(catalog_id, external_id)` em products; RLS completo com `WITH CHECK` em todas as políticas write (service_role + admin)

### TypeScript — tipos canônicos
- [x] `lib/commerce/types.ts` — `CommerceProvider`, `CanonicalProduct`, `CanonicalOrder`, `CommerceLineItem`, `isCanonicalOrder` type guard
- [x] `lib/commerce/sync.ts` — `syncCommerceProvider(orgId, provider)`: lookup de `product_catalogs`, delega por provider, atualiza `synced_at`; exhaustiveness check `const _never: never = provider`

### TypeScript — Nuvemshop
- [x] `lib/commerce/nuvemshop/client.ts` — `fetchNuvemshop(orgId, path)` com credencial `access_token` + `user_id`; `buildNuvemshopAuthUrl`, `exchangeNuvemshopCode`; header `Authentication: bearer` (não-padrão da plataforma)
- [x] `lib/commerce/nuvemshop/catalog.ts` — paginação por número de página; upsert em `products`
- [x] `lib/commerce/nuvemshop/webhooks.ts` — `verifyNuvemshopHmac` (SHA-256, hex, `timingSafeEqual`); `parseNuvemshopOrder → CanonicalOrder`

### TypeScript — Shopify
- [x] `lib/commerce/shopify/client.ts` — `fetchShopify(orgId, path)` com `access_token` + `shop_domain`; API version `2024-04`; `buildShopifyAuthUrl`, `exchangeShopifyCode`
- [x] `lib/commerce/shopify/catalog.ts` — paginação por cursor via `Link` header `rel="next"` + `page_info`
- [x] `lib/commerce/shopify/webhooks.ts` — `verifyShopifyHmac` (SHA-256, **base64**, `timingSafeEqual`); `parseShopifyOrder → CanonicalOrder`

### TypeScript — VTEX
- [x] `lib/commerce/vtex/client.ts` — `fetchVtex(orgId, path)` com headers `X-VTEX-API-AppKey` + `X-VTEX-API-AppToken`; base URL `{accountName}.vtexcommercestable.com.br`
- [x] `lib/commerce/vtex/catalog.ts` — paginação por offset
- [x] `lib/commerce/vtex/webhooks.ts` — `verifyVtexHook` (token comparison via `timingSafeEqual`; sem HMAC); `parseVtexOrder` divide centavos ÷ 100; usa campo `orderId`

### API Routes
- [x] `app/api/commerce/[provider]/oauth/start/route.ts` — providers válidos: `nuvemshop`, `shopify`; state cookie `HttpOnly`, `Secure` (prod), `SameSite=lax`, `Max-Age=600`
- [x] `app/api/commerce/[provider]/oauth/callback/route.ts` — valida state cookie; exchange de código; upsert em `product_catalogs`; Nuvemshop salva `client_secret` para verificação HMAC
- [x] `app/api/commerce/[provider]/webhook/route.ts` — `?org_id=<uuid>` como identificador multi-tenant; verificação HMAC/token por provider; guard 503 quando `SHOPIFY_CLIENT_SECRET` vazio; upsert `commerce_orders` com check de erro; `enqueueEvent("purchase")` apenas quando pixel encontrado
- [x] `app/api/commerce/[provider]/sync/route.ts` — POST; RBAC owner/admin; chama `syncCommerceProvider`
- [x] `app/api/commerce/vtex/credentials/route.ts` — POST; RBAC owner/admin; salva `app_key`, `app_token`, `account_name` via `upsertCredentials`; upsert em `product_catalogs`

### Interface
- [x] `app/(dashboard)/settings/integrations/commerce/page.tsx` — Server Component; lê `product_catalogs` + `org_api_credentials` em paralelo; `isConnected`: Nuvemshop/Shopify = `oauth_connected === "true"`, VTEX = `app_key && app_token`
- [x] `components/settings/commerce-connect-card.tsx` — três fluxos: Shopify (shop domain + OAuth), Nuvemshop (OAuth direto), VTEX (form de API key); estado conectado mostra botão de sync; badge usa `bg-emerald-500/20 text-emerald-400` (CSS var opacity não funciona com Tailwind v4)

### Testes (34 novos)
- [x] `tests/unit/commerce-types.test.ts` — 3 testes: `isCanonicalOrder` guard
- [x] `tests/unit/commerce-nuvemshop-webhooks.test.ts` — 4 testes: HMAC válido/inválido, parse de pedido
- [x] `tests/unit/commerce-shopify-webhooks.test.ts` — 3 testes: HMAC base64, parse de pedido
- [x] `tests/unit/commerce-vtex-webhooks.test.ts` — 4 testes: token comparison, parse (centavos ÷ 100)
- [x] `tests/unit/commerce-webhook-route.test.ts` — 16 testes: todos os paths por provider
- [x] `tests/unit/commerce-sync.test.ts` — 4 testes: sync por provider + exhaustiveness

### Correções críticas (pós-revisão de segurança)
- [x] **RLS `WITH CHECK` faltando** — políticas `FOR ALL` sem `WITH CHECK` não protegem INSERT; adicionado em service_role e admin write em `products`, `commerce_orders` e `product_catalogs`
- [x] **Shopify secret vazio** — guard `if (!secret) return 503` antes de `verifyShopifyHmac`; evita aceitar webhooks forjados quando env var não está configurada
- [x] **Erro de upsert silencioso** — `commerce_orders` upsert checka `{ error: upsertError }`; retorna 500 em falha; previne `enqueueEvent` com dados não persistidos

### Entregáveis
- PR #22 mergeado: https://github.com/CoimbraViih/adtech/pull/22
- `tsc --noEmit` zero erros; `vitest run` 485/521 passando (+34 novos testes M16; 36 falhas são pré-existentes em main)
- Deploy Vercel produção: `dpl_AbwqnQN2GpHFiXxEqtyqS4QrNgxQ`

### Ações manuais pós-merge
- [ ] Aplicar migration `029_commerce.sql` no Supabase de produção
- [ ] Configurar `NUVEMSHOP_CLIENT_ID`, `NUVEMSHOP_CLIENT_SECRET`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` nas envs da Vercel

---

## M18 — Data Transparency (event explorer + export) ✅ CONCLUÍDO

**Branch:** `feat/m18-data-transparency` → mergeado em `main` via PR #23  
**Depende de:** M13  
**Objetivo:** Transformar "você é dono dos seus eventos, sem black-box" em feature de produto e de venda — posicionamento competitivo direto contra BMS.

### Database
- [x] `supabase/migrations/030_export_jobs.sql` — tabelas `export_destinations` + `export_runs`; RLS com WITH CHECK; trigger `set_updated_at()`; índices; service_role bypass para o cron

### TypeScript
- [x] `types/database.ts` — `ExportDestinationType`, `ExportRunStatus`, `ExportSchedule`, `ExportDestination`, `ExportRun`, `ExportDestinationCreateInput`
- [x] `lib/events/validation.ts` — `ISO_DATE` regex + `MAX_RANGE_DAYS = 90` (compartilhado entre API e export)

### Backend — Event Query Layer
- [x] `lib/events/query.ts` — `getEventsByWorkspace`: paginação parametrizada (LIMIT/OFFSET via `{limit_val:UInt32}` / `{offset_val:UInt32}`); `event_id AS id`; `JSONExtractString(properties, 'campaign_id') AS campaign_id`; cap 500 linhas; graceful fallback quando ClickHouse não configurado

### Backend — Export
- [x] `lib/export/csv.ts` — `eventsToCSV`: RFC 4180 com escaping correto de vírgulas, aspas e newlines
- [x] `lib/export/bigquery.ts` — JWT RS256 via Web Crypto + OAuth2 token exchange → BigQuery `insertAll` REST
- [x] `lib/export/snowflake.ts` — Basic auth → `{account}.snowflakecomputing.com/api/v2/statements`; batches de 500 linhas
- [x] `lib/export/s3.ts` — SigV4 manual (HMAC-SHA256 via Web Crypto); content-length nos signed headers; PUT direto no bucket
- [x] `lib/export/dispatch.ts` — roteador por `destination_type`; guard `csv_download` rejeita export agendado
- [x] `lib/export/scheduler.ts` — `runScheduledExports(scheduleType?)`: filtra por schedule type; janela lookback 1h (hourly) / 24h (daily); per-destination try/catch; registra `export_runs`; filtra `csv_download` e destinos inativos

### API Routes
- [x] `app/api/analytics/events/route.ts` — GET; auth + RBAC; validação ISO_DATE; range máx 90 dias; retorna `EventsPage`
- [x] `app/api/export/events/route.ts` — GET; mesmo auth; limite 10 000 linhas; `Content-Disposition: attachment; filename="events-YYYY-MM-DD.csv"`
- [x] `app/api/export/schedules/route.ts` — GET lista destinos (secrets mascarados como `***`); POST cria destino (org_id/ws_id da sessão, nunca do body)
- [x] `app/api/export/schedules/[id]/route.ts` — PATCH (Zod `.strict()`; IDOR guard; viewer → 403); DELETE (owner/admin only; 204)
- [x] `app/api/export/runs/route.ts` — GET runs por destination_id; IDOR guard; últimas 20
- [x] `app/api/cron/run-scheduled-exports/route.ts` — CRON_SECRET fail-closed; lê `?type=daily|hourly` e repassa ao scheduler

### Cron (vercel.json)
- [x] `0 3 * * *` → `/api/cron/run-scheduled-exports?type=daily`
- [x] `0 * * * *` → `/api/cron/run-scheduled-exports?type=hourly`

### Interface
- [x] `app/(dashboard)/analytics/events/page.tsx` — Server Component shell com `requireServerSession()`
- [x] `app/(dashboard)/analytics/events/event-explorer-client.tsx` — busca event-driven (sem `useEffect`); PAGE_SIZE=50; botão "Exportar CSV" (`<a download>`) visível após primeira busca
- [x] `components/analytics/event-explorer-filters.tsx` — date range (default 30d, max 90d), select de tipo (`page_view / add_to_cart / purchase / lead / sign_up / custom`), campo campaign_id, botão com spinner
- [x] `components/analytics/event-explorer-table.tsx` — pills por event_type (CSS vars), URL truncada 40 chars, valor em BRL, consent badge, paginação prev/next
- [x] `app/(dashboard)/settings/exports/page.tsx` — Server Component shell
- [x] `app/(dashboard)/settings/exports/exports-settings-client.tsx` — lista destinos + runs; toggle ativo; add/delete
- [x] `components/settings/export-destination-card.tsx` — badge de tipo, toggle is_active, histórico últimas 3 runs, confirm-delete dialog
- [x] `components/settings/export-destination-form.tsx` — campos dinâmicos por destination_type; POST para schedules API
- [x] `components/layout/nav-items.ts` — "Eventos" (`/analytics/events`) + "Exportações" (`/settings/exports`) adicionados

### Segurança
- [x] `organization_id` / `workspace_id` sempre da sessão — nunca do body ou URL params
- [x] IDOR guard (org check) em todos os endpoints de mutação
- [x] Secrets de credenciais mascarados (`***`) nas respostas GET da API (stripSecrets helper)
- [x] CRON_SECRET fail-closed: rejeita se ausente OU header não bate
- [x] ClickHouse sem interpolação de string — todos os inputs via bindings `{name:Type}`
- [x] Nenhum SDK de cloud (no `@aws-sdk`, `@google-cloud`, `snowflake-sdk`) — só fetch REST

### Testes (24 novos — total 509 passando)
- [x] `tests/unit/events-query-explorer.test.ts` — 4 testes: explorer, filtros, cap 500, graceful sem ClickHouse
- [x] `tests/unit/export-csv.test.ts` — 3 testes: CSV RFC 4180, escaping de vírgulas/aspas
- [x] `tests/unit/export-dispatch.test.ts` — 6 testes: roteamento por tipo, guard csv_download
- [x] `tests/unit/export-scheduler.test.ts` + `export-scheduler-integration.test.ts` — 6 testes: csv_download skip, janela lookback, contagens sucesso/falha
- [x] `tests/unit/export-schedules-api.test.ts` — 5 testes: org_id da sessão, IDOR 404, viewer 403

### Entregáveis
- PR #23 mergeado: https://github.com/CoimbraViih/adtech/pull/23
- `tsc --noEmit` zero erros
- `vitest run` 509/545 passando (36 falhas pré-existentes em sync-metrics-daily/TikTok — não relacionadas ao M18)
- Cliente exporta eventos crus dos últimos 90 dias sem suporte humano
- Export agendado entrega no destino (BigQuery/Snowflake/S3) com log de execução
- Zero vazamento cross-tenant confirmado por testes de IDOR e isolamento por org

### Pendências pós-merge (ações manuais externas)
- [ ] Aplicar migration `030_export_jobs.sql` no Supabase de produção
- [ ] Configurar `CRON_SECRET` nas envs da Vercel (se ainda não configurado)
- [ ] **Nota para M19:** migration `030_optimization_actions.sql` já está ocupado por M18 — usar `031_optimization_actions.sql`

---

## M15 — Creative Asset Uploads ✅ + DCO ✅ CONCLUÍDO

**Branch upload (concluído):** `feat/m15-creative-uploads` → mergeado via PR #14  
**Branch DCO (concluído):** `feat/m15-dco` → mergeado via PR #24 (2026-06-27)  
**Depende de (DCO):** M16 (feed de produto), M13 (sinais de performance), M3 (geração AI)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-22-MASTER-plano-execucao.md` §10  
**Objetivo:** Upload de assets já entregue (PR #14). DCO adiciona montagem/rotação de variantes por feed de produto M16, devolvendo vencedores ao loop via bandit epsilon-greedy.

> `lib/storage/creative-assets.ts` e migration `023_creative_assets.sql` **já existem** — confirmar antes de codar o DCO.

### Parte 1 — Upload de assets ✅ CONCLUÍDO (PR #14)

#### Database
- [x] Migration `023_creative_assets.sql` — tabela `creative_assets` (`workspace_id`, `creative_id`, `campaign_id`, `rtb_campaign_id`, `storage_path`, `public_url`, `mime_type`, `size_bytes`, `width_px`, `height_px`); RLS completo
- [x] Supabase Storage bucket `creative-assets` — max 10 MB; MIME allowlist: jpeg/png/webp/gif

#### TypeScript & API
- [x] `types/database.ts` — `CreativeAsset` type
- [x] `lib/storage/creative-assets.ts` — `uploadCreativeAsset`, `deleteCreativeAsset`, getters por criativo/campanha/RTB/workspace
- [x] `app/api/creative-assets/route.ts` — GET (filtros) + POST (upload multipart, 10 MB guard)
- [x] `app/api/creative-assets/[id]/route.ts` — DELETE (RBAC member+)

#### Interface
- [x] `components/creatives/asset-uploader.tsx` — dropzone, XHR progress, blob preview, galeria com remoção
- [x] Seção "Assets do criativo" em `creatives/[id]/page.tsx`
- [x] Seção "Imagens da campanha" em `campaigns/[id]/page.tsx`
- [x] Seção "Banners display" (IAB sizes) em `campaigns/programmatic/[id]/page.tsx`

#### Entregáveis
- PR #14 mergeado: https://github.com/CoimbraViih/adtech/pull/14
- `vitest run` 425/425 passando · Upload PNG/JPEG/WebP funcional nos 3 contextos
- Arquivo > 10 MB rejeitado inline no dropzone

### Parte 2 — DCO (Dynamic Creative Optimization) ✅ CONCLUÍDO (PR #24 + fix PR #25)

#### Database
- [x] `supabase/migrations/032_dco.sql` — tabelas `creative_templates`, `creative_variants`, `variant_performance`; RLS completo (USING + WITH CHECK em todas as writes; `variant_performance` via subquery em `creative_variants`)
- [x] `supabase/migrations/033_dco_atomic_increment.sql` — RPC `increment_variant_counter` para incremento atômico (elimina lost-update race)

#### Backend
- [x] `lib/creatives/dco/templates.ts` — `renderTemplate` + `extractPlaceholders` (placeholders `{{field}}` ligados ao feed M16)
- [x] `lib/creatives/dco/assembler.ts` — `productToContext` + `assembleVariant` usando `CanonicalProduct` M16; formatação de preço BRL/USD via `Intl.NumberFormat`
- [x] `lib/creatives/dco/rotation.ts` — bandit epsilon-greedy (ε=0.1): `selectVariantWithStrategy`, `recordImpression`, `recordConversion`, `refreshBanditState`; log imutável em `variant_performance` como source of truth

#### API
- [x] `app/api/dco/templates/route.ts` — GET (list) + POST (create com auto-extração de placeholders)
- [x] `app/api/dco/templates/[id]/route.ts` — GET + PATCH + DELETE (soft)
- [x] `app/api/dco/templates/[id]/variants/route.ts` — GET (com conversionRate) + POST (gera N variantes do catálogo M16)
- [x] `app/api/dco/rotate/route.ts` — POST retorna `{ variant, strategy: 'exploit' | 'explore' }`

#### Interface
- [x] `app/(dashboard)/creatives/dco/page.tsx` — dashboard de templates (Server Component)
- [x] `app/(dashboard)/creatives/dco/new/page.tsx` + `client.tsx` — página de criação de template
- [x] `app/(dashboard)/creatives/dco/[id]/page.tsx` + `client.tsx` — detalhe do template com VariantTable + RotationPreview
- [x] `app/(dashboard)/creatives/dco/[id]/edit/page.tsx` + `client.tsx` — edição de template
- [x] `components/creatives/dco/template-editor.tsx` — editor com chips de placeholders live
- [x] `components/creatives/dco/variant-table.tsx` — tabela com "Conversion gain per cycle" + gerar variantes
- [x] `components/creatives/dco/rotation-preview.tsx` — preview de rotação com label Exploit/Explore

#### Entregáveis DCO
- PR #24 mergeado: https://github.com/CoimbraViih/adtech/pull/24
- PR #25 (fix pós-review): https://github.com/CoimbraViih/adtech/pull/25
- 76 testes DCO passando (7 arquivos) — bandit estatístico, formatação de preço, API 401/422/404
- `tsc --noEmit` zero erros
- Um template + feed gera N variantes automaticamente
- Rotação epsilon-greedy realoca impressões para variante de maior conversão
- Incremento de counters atômico via RPC SQL
- Métrica "Conversion gain per cycle" exposta na UI
- Rotas `/creatives/dco`, `/creatives/dco/new`, `/creatives/dco/[id]`, `/creatives/dco/[id]/edit` acessíveis

#### Pendências pós-merge
- Aplicar migrations `032_dco.sql` e `033_dco_atomic_increment.sql` no Supabase prod antes do go-live

---

## M19 — Predictive & Autonomous Optimization (estende M11) ✅

**Branch:** `feat/m19-predictive-optimization` — mergeado em main (PR #26, 2026-06-28)  
**Depende de:** M13, M16, M11  
**Plano detalhado:** `docs/superpowers/plans/2026-06-28-m19-predictive-optimization.md`  
**Objetivo:** Evoluir o AI Traffic Manager de diagnóstico para previsão e ação — forecast de budget/pacing, previsão de ROAS/conversão, executor de ações nos clients M-ADS com trilha de auditoria.

### Entregado

- [x] `supabase/migrations/034_optimization_actions.sql` — tabelas `optimization_actions` + `optimization_guardrails` com RLS completo e `WITH CHECK` em todas as políticas de escrita
- [x] `lib/ai/predict/pacing.ts` — forecast overpace/underpace com budget sugerido
- [x] `lib/ai/predict/roas.ts` — weighted moving average + trend detection
- [x] `lib/ai/actions/guardrails.ts` — kill_switch, blacklist, max budget change %, limite diário de ações
- [x] `lib/ai/actions/executor.ts` — `proposeAction` + `executeAction` (workspace-scoped, IDOR-safe)
- [x] `lib/ai/predict/engine.ts` — orquestra sinais de pacing + ROAS → propõe/executa ações
- [x] API routes: `/api/ai/optimize/suggest`, `/api/ai/optimize/actions`, `actions/[id]/approve`, `actions/[id]/reject`, `/api/ai/optimize/guardrails`
- [x] `/api/cron/measure-outcomes` — D+7 ROAS delta, autenticado via `CRON_SECRET`
- [x] UI: `/automation/predictive` — `PredictiveActionsTable` + `GuardrailConfigForm`
- [x] 36 testes unitários passando; `tsc --noEmit` zero erros
- [x] Correções de segurança: IDOR no `executeAction`, audit trail no reject, erro genérico no approve

### Pendente (produção)
- [ ] Aplicar migration `034_optimization_actions.sql` no Supabase de produção
- [ ] Configurar `CRON_SECRET` nas envs da Vercel

---

## M20 — White-label Agency Portal ✅ CONCLUÍDO

**Branch:** `feat/m20-whitelabel` → mergeado em `main` via PR #27  
**Depende de:** M18  
**Plano detalhado:** `docs/superpowers/plans/2026-06-28-m20-whitelabel-agency-portal.md`  
**Objetivo:** Atender agências BR — self-serve ou gerenciado, marca/domínio do cliente, billing flexível com markup de revenda.

> **Skills:** `/frontend-design` · `/stripe:stripe-best-practices` · `/supabase`

### Backend
- [x] `lib/whitelabel/theme.ts` — tokens por tenant (logo, cores); `buildThemeCssVars` injeta `--adflow-accent`
- [x] `lib/whitelabel/domains.ts` — domínio custom + verificação CNAME via Google DoH TXT
- [x] `lib/whitelabel/resolve-domain.ts` — resolução de tenant por domínio via Supabase REST (anon key)
- [x] `middleware.ts` — resolver tenant por domínio custom; injeta `x-whitelabel-workspace-id`
- [x] `lib/stripe/reseller.ts` — `applyMarkup(baseAmountCents, markupPercent)` 0–500%
- [x] `app/api/stripe/webhook/route.ts` — billing em cascata (agência → cliente via `logBillingEvent`)
- [x] `app/api/whitelabel/branding/route.ts` — GET/PUT branding; autenticado + role owner/admin + plano Agency
- [x] `app/api/whitelabel/verify/route.ts` — init/complete verificação de domínio custom

### Interface
- [x] `app/(dashboard)/settings/branding/page.tsx` — logo, cores, domínio custom por workspace
- [x] `components/whitelabel/branding-form.tsx` — formulário com preview logo (https-only) + color picker
- [x] `components/whitelabel/domain-verifier.tsx` — máquina de estados idle → pending → verified
- [x] `components/whitelabel/whitelabel-theme.tsx` — injeta `<style>:root{--adflow-accent}` no layout
- [x] `components/layout/sidebar.tsx` — suporte a prop `logoUrl` para logo da agência
- [x] `components/layout/nav-items.ts` — link "Branding" na sidebar (ícone Palette)

### Database
- [x] `supabase/migrations/035_whitelabel.sql` — tabelas `workspace_branding` + `reseller_billing` com RLS
  - Anon lê domínios verificados (para middleware); members lêem; owner/admin escrevem
  - Index parcial único em `custom_domain WHERE domain_verified = TRUE`

### Testes
- [x] `tests/unit/whitelabel/` — 26 testes (theme, domains, resolve-domain, api-branding, isolation)
- [x] `tests/unit/stripe/reseller.test.ts` — 6 testes de markup (0%, 30%, 100%, arredondamento, validação)
- [x] `tsc --noEmit` zero erros; 32 testes M20 passando

### Entregáveis
- Agência configura logo/cor/domínio; cliente vê painel com a marca da agência
- Isolamento total entre tenants white-label (5 testes cross-tenant)
- Markup de revenda 0–500% refletido na cobrança em cascata via webhook Stripe
- `migration 035` precisa rodar no Supabase prod antes do go-live

---

## M21 — In-app AI Assistant & Guided Onboarding ✅

**Branch:** `feat/m21-ai-assistant` — merged PR #28 (2026-06-29)  
**Depende de:** M13 (parcial — pode iniciar em paralelo com mock do event store)  
**Plano detalhado:** `docs/superpowers/plans/2026-06-28-m21-ai-assistant.md`  
**Objetivo:** Reduzir subutilização e tickets de suporte com assistente in-app e onboarding guiado. Reusa OpenAI já no stack.

### Backend
- [x] `lib/ai/assistant/agent.ts` — orquestração SSE com tool-calling loop (depth 5), WRITE_TOOLS guard
- [x] `lib/ai/assistant/tools.ts` — 6 tools: getCampaignSummary, getPixelStats, getCreativesOverview, explainMetric, pauseCampaign, resumeCampaign
- [x] `lib/ai/assistant/knowledge.ts` — contexto de docs AdFlow injetado no system prompt
- [x] `lib/ai/assistant/types.ts` — tipos: AssistantMessage, ScreenContext, AssistantAction, StreamEvent
- [x] `app/api/assistant/route.ts` — endpoint SSE com verificação de org + workspace ownership
- [x] `app/api/assistant/actions/route.ts` — execução de ações com audit log e org isolation
- [x] `app/api/assistant/onboarding/route.ts` — GET/POST checklist com membership check

### Interface
- [x] `components/assistant/assistant-panel.tsx` — painel lateral Sheet com streaming cursor e dialog de confirmação
- [x] `components/assistant/assistant-context.tsx` — Provider + useAssistant hook com useReducer
- [x] `components/assistant/assistant-trigger.tsx` — botão flutuante bottom-right
- [x] `components/onboarding/onboarding-checklist.tsx` — checklist 5 passos com progress bar e auto-dismiss

### Database
- [x] `supabase/migrations/036_assistant.sql` — 3 tabelas: assistant_sessions, assistant_action_log, onboarding_progress

### Testes
- [x] `tests/unit/assistant-tools.test.ts` — 5 testes
- [x] `tests/unit/assistant-agent.test.ts` — 1 teste
- [x] `tests/e2e/assistant.spec.ts` — 5 testes Playwright

### Entregáveis
- [x] Assistente responde perguntas sobre dados reais do workspace com citação da fonte
- [x] Toda ação do agente exige confirmação e fica auditada (assistant_action_log)
- [x] `tsc --noEmit` zero erros; `vitest run` 659 passando

> **Pendente (prod):** rodar migration `036_assistant.sql` no Supabase prod

---

## M8-DMP — DMP Completion (reposicionado — depende de M13)

**Branch:** `feat/m8-dmp-complete`  
**Depende de:** M13 (event store), M16 (sinais de catálogo/conversão)  
**Objetivo:** Completar avaliação real de regras de audiência. `evaluateAudienceRules` é atualmente stub com estimativas hardcoded. Com M13, a segmentação roda sobre eventos no ClickHouse — sem M13, o DMP repetiria o problema de "dado inacessível".

> **Skills:** `/supabase` · `/supabase-postgres-best-practices` · `/webapp-testing`

### Backend
- [ ] `lib/rtb/dmp.ts` — `evaluateAudienceRules(rules, userId)`: substituir estimativa hardcoded por query real em `pixel_events` filtrada por `user_id_hash` + `lookback_days`
- [ ] `lib/rtb/dmp.ts` — `buildAudienceMemberships(workspaceId)`: job que popula `audience_segments` com memberships calculados
- [ ] Migration `032_audience_membership.sql`: schedule ou trigger em `pixel_events` para manter `audience_segments` atualizado

### Entregáveis
- `evaluateAudienceRules` retorna resultado real baseado em pixel events do usuário
- `audience_segments` populado com user-to-audience memberships válidos
- `tsc --noEmit` zero erros; `vitest run` passando

---

## M12 — PMP: Deal Enforcement & Programmatic Guaranteed (adiado)

**Branch:** `feat/m12-pmp`  
**Depende de:** M8, M8-DMP, **M19 (estável)**  
**Status:** Deliberadamente adiado para depois de M19. O moat defensável no BR é dado first-party + loop de IA + commerce + LGPD — não infra de deal RTB contra DSPs estabelecidas. Reavaliar após M19 estável ou se houver contrato/cliente que exija PMP.  
**Objetivo:** Fechar o ciclo programático privado. Atualmente campanhas `private`/`preferred`/`guaranteed` competem em todo leilão aberto porque `selectBid` não filtra por deal_id. PMP real exige que deal IDs sejam negociados e enforced no bid path.

> **Skills:** `/supabase` · `/webapp-testing` · `/frontend-design`

### Database
- [ ] Migration `016_pmp_deals.sql`:
  - Tabela `pmp_deals`: `id`, `workspace_id`, `deal_id TEXT UNIQUE`, `deal_name`, `deal_type` (`private|preferred|guaranteed`), `floor_price NUMERIC`, `publisher_name TEXT`, `status TEXT`, `wseat TEXT[]`, `start_date TIMESTAMPTZ`, `end_date TIMESTAMPTZ`
  - Índice em `deal_id` para lookup O(log n) no bid path (latência crítica)
  - RLS: workspace members leem; owners/admins escrevem

### TypeScript / Biblioteca
- [ ] `types/database.ts` — `PmpDeal` type
- [ ] `types/database.ts` — Estender `OpenRtbImp`: `pmp?: { private_auction: 0|1; deals: Array<{ id: string; bidfloor?: number; bidfloorcur?: string; wseat?: string[] }> }`
- [ ] `types/database.ts` — Estender `OpenRtbBid`: `dealid?: string`, `nurl?: string`, `burl?: string`
- [ ] `lib/rtb/bidder.ts` — `selectBid`: se `imp.pmp.private_auction === 1`, filtrar somente campanhas cujo `deal_id` está em `imp.pmp.deals[].id`
- [ ] `lib/rtb/bidder.ts` — campanha `guaranteed`: bypass de leilão, preço fixo = `deal.floor_price`; retornar `dealid` no `OpenRtbBid`

### API Routes
- [ ] `app/api/rtb/bid/route.ts` — estender Zod schema: aceitar `imp[].pmp` object
- [ ] `app/api/rtb/deals/route.ts` — GET (lista deals do workspace) + POST (criar deal)
- [ ] `app/api/rtb/deals/[id]/route.ts` — PATCH + DELETE

### Interface
- [ ] `app/(dashboard)/campaigns/programmatic/deals/page.tsx` — tabela de deals: publisher, deal_id, floor price, tipo, status, datas; botão "Novo Deal"
- [ ] `components/campaigns/deal-selector.tsx` — select de deal disponível ao criar campanha; aparece apenas quando `deal_type !== "open"`
- [ ] `components/campaigns/rtb-campaign-form.tsx` — integrar `DealSelector` no step 1 (Deal)
- [ ] Sidebar: link "Deals" sob Programático

### Testes
- [ ] `tests/unit/rtb-bidder-pmp.test.ts` — private auction só seleciona campanhas com deal matching; guaranteed bypassa leilão com preço fixo; open auction ignora deals
- [ ] `tests/unit/pmp-deals.test.ts` — validação Zod de criação de deal
- [ ] `tests/e2e/programmatic-pmp.spec.ts` — criação de deal, criação de campanha privada vinculada ao deal

### Entregáveis
- `tsc --noEmit` zero erros
- `vitest run` passando com novos testes de PMP
- Campanha `private` não ganha bids sem deal ID correspondente no BidRequest
- Campanha `guaranteed` retorna preço fixo do deal sem entrar em leilão

---

## Ordem de execução recomendada

```
M0–M9, MS, M11, M-ADS (F1–F4) ← CONCLUÍDOS
  │
  ├─ ~~M14~~ ✅ (Pixel Observability & SLO)
  │    └─ ~~M13~~ ✅ (Event Data Layer / ClickHouse)
  │         ├─ ~~M17~~ ✅ (Consent & LGPD / Cookieless)
  │         ├─ ~~M16~~ ✅ (E-commerce: Nuvemshop/VTEX/Shopify)
  │         ├─ M22 (Monetização Go-Live)      ← gate de comercialização
  │         │    └─ [go-live comercial liberado]
  │         ├─ M10 (Deploy & Produção)        ← smoke test M14 como gate
  │         │    ├─ M18 (Data Transparency — event explorer + export)
  │         │    │    └─ M20 (White-label Agency Portal)
  │         │    └─ M15 (Creative Uploads + DCO)
  │         │         └─ M19 (Predictive & Autonomous Optimization)
  │         │              └─ M21 (In-app AI Assistant)  ← paralelo, pode iniciar em M13
  │         │                   └─ M8-DMP (avaliação real de audiências)
  │         │                        └─ M12 (PMP — adiado pós-M19)
  │         └─ M21 pode iniciar em paralelo com M18 (com mock do event store)
```

**Sequência linear recomendada:** ~~M14~~ ✅ → ~~M13~~ ✅ → ~~M17~~ ✅ → ~~M16~~ ✅ → ~~M19~~ ✅ → **M22 → M10 → M18 → M15 → ~~M20~~ ✅ → ~~M21~~ ✅ → M8-DMP → (reavaliar M12)**

**Regras:**
- Interface mockada sempre antes do backend — cada milestone demonstrável com dados reais antes do próximo.
- M10 pode subir em **beta gratuito** sem M22; cobrar clientes exige M22 verde primeiro.
- M12 (PMP/Deal Enforcement) deliberadamente adiado: o moat defensável no BR é dado first-party + loop de IA + commerce + LGPD, não infra de deal RTB. Reavaliar após M19 estável.
- M15 neste plano inclui DCO (Dynamic Creative Optimization) além do upload de assets já implementado.
- M21 pode começar em paralelo com M16 usando mocks do event store, mas precisa de M13 para dados reais.
