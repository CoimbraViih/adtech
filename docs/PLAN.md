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
| M1 | Autenticação & Shell | `feat/m1-auth` | M0 |
| M2 | Gestão de Campanhas | `feat/m2-campaigns` | M1 |
| M3 | AI Creative Studio | `feat/m3-creatives` | M1, M2 |
| M4 | Pixel & Tracking | `feat/m4-pixel` | M1 |
| M5 | Analytics & Atribuição | `feat/m5-analytics` | M1, M4 |
| M6 | Landing Page Builder | `feat/m6-lp-builder` | M1, M4, M5 |
| M7 | Automação & Alertas | `feat/m7-automation` | M1, M2, M4, M5 |
| M8 | Programático DSP/SSP | `feat/m8-programmatic` | M1, M2, M4 |
| M9 | White-label & SuperAdmin | `feat/m9-whitelabel` | M1–M8 |
| MS | Segurança & Hardening | `feat/ms-security` | M1–M9 |
| M10 | Deploy & Produção | `feat/m10-deploy` | M1–M9, MS |

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

## M1 — Autenticação & Shell

**Branch:** `feat/m1-auth`  
**Objetivo:** Usuário consegue criar conta, logar, ver o dashboard shell com sidebar/topbar e fazer logout. Multi-tenant (org + workspace) funcionando com RBAC.

> **Agentes:** `@frontend-developer` · `@nextjs-architecture-expert` · `@typescript-pro` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/brainstorming` para definir fluxo de auth e onboarding · `/supabase` para criar o projeto, migrations e RLS policies · `/supabase-postgres-best-practices` para schema das tabelas core · `/vercel:auth` para integração Supabase Auth + Next.js · `/vercel:nextjs` para middleware de proteção de rotas · `/frontend-design` para login e wizard de onboarding · `/writing-plans` para detalhar as migrations em step-by-step · `/security-review` antes do merge · `/webapp-testing` para E2E de auth · `/commit` para o commit final

### Interface — construir primeiro com dados mockados
- [ ] Layout shell `app/(dashboard)/layout.tsx` com sidebar colapsável (estilo Linear)
- [ ] `components/layout/sidebar.tsx` — nav com ícones, itens: Dashboard, Campanhas, Criativos, Analytics, Pixel, Landing Pages, Automação, Configurações
- [ ] `components/layout/topbar.tsx` — breadcrumb, seletor de workspace, avatar do usuário
- [ ] `components/layout/org-switcher.tsx` — dropdown para trocar de organização
- [ ] `components/auth/user-menu.tsx` — dropdown com nome, email, plano, logout
- [ ] Página `app/(dashboard)/dashboard/page.tsx` — placeholder com cards de métricas zerados (ROAS, CPA, Spend, Conversões)
- [ ] Página `app/(auth)/login/page.tsx` — formulário magic link + botão Google OAuth
- [ ] Página `app/(auth)/signup/page.tsx` — formulário de cadastro
- [ ] `components/onboarding/onboarding-wizard.tsx` — wizard 2 passos: criar org → criar workspace (com dados mockados)
- [ ] Layout superadmin `app/(superadmin)/layout.tsx` + `tenants/page.tsx` (tabela mockada de tenants)

### Backend / Dados reais
- [ ] Criar projeto Supabase, configurar variáveis de ambiente
- [ ] Migration `001_initial_schema.sql`: tabelas `organizations`, `workspaces`, `profiles`, `organization_members`, `workspace_members`
- [ ] Migration `002_rbac.sql`: RLS policies para cada tabela e role (owner/admin/member/viewer/superadmin)
- [ ] Migration `003_billing.sql`: tabela `billing_events`
- [ ] `lib/supabase/client.ts` — browser client singleton
- [ ] `lib/supabase/server.ts` — server client com cookies
- [ ] `lib/supabase/middleware.ts` — refresh de sessão
- [ ] `lib/auth/roles.ts` — helpers: `canManageCampaigns`, `canViewOnly`, `canManageOrg`, `isSuperAdmin`, `canAccessBilling`
- [ ] `middleware.ts` — proteção de rotas (público / protegido / superadmin)
- [ ] `app/(auth)/callback/route.ts` — handler OAuth Supabase
- [ ] Conectar formulário de login ao Supabase Auth (magic link + Google)
- [ ] Conectar wizard de onboarding ao banco (criar org + workspace reais)
- [ ] `types/database.ts` — tipos gerados do schema Supabase

### Testes
- [ ] E2E: fluxo de cadastro → onboarding → dashboard (`tests/e2e/auth.spec.ts`)
- [ ] E2E: login com magic link (`tests/e2e/auth.spec.ts`)
- [ ] Unitário: helpers de roles (`tests/unit/roles.test.ts`)

### Commit final
```
git checkout main && git merge feat/m1-auth
git commit -m "feat(m1): auth, multi-tenant shell, RBAC, onboarding wizard"
```

---

## M2 — Gestão de Campanhas

**Branch:** `feat/m2-campaigns`  
**Objetivo:** Gestor de tráfego consegue criar, visualizar, pausar e arquivar campanhas. Integração real com Meta e Google (leitura + escrita de campanhas).

> **Agentes:** `@frontend-developer` · `@typescript-pro` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/brainstorming` para modelar as entidades `campaign`, `ad_set`, `ad` · `/feature-dev:feature-dev` para desenvolvimento guiado da feature de campanhas · `/supabase` para migration e RLS de campanhas · `/supabase-postgres-best-practices` para índices nas tabelas de campanha · `/frontend-design` para a tabela de campanhas e formulário multi-step · `/ui-ux-pro-max` para layout da página de detalhe · `/senior-frontend` para otimização de tabela com paginação · `/api-integration-specialist` para wrappers Meta e Google Ads API · `/writing-plans` para detalhar a integração com cada plataforma · `/security-review` antes do merge · `/webapp-testing` para E2E de campanhas · `/simplify` após implementação · `/commit` para o commit final

### Interface — construir primeiro com dados mockados
- [ ] `app/(dashboard)/campaigns/page.tsx` — tabela de campanhas com colunas: Nome, Plataforma, Status, Budget, ROAS, CPA, Spend, Impressões, Cliques
- [ ] `app/(dashboard)/campaigns/new/page.tsx` — formulário de criação: nome, objetivo, plataforma, budget diário, datas, público
- [ ] `app/(dashboard)/campaigns/[id]/page.tsx` — detalhe da campanha: gráficos de performance, conjuntos de anúncios, criativos vinculados
- [ ] `components/campaigns/campaign-table.tsx` — tabela com filtro por status/plataforma, busca por nome, paginação
- [ ] `components/campaigns/campaign-form.tsx` — formulário multi-step: configuração → público → orçamento → revisão
- [ ] `components/campaigns/status-badge.tsx` — badge colorido para status (ativo/pausado/rascunho/arquivado)
- [ ] `components/campaigns/platform-icon.tsx` — ícones Meta/Google/Programático
- [ ] Filtros e busca funcionando no estado local (React)

### Backend / Dados reais
- [ ] Migration `004_campaigns.sql`: tabelas `campaigns`, `ad_sets`, `ads` com `workspace_id` + RLS
- [ ] `app/api/campaigns/route.ts` — GET (lista) + POST (criar)
- [ ] `app/api/campaigns/[id]/route.ts` — GET (detalhe) + PATCH (atualizar) + DELETE (arquivar)
- [ ] `lib/meta/client.ts` — wrapper Meta Marketing API (listar + criar campanhas)
- [ ] `lib/google/client.ts` — wrapper Google Ads API (listar + criar campanhas)
- [ ] Sincronização de campanhas externas → banco local (job via route handler)
- [ ] Conectar tabela de campanhas à API (substituir mocks)
- [ ] Conectar formulário de criação à API (criar campanha real na plataforma)

### Testes
- [ ] E2E: criar campanha → ver na lista → pausar (`tests/e2e/campaigns.spec.ts`)
- [ ] Unitário: validação do formulário de campanha (`tests/unit/campaign-form.test.ts`)

### Commit final
```
git checkout main && git merge feat/m2-campaigns
git commit -m "feat(m2): campaign management, Meta/Google API integration"
```

---

## M3 — AI Creative Studio

**Branch:** `feat/m3-creatives`  
**Objetivo:** Gestor gera copy (headlines, descrições, CTAs) via GPT-4o, banners via Stability AI e vídeos via Runway, com score de qualidade 0-100 e checagem de política.

> **Agentes:** `@frontend-developer` · `@prompt-engineer` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/brainstorming` para definir UX do estúdio e fluxo de geração · `/claude-api` para integrações com modelos de IA (wrappers OpenAI, rate limiting, retry) · `/prompt-engineer` para os prompts de copy, score 0-100 e checagem de política Meta/Google · `/feature-dev:feature-dev` para desenvolvimento guiado do creative studio · `/supabase` para migration e storage de criativos · `/frontend-design` para galeria e estúdio de criação · `/ui-ux-pro-max` para layout do editor com abas Copy/Banner/Vídeo · `/security-review` antes do merge (foco em prompt injection) · `/webapp-testing` para E2E de geração · `/simplify` após implementação · `/commit` para o commit final

### Interface — construir primeiro com dados mockados
- [ ] `app/(dashboard)/creatives/page.tsx` — galeria de criativos com filtros (tipo, campanha, score, status de aprovação)
- [ ] `app/(dashboard)/creatives/new/page.tsx` — estúdio de criação em 3 abas: Copy / Banner / Vídeo
- [ ] `app/(dashboard)/creatives/[id]/page.tsx` — preview do criativo, score, histórico de versões, vínculo com campanhas
- [ ] `components/creatives/copy-generator.tsx` — textarea de briefing + botão gerar + lista de variações geradas (mockadas)
- [ ] `components/creatives/banner-generator.tsx` — seletor de formato (1:1, 16:9, 9:16), prompt, área de preview (mockado)
- [ ] `components/creatives/video-generator.tsx` — upload de imagens-base, prompt, player de preview (mockado)
- [ ] `components/creatives/creative-score.tsx` — gauge circular 0-100 com breakdown por critério
- [ ] `components/creatives/policy-checker.tsx` — lista de itens aprovados/reprovados por política Meta/Google
- [ ] `components/creatives/creative-card.tsx` — card da galeria com thumbnail, score, status, campanha vinculada

### Backend / Dados reais
- [ ] Migration `005_creatives.sql`: tabelas `creatives`, `creative_versions` com `workspace_id` + RLS
- [ ] `app/api/creatives/generate/copy/route.ts` — POST: briefing → GPT-4o → variações de copy
- [ ] `app/api/creatives/generate/banner/route.ts` — POST: prompt + formato → Stability AI → URL de imagem
- [ ] `app/api/creatives/generate/video/route.ts` — POST: imagens + prompt → Runway → URL de vídeo
- [ ] `app/api/creatives/score/route.ts` — POST: criativo → score 0-100 (heurística + GPT-4o)
- [ ] `app/api/creatives/policy-check/route.ts` — POST: criativo → checagem de política via GPT-4o
- [ ] `lib/ai/openai.ts` — wrapper OpenAI com retry e rate limiting
- [ ] `lib/ai/stability.ts` — wrapper Stability AI
- [ ] `lib/ai/runway.ts` — wrapper Runway API
- [ ] Conectar geradores à API (substituir mocks por streaming real)
- [ ] Adicionar variável `OPENAI_API_KEY`, `STABILITY_API_KEY`, `RUNWAY_API_KEY` ao `.env.local.example`

### Testes
- [ ] Unitário: lógica de score de criativo (`tests/unit/creative-score.test.ts`)
- [ ] E2E: gerar copy → ver variações → salvar criativo (`tests/e2e/creatives.spec.ts`)

### Commit final
```
git checkout main && git merge feat/m3-creatives
git commit -m "feat(m3): AI creative studio, copy/banner/video generation, quality score"
```

---

## M4 — Pixel & Tracking Server-Side

**Branch:** `feat/m4-pixel`  
**Objetivo:** `adflow.js` instalável em qualquer site. Eventos capturados server-side, integrados ao Meta CAPI e Google Enhanced Conversions. Dashboard de eventos em tempo real.

> **Agentes:** `@frontend-developer` · `@api-security-audit` · `@security-auditor` · `@code-reviewer`
> **Skills:** `/brainstorming` para arquitetura do endpoint de ingestion e fluxo de eventos · `/feature-dev:feature-dev` para desenvolvimento guiado do pixel · `/supabase` para migration de `pixels` e `pixel_events` + Realtime para o log ao vivo · `/supabase-postgres-best-practices` para índices na tabela de eventos (alta escrita) · `/vercel:vercel-functions` para configuração do endpoint de ingestion como Edge Function · `/frontend-design` para wizard de instalação e dashboard de eventos · `/writing-plans` para detalhar o script `adflow.js` · `/security-review` antes do merge (foco no endpoint público) · `/webapp-testing` para E2E do fluxo pixel · `/commit` para o commit final

### Interface — construir primeiro
- [ ] `app/(dashboard)/pixel/page.tsx` — lista de pixels do workspace com status (ativo/inativo), eventos nas últimas 24h
- [ ] `app/(dashboard)/pixel/new/page.tsx` — wizard de criação: nome → copiar snippet `<script>` → verificar instalação
- [ ] `app/(dashboard)/pixel/[id]/page.tsx` — detalhe: eventos em tempo real (tabela live), configurações CAPI, teste de evento
- [ ] `components/pixel/pixel-snippet.tsx` — bloco de código com botão copiar para o snippet `adflow.js`
- [ ] `components/pixel/event-log.tsx` — tabela de eventos com colunas: Evento, URL, IP (mascarado), Timestamp, Status de envio CAPI
- [ ] `components/pixel/install-checker.tsx` — verificador de instalação com feedback visual (✓ / ✗)

### Backend / Dados reais
- [ ] Migration `006_pixel.sql`: tabelas `pixels`, `pixel_events` com `workspace_id` + RLS (pixel_events sem RLS no write — endpoint público)
- [ ] `public/adflow.js` — script cliente: captura pageview, lead, purchase + envia para `/api/pixel/[id]`
- [ ] `app/api/pixel/[id]/route.ts` — endpoint público de ingestion (POST), valida pixel_id, persiste evento, envia ao Meta CAPI + Google Enhanced Conversions de forma assíncrona
- [ ] `lib/tracking/meta-capi.ts` — wrapper Meta Conversions API
- [ ] `lib/tracking/google-ec.ts` — wrapper Google Enhanced Conversions
- [ ] Conectar dashboard de eventos à tabela `pixel_events` em tempo real (Supabase Realtime)
- [ ] Adicionar variáveis `META_CAPI_TOKEN`, `GOOGLE_EC_TOKEN` ao `.env.local.example`

### Testes
- [ ] Unitário: parsing e validação de eventos (`tests/unit/pixel-ingestion.test.ts`)
- [ ] E2E: criar pixel → copiar snippet → evento de teste → ver no log (`tests/e2e/pixel.spec.ts`)

### Commit final
```
git checkout main && git merge feat/m4-pixel
git commit -m "feat(m4): server-side pixel, Meta CAPI, Google Enhanced Conversions"
```

---

## M5 — Analytics & Atribuição

**Branch:** `feat/m5-analytics`  
**Objetivo:** Dashboard de analytics em tempo real (ROAS, CPA, LTV, CAC) com atribuição multi-touch (last-click, linear, time-decay). Relatórios exportáveis.

> **Agentes:** `@frontend-developer` · `@typescript-pro` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/brainstorming` para modelar os motores de atribuição e estrutura dos dados · `/feature-dev:feature-dev` para desenvolvimento guiado do dashboard · `/supabase` para migration de `attribution_results` e queries agregadas · `/supabase-postgres-best-practices` para otimizar queries de analytics (window functions, índices por período) · `/ui-ux-pro-max` para layout do dashboard de analytics (referência Northbeam) · `/frontend-design` para KPI cards, gráficos de funil e timeline · `/web-performance-optimization` para carregamento rápido do dashboard com muitos dados · `/writing-plans` para detalhar os algoritmos de atribuição · `/security-review` antes do merge · `/webapp-testing` para E2E de export · `/commit` para o commit final

### Interface — construir primeiro com dados mockados
- [ ] `app/(dashboard)/analytics/page.tsx` — dashboard principal: filtros de período, seletor de modelo de atribuição, KPI cards, gráfico de funil
- [ ] `components/analytics/kpi-card.tsx` — card de métrica com valor atual, variação vs período anterior, sparkline
- [ ] `components/analytics/attribution-chart.tsx` — gráfico de barras empilhadas mostrando contribuição por canal por modelo de atribuição
- [ ] `components/analytics/funnel-chart.tsx` — funil visual (Impressões → Cliques → Leads → Vendas) com taxas de conversão
- [ ] `components/analytics/roas-timeline.tsx` — gráfico de linha ROAS por dia com comparação de períodos
- [ ] `components/analytics/channel-breakdown.tsx` — tabela de performance por canal (Meta / Google / Orgânico)
- [ ] `components/analytics/export-button.tsx` — botão de exportar CSV/PDF com seleção de métricas
- [ ] Seletor de modelo de atribuição (last-click, linear, time-decay, data-driven) com recalculo visual imediato (dados mockados)

### Backend / Dados reais
- [ ] Migration `007_attribution.sql`: tabela `attribution_results` com `pixel_event_id`, `campaign_id`, modelo, peso
- [ ] `app/api/analytics/summary/route.ts` — GET: ROAS, CPA, LTV, CAC agregados por período e workspace
- [ ] `app/api/analytics/attribution/route.ts` — GET: calcula atribuição multi-touch dado modelo escolhido
- [ ] `app/api/analytics/export/route.ts` — GET: gera CSV ou dispara geração de PDF
- [ ] `lib/analytics/attribution.ts` — motores de atribuição: last-click, linear, time-decay (data-driven fica para pós-MVP com Python/ML)
- [ ] Conectar dashboard à API (substituir dados mockados)
- [ ] Conectar exportação à API

### Testes
- [ ] Unitário: cada modelo de atribuição (`tests/unit/attribution.test.ts`)
- [ ] E2E: selecionar período → trocar modelo → exportar CSV (`tests/e2e/analytics.spec.ts`)

### Commit final
```
git checkout main && git merge feat/m5-analytics
git commit -m "feat(m5): analytics dashboard, multi-touch attribution, CSV export"
```

---

## M6 — Landing Page Builder

**Branch:** `feat/m6-lp-builder`  
**Objetivo:** Editor no-code drag-and-drop para criar landing pages publicáveis em subdomínio `*.adflow.app` ou domínio customizado. Thank You Page com upsell.

> **Agentes:** `@frontend-developer` · `@nextjs-architecture-expert` · `@api-security-audit` · `@security-auditor` · `@code-reviewer`
> **Skills:** `/brainstorming` para arquitetura do editor (canvas, blocos, propriedades) e estratégia de renderização da LP pública · `/feature-dev:feature-dev` para desenvolvimento guiado do builder · `/supabase` para migrations de `landing_pages`, `lp_versions`, `lp_submissions` + Storage para imagens dos blocos · `/vercel:next-cache-components` para cache das LPs públicas (ISR) · `/vercel:nextjs` para a rota pública `app/lp/[slug]` com SSG/ISR · `/frontend-design` para o editor canvas e biblioteca de blocos · `/ui-ux-pro-max` para UX do editor (referência Figma) · `/senior-frontend` para drag-and-drop performático e preview em tempo real · `/writing-plans` para detalhar cada bloco (Hero, Form, CTA, etc.) · `/security-review` antes do merge (foco em XSS do builder e submissão de lead) · `/webapp-testing` para E2E do fluxo de publicação · `/simplify` após implementação · `/commit` para o commit final

### Interface — construir primeiro
- [ ] `app/(dashboard)/landing-pages/page.tsx` — lista de landing pages: nome, URL, conversões, taxa de conversão, status (rascunho/publicada)
- [ ] `app/(dashboard)/landing-pages/new/page.tsx` — seleção de template
- [ ] `app/(dashboard)/landing-pages/[id]/editor/page.tsx` — editor visual com canvas central, painel de blocos à esquerda, painel de propriedades à direita
- [ ] `components/lp-builder/canvas.tsx` — área de edição com drag-and-drop de blocos
- [ ] `components/lp-builder/block-panel.tsx` — biblioteca de blocos: Hero, Formulário, Depoimento, CTA, Vídeo, Contador, FAQ
- [ ] `components/lp-builder/property-panel.tsx` — edição de propriedades do bloco selecionado (texto, cor, imagem, link)
- [ ] `components/lp-builder/blocks/` — implementação de cada bloco como componente React
- [ ] `app/(dashboard)/landing-pages/[id]/thankyou/page.tsx` — editor da Thank You Page com configuração de upsell
- [ ] Preview em tempo real da landing page no editor

### Backend / Dados reais
- [ ] Migration `008_landing_pages.sql`: tabelas `landing_pages`, `lp_versions`, `lp_submissions` com RLS
- [ ] `app/api/landing-pages/route.ts` — CRUD de landing pages
- [ ] `app/api/landing-pages/[id]/publish/route.ts` — publica landing page (gera HTML estático ou configura rota pública)
- [ ] `app/lp/[slug]/page.tsx` — rota pública de renderização da landing page publicada
- [ ] `app/api/lp/[slug]/submit/route.ts` — recebe formulário de lead, persiste em `lp_submissions`, dispara pixel event
- [ ] Configuração de domínio customizado (CNAME) via Vercel API

### Testes
- [ ] E2E: criar LP → adicionar bloco Hero + Formulário → publicar → submeter lead (`tests/e2e/lp-builder.spec.ts`)
- [ ] Unitário: renderização de blocos (`tests/unit/lp-blocks.test.ts`)

### Commit final
```
git checkout main && git merge feat/m6-lp-builder
git commit -m "feat(m6): no-code landing page builder, thank you page, lead capture"
```

---

## M7 — Automação & Alertas

**Branch:** `feat/m7-automation`  
**Objetivo:** Funil visual com automação (e-mail, SMS, WhatsApp). Alertas automáticos de anomalia de campanha (CPA explodindo, ROAS caindo, budget esgotando).

> **Agentes:** `@frontend-developer` · `@api-security-audit` · `@code-reviewer`
> **Skills:** `/brainstorming` para modelar o motor de execução de funil e os tipos de nós · `/feature-dev:feature-dev` para desenvolvimento guiado da automação · `/supabase` para migrations de `funnels`, `funnel_nodes`, `funnel_executions`, `alert_rules` · `/supabase-postgres-best-practices` para queries de detecção de anomalia eficientes · `/vercel:vercel-functions` para o job de checagem de alertas via Vercel Cron · `/frontend-design` para o builder visual de funil com nós drag-and-drop · `/ui-ux-pro-max` para UX do canvas de automação · `/writing-plans` para detalhar o motor de execução e os algoritmos de detecção de anomalia · `/security-review` antes do merge · `/webapp-testing` para E2E do funil · `/commit` para o commit final

### Interface — construir primeiro
- [ ] `app/(dashboard)/automation/page.tsx` — lista de funis e alertas ativos
- [ ] `app/(dashboard)/automation/funnels/new/page.tsx` — builder visual de funil (canvas com nós: gatilho → condição → ação)
- [ ] `components/automation/funnel-builder.tsx` — editor de fluxo com nós drag-and-drop
- [ ] `components/automation/node-types/` — nós: Gatilho (lead, compra, pageview), Condição (if/else), Ação (e-mail, SMS, WhatsApp, aguardar)
- [ ] `app/(dashboard)/automation/alerts/page.tsx` — configuração de alertas: tipo de anomalia, threshold, canal de notificação
- [ ] `components/automation/alert-rule-form.tsx` — formulário de regra de alerta

### Backend / Dados reais
- [ ] Migration `009_automation.sql`: tabelas `funnels`, `funnel_nodes`, `funnel_executions`, `alert_rules`, `alert_events`
- [ ] `app/api/automation/funnels/route.ts` — CRUD de funis
- [ ] `app/api/automation/execute/route.ts` — motor de execução de funil (acionado por webhook de evento de pixel)
- [ ] `lib/messaging/email.ts` — envio via Resend ou SendGrid
- [ ] `lib/messaging/sms.ts` — envio via Twilio
- [ ] `lib/messaging/whatsapp.ts` — envio via WhatsApp Business API
- [ ] `app/api/alerts/check/route.ts` — job periódico (cron via Vercel Cron) que checa anomalias e dispara alertas
- [ ] Conectar motor de automação ao pixel (evento de pixel → executa funil)

### Testes
- [ ] Unitário: motor de execução de funil (`tests/unit/funnel-engine.test.ts`)
- [ ] Unitário: detecção de anomalia (`tests/unit/anomaly-detection.test.ts`)
- [ ] E2E: criar funil → disparar evento → verificar execução (`tests/e2e/automation.spec.ts`)

### Commit final
```
git checkout main && git merge feat/m7-automation
git commit -m "feat(m7): visual funnel builder, email/SMS/WhatsApp automation, anomaly alerts"
```

---

## M8 — Programático DSP/SSP

**Branch:** `feat/m8-programmatic`  
**Objetivo:** Compra programática de mídia via OpenRTB 2.6. DMP com segmentação comportamental e lookalike. Dashboard de performance de RTB.

> **Agentes:** `@frontend-developer` · `@typescript-pro` · `@api-security-audit` · `@security-auditor` · `@code-reviewer`
> **Skills:** `/brainstorming` para arquitetura do bidder (pacing, frequency cap, CPM floor) e DMP · `/feature-dev:feature-dev` para desenvolvimento guiado do módulo programático · `/supabase` para migrations de `rtb_campaigns`, `audiences`, `bid_requests_log` · `/supabase-postgres-best-practices` para queries de match de segmento (alta performance, executam no caminho de bid) · `/vercel:vercel-functions` para o endpoint de bid como Edge Function (latência crítica <100ms) · `/vercel:runtime-cache` para cache de segmentos do DMP · `/writing-plans` para detalhar o protocolo OpenRTB 2.6 e a lógica de bid · `/security-review` antes do merge (foco no endpoint de bid e privacidade do DMP) · `/webapp-testing` para testes do bidder · `/commit` para o commit final

### Interface — construir primeiro
- [ ] `app/(dashboard)/campaigns/programmatic/page.tsx` — dashboard de campanhas RTB: win rate, CPM médio, impressões, frequência
- [ ] `app/(dashboard)/campaigns/programmatic/new/page.tsx` — wizard de campanha programática: segmento, creative, bid, deal ID
- [ ] `components/campaigns/rtb-performance.tsx` — gráfico de bid landscape e win rate ao longo do tempo
- [ ] `app/(dashboard)/audiences/page.tsx` — DMP: lista de segmentos, tamanho, sobreposições
- [ ] `components/audiences/segment-builder.tsx` — criador de segmentos por comportamento (eventos de pixel) e lookalike

### Backend / Dados reais
- [ ] Migration `010_programmatic.sql`: tabelas `rtb_campaigns`, `bid_requests_log`, `audiences`, `audience_segments`
- [ ] `app/api/rtb/bid/route.ts` — endpoint de bid response (OpenRTB 2.6) — recebe bid request, retorna bid response
- [ ] `lib/rtb/bidder.ts` — lógica de bid (CPM floor, pacing, frequency cap)
- [ ] `lib/rtb/dmp.ts` — match de usuário com segmentos do DMP via cookie/fingerprint
- [ ] Integração com SSP via OpenRTB (configurável por deal ID)
- [ ] Job de atualização de segmentos lookalike (cron semanal)

### Testes
- [ ] Unitário: lógica de bid (`tests/unit/rtb-bidder.test.ts`)
- [ ] Unitário: match de segmento DMP (`tests/unit/dmp-match.test.ts`)

### Commit final
```
git checkout main && git merge feat/m8-programmatic
git commit -m "feat(m8): OpenRTB 2.6 bidder, DMP, programmatic campaign management"
```

---

## M9 — White-label & SuperAdmin

**Branch:** `feat/m9-whitelabel`  
**Objetivo:** Agências podem vender AdFlow com sua própria marca. SuperAdmin gerencia todos os tenants, planos, uso de API e saúde da plataforma.

> **Agentes:** `@frontend-developer` · `@api-security-audit` · `@security-auditor` · `@code-reviewer`
> **Skills:** `/brainstorming` para arquitetura de white-label (tokens dinâmicos por tenant) e painel superadmin · `/feature-dev:feature-dev` para desenvolvimento guiado do módulo · `/supabase` para migration de `white_label_configs` e RLS por `organization_id` · `/supabase-postgres-best-practices` para queries de uso de API por tenant (métricas de saúde) · `/vercel:env` para variáveis de ambiente por tenant (domínios customizados) · `/frontend-design` para o painel superadmin (tabela de tenants, detalhe, planos) · `/ui-ux-pro-max` para formulário de configuração white-label · `/writing-plans` para detalhar o sistema de temas dinâmicos por tenant · `/security-review` antes do merge (foco em isolamento cross-tenant e rotas superadmin) · `/webapp-testing` para E2E do superadmin · `/simplify` após implementação · `/commit` para o commit final

### Interface — construir primeiro
- [ ] `app/(superadmin)/tenants/page.tsx` — tabela de todos os tenants: org, plano, MRR, uso de API, status
- [ ] `app/(superadmin)/tenants/[id]/page.tsx` — detalhe do tenant: usuários, workspaces, histórico de billing, logs de uso
- [ ] `app/(superadmin)/plans/page.tsx` — gestão de planos: limites de campanhas, criativos, pixels, API calls por plano
- [ ] `app/(superadmin)/health/page.tsx` — saúde da plataforma: latência de APIs externas, filas, erros
- [ ] `app/(dashboard)/settings/white-label/page.tsx` — configuração white-label: logo, cores, domínio customizado, e-mails transacionais
- [ ] `components/white-label/brand-form.tsx` — formulário de configuração de marca (logo upload, paleta de cores primária/secundária)

### Backend / Dados reais
- [ ] Migration `011_white_label.sql`: tabela `white_label_configs` com `organization_id`
- [ ] `app/api/superadmin/tenants/route.ts` — listagem e gestão de tenants (protegido por role superadmin)
- [ ] `app/api/superadmin/plans/route.ts` — CRUD de planos e limites
- [ ] `lib/white-label/theme.ts` — geração dinâmica de tokens CSS por tenant
- [ ] Aplicar white-label config no layout do dashboard (logo, cores) baseado na org do usuário
- [ ] Configuração de domínio customizado para white-label (Vercel API)

### Testes
- [ ] E2E: superadmin lista tenants → visualiza detalhe (`tests/e2e/superadmin.spec.ts`)
- [ ] Unitário: geração de tema white-label (`tests/unit/white-label-theme.test.ts`)

### Commit final
```
git checkout main && git merge feat/m9-whitelabel
git commit -m "feat(m9): white-label for agencies, superadmin tenant management"
```

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

### Landing Page Builder (M6)
- [ ] **XSS via builder**: nunca renderizar HTML do usuário com `dangerouslySetInnerHTML` sem sanitização — usar `DOMPurify` server-side antes de persistir
- [ ] **Submissão de lead (endpoint público)**: `zod` + rate limiting por IP
- [ ] **Upload de imagens**: validar tipo MIME real (não só extensão), limitar a 5MB, armazenar no Supabase Storage
- [ ] **Slug de LP**: validar com regex `^[a-z0-9-]+$` — sem path traversal
- [ ] CAPTCHA (hCaptcha ou Cloudflare Turnstile) no formulário de lead

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

### White-label & SuperAdmin (M9)
- [ ] Verificar `isSuperAdmin()` em **cada** route handler individualmente — defesa em profundidade
- [ ] Isolamento cross-tenant: testar que admin de um tenant não acessa dados de outro
- [ ] Upload de logo: validar tipo MIME (`image/png`, `image/jpeg`, `image/svg+xml`), limitar 2MB, sanitizar SVG
- [ ] Cores white-label validadas como hex — rejeitar valores CSS arbitrários
- [ ] Auditoria de ação do superadmin: logar ações destrutivas com timestamp e user_id

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
- [ ] Revisão final com `@security-auditor` nos endpoints críticos: auth callback, pixel ingestion, bid RTB, Stripe webhook

### Commit final
```
git checkout main && git merge feat/ms-security
git commit -m "feat(ms): security hardening, LGPD compliance, full audit across all modules"
```

---

## M10 — Deploy & Produção

**Branch:** `feat/m10-deploy`  
**Depende de:** M1–M9, MS  
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

## Ordem de execução recomendada

```
M0 (setup)
  └─ M1 (auth + shell)
       ├─ M2 (campanhas)
       │    └─ M3 (criativos AI)   ← paralelo com M4
       └─ M4 (pixel)
            ├─ M5 (analytics)
            │    └─ M6 (LP builder)
            ├─ M7 (automação)      ← depende M2 + M4 + M5
            └─ M8 (programático)   ← depende M2 + M4
                 └─ M9 (white-label)
                      └─ MS (segurança)
                           └─ M10 (deploy)
```

**Regra:** Interface mockada sempre antes do backend. Cada milestone deve estar demonstrável com dados reais antes de iniciar o próximo.
