# AdFlow — Plano de Execução

> Interface primeiro, backend depois. Cada milestone é uma branch, termina num commit de merge e entrega um incremento funcional e testável.

---

## Visão geral

| # | Milestone | Branch | Depende de |
|---|-----------|--------|------------|
| M0 | Setup & Design System | `feat/m0-setup` | — |
| M1 | Autenticação & Shell | `feat/m1-auth` | M0 |
| M2 | Gestão de Campanhas | `feat/m2-campaigns` | M1 |
| M3 | AI Creative Studio | `feat/m3-creatives` | M1, M2 |
| M4 | Pixel & Tracking | `feat/m4-pixel` | M1 |
| M5 | Analytics & Atribuição | `feat/m5-analytics` | M1, M4 |
| M6 | Landing Page Builder | `feat/m6-lp-builder` | M1, M4, M5 |
| M7 | Automação & Alertas | `feat/m7-automation` | M1, M2, M4, M5 |
| M8 | Programático DSP/SSP | `feat/m8-programmatic` | M1, M2, M4 |
| M9 | White-label & SuperAdmin | `feat/m9-whitelabel` | M1–M8 |
| M10 | Deploy & Produção | `feat/m10-deploy` | M1–M9 |

---

## M0 — Setup & Design System

**Branch:** `feat/m0-setup`  
**Objetivo:** Repositório configurado, design system funcional, zero código de produto ainda — só a fundação visual e de tooling.

### Interface
- [ ] Scaffold Next.js 15 com App Router, TypeScript strict, Tailwind v4
- [ ] Instalar e configurar shadcn/ui
- [ ] Definir tokens de cor em `app/globals.css` (`--color-base`, `--color-surface`, `--color-border`, `--color-muted`, `--color-accent`, `--color-success`, `--color-data`, `--color-warning`, `--color-danger`)
- [ ] Configurar fonte Inter + JetBrains Mono via `next/font/google` no root layout
- [ ] Criar página `/` provisória com as cores e tipografia do design system para validação visual
- [ ] Adicionar `tailwind.config.ts` mapeando os tokens CSS como classes utilitárias (`bg-base`, `text-accent`, etc.)

### Backend / Config
- [ ] Criar `.env.local.example` com todas as variáveis necessárias
- [ ] Configurar `next.config.ts` (domínios de imagem, headers de segurança)
- [ ] Configurar `tsconfig.json` com path alias `@/*`
- [ ] Instalar e configurar Vitest (`vitest.config.ts`)
- [ ] Instalar e configurar Playwright (`playwright.config.ts`)
- [ ] Criar `app/api/health/route.ts` retornando `{ status: "ok" }`
- [ ] Escrever teste unitário do health endpoint

### Commit final
```
git checkout main && git merge feat/m0-setup
git commit -m "feat(m0): project setup, design system tokens, tooling"
```

---

## M1 — Autenticação & Shell

**Branch:** `feat/m1-auth`  
**Objetivo:** Usuário consegue criar conta, logar, ver o dashboard shell com sidebar/topbar e fazer logout. Multi-tenant (org + workspace) funcionando com RBAC.

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

## M10 — Deploy & Produção

**Branch:** `feat/m10-deploy`  
**Objetivo:** Plataforma em produção na Vercel + AWS São Paulo, com CI/CD, monitoramento, Stripe real e domínio `adflow.app` configurado.

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

### Hardening de segurança
- [ ] Adicionar rate limiting nas API routes (Upstash Redis ou Vercel Edge Middleware)
- [ ] Revisar headers de segurança (`next.config.ts`: CSP, HSTS, X-Frame-Options)
- [ ] Auditoria de RLS: verificar todas as políticas com usuário de role diferente
- [ ] Remover qualquer `console.log` com dado sensível

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
                      └─ M10 (deploy)
```

**Regra:** Interface mockada sempre antes do backend. Cada milestone deve estar demonstrável com dados reais antes de iniciar o próximo.
