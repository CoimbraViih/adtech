# AdFlow — Product Requirements Document

## 1. CONTEXT & PROBLEM

Agências digitais e anunciantes gerenciam campanhas em múltiplas plataformas (Meta, Google, programático) de forma fragmentada, usando ferramentas desconectadas. Isso gera 8 a 12 horas semanais perdidas em consolidação manual de dados, criativos lentos para aprovar (3 a 5 dias), zero visibilidade real de atribuição e 15 a 30% da verba desperdiçada em anúncios de baixa performance. Não existe uma plataforma acessível que una gestão de campanhas, criação de criativos com IA, pixel de tracking server-side e analytics de atribuição em um único painel com loop fechado de otimização.

## 2. PROPOSED SOLUTION

A AdFlow é uma plataforma SaaS full end-to-end que unifica gestão de campanhas (Meta, Google, programático), criação de criativos com IA (copy, banners, vídeo), landing page builder no-code, pixel de tracking server-side próprio, atribuição multi-touch e automação de marketing em um único painel.

O diferencial central é o loop fechado: a IA gera criativos, as campanhas são veiculadas, o pixel captura as conversões, o analytics identifica o que funcionou e a IA melhora os próximos criativos automaticamente. Cada campanha torna a próxima mais eficiente.

A plataforma substitui simultaneamente: agência de criação, ferramenta de gestão de mídia, plataforma de tracking, construtora de landing pages e ferramenta de automação. Modelo de receita: assinatura mensal (R$500–3.000) + % sobre verba gerenciada (3–8%) + take rate de mídia programática (Fase 3).

## 3. FUNCTIONAL REQUIREMENTS

- Login e Autenticação
- Dashboards
- Multi usuário
- Multi empresa
- Permissões por usuário
- Parte premium (paga)
- Relatórios e Exportação
- Integrações (API)
- Landing Page
- Busca e Filtros

IA geradora de copy (headlines, descrições, CTAs via GPT-4o) | Creative Studio para banners e vídeo (Stability AI + Runway) | Pixel server-side próprio (adflow.js) com integração Meta CAPI e Google Enhanced Conversions | Atribuição multi-touch (last-click, linear, time-decay, data-driven) | Landing Page Builder no-code | Funil builder visual com automação (e-mail, SMS, WhatsApp) | Thank You Page engine com upsell | DSP/SSP programático via OpenRTB | DMP com segmentação comportamental e lookalike | White-label para agências | Dashboard de analytics em tempo real (ROAS, CPA, LTV, CAC) | Alertas automáticos de anomalia de campanha | DCO (Dynamic Creative Optimization) | Score de qualidade de criativo 0-100 | Checagem automática de política Meta e Google

## 4. USER PERSONAS

**Admin/Sócio de Agência** — Configura a plataforma, conecta contas de mídia (Meta, Google), define planos de clientes e acompanha performance geral de todas as contas. Visão consolidada de todas as campanhas.

**Gestor de Tráfego** — Usuário principal do dia a dia. Cria campanhas, gera criativos com IA, analisa performance, exporta relatórios e otimiza lances. Precisa de agilidade e dados em tempo real.

**Cliente Final (Anunciante)** — Acesso somente leitura ao dashboard do cliente. Visualiza ROAS, CPA, spend e relatórios executivos. Não opera campanhas diretamente.

**SuperAdmin (AdFlow)** — Gerencia todos os tenants, configura planos, monitora uso de API e saúde da plataforma.

## 5. TECHNICAL STACK

### Core (MVP)
- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Node.js
- **Database:** Supabase (PostgreSQL) + Row Level Security
- **Auth:** Supabase Auth (magic link + Google OAuth)
- **Billing:** Stripe (subscriptions + usage-based)
- **AI (Copy):** OpenAI GPT-4o API
- **Hosting:** Vercel (frontend) + AWS São Paulo (backend services)

### Extended (Post-MVP)
- **High-performance services:** Go (bidding RTB, event ingestion)
- **OLAP / Event analytics:** ClickHouse
- **Cache / Rate limiting:** Redis
- **AI (Banners):** Stability AI API
- **AI (Video):** Runway API
- **AI (Voice-over):** ElevenLabs API
- **AI (Subtitles):** Whisper
- **AI (Attribution ML):** Python (scikit-learn / PyTorch)
- **Ads APIs:** Meta Marketing API, Google Ads API
- **Programmatic:** OpenRTB 2.6 (DSP/SSP)
- **Messaging:** WhatsApp Business API
- **Infra:** Docker + Kubernetes, AWS multi-region (São Paulo + Virginia)

## 6. DESIGN LANGUAGE

### Visual References
- **Linear (linear.app)** — Ultra-clean dashboard, precise typography, intelligent information density. Primary reference for campaign management panel.
- **Northbeam** — Dark AdTech attribution UI, dense and well-organized data. Reference for analytics & attribution module.
- **ChartMogul** — Clear financial SaaS analytics (MRR, churn, LTV). Reference for executive dashboards.
- **Figma** — Real-time collaborative editor. UX reference for Creative Studio and landing page editor.

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--color-base` | `#0D0D1A` | Page background (dark mode) |
| `--color-accent` | `#E8390E` | Primary CTA, highlights |
| `--color-success` | `#10B981` | Positive metrics, approvals |
| `--color-data` | `#3B82F6` | Charts, data points, links |

### Tone
Professional, data-dense, no decorative excess. Dark mode primary. Every pixel should serve a function.

## 7. DEVELOPMENT MILESTONES

| # | Milestone | Depends On |
|---|-----------|------------|
| M1 | Foundation & Auth | — |
| M2 | Campaign Management | M1 |
| M3 | AI Creative Studio | M1, M2 |
| M4 | Server-Side Pixel & Tracking | M1 |
| M5 | Analytics & Attribution | M1, M4 |
| M6 | Landing Page Builder | M1, M4, M5 |
| M7 | Programmatic DSP/SSP | M1, M2, M4 |
| M8 | Automation & Alerts | M1, M2, M4, M5 |
| M9 | White-label & SuperAdmin | M1–M8 |

**Recommended execution order:** M1 → M2 → M4 → M5 → M3 / M6 → M8 / M7 → M9
