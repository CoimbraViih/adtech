# CLAUDE.md — AdFlow Project Briefing

This file provides Claude Code with complete context for the AdFlow project.
Full PRD: `docs/PRD.md` | Implementation plans: `docs/superpowers/plans/`

---

## What Is AdFlow

AdFlow is a full end-to-end AdTech SaaS platform that unifies campaign management (Meta, Google, programmatic), AI creative generation (copy, banners, video), a no-code landing page builder, a proprietary server-side tracking pixel, multi-touch attribution, and marketing automation in a single dashboard.

The core differentiator is a **closed optimization loop**: AI generates creatives → campaigns run → pixel captures conversions → analytics identifies what worked → AI improves the next creatives automatically.

Target users: Brazilian digital agencies and advertisers.
Revenue model: monthly subscription (R$500–3.000) + % of managed spend (3–8%) + programmatic take rate (Phase 3).

---

## Tech Stack

### Frontend
| Tool | Version / Notes |
|------|----------------|
| Next.js | 15, App Router, React Server Components |
| React | 19 |
| TypeScript | Strict mode (`"strict": true`) |
| Tailwind CSS | v4 |
| shadcn/ui | Component library — add via `npx shadcn@latest add` |

### Backend
| Tool | Notes |
|------|-------|
| Next.js API Routes | Primary backend for MVP |
| Node.js | Runtime |
| Go | High-performance services post-MVP (bidding, event ingestion) |

### Database & Auth
| Tool | Notes |
|------|-------|
| Supabase (PostgreSQL) | Primary database, Row Level Security enabled everywhere |
| Supabase Auth | Magic link + Google OAuth. Always use `getUser()` server-side, never `getSession()` |
| Redis | Cache and rate limiting (post-MVP) |
| ClickHouse | OLAP for campaign event analytics at scale (post-MVP) |

### Billing
| Tool | Notes |
|------|-------|
| Stripe | Subscriptions + usage-based billing. Plans: Free / Pro / Agency |

### AI / External APIs
| Service | Purpose |
|---------|---------|
| OpenAI GPT-4o | Copy generation (headlines, descriptions, CTAs) |
| Stability AI | Banner generation |
| Runway | Video generation |
| ElevenLabs | Voice-over |
| Whisper | Auto-subtitles |
| Meta Marketing API | Campaign management |
| Google Ads API | Campaign management |
| OpenRTB 2.6 | Programmatic DSP/SSP (open auction) |
| WhatsApp Business API | Automation messaging |

### Infrastructure
- **Hosting:** Vercel (Next.js app) + AWS São Paulo (backend services, post-MVP)
- **Containers:** Docker + Kubernetes (post-MVP)
- **Region strategy:** AWS sa-east-1 (primary) + us-east-1 (secondary)
- **Creative asset storage:** Supabase Storage bucket `creative-assets` — imagens de banners, thumbnails e assets de campanha (M15)

---

## Folder Structure

```
adtech/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Public auth routes (no layout shell)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts     # Supabase OAuth callback
│   ├── (dashboard)/              # Protected app routes
│   │   ├── layout.tsx            # Sidebar + topbar shell
│   │   ├── page.tsx              # Redirect → /dashboard
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── campaigns/            # M2: campaign management
│   │   ├── creatives/            # M3: AI creative studio
│   │   ├── analytics/            # M5: attribution dashboard
│   │   ├── pixel/                # M4: pixel management
│   │   ├── landing-pages/        # M6: LP builder
│   │   ├── automation/           # M7: funnel automation
│   │   ├── settings/
│   │   │   └── billing/page.tsx  # Stripe billing portal
│   │   └── onboarding/page.tsx   # Org + workspace setup wizard
│   ├── (superadmin)/             # AdFlow internal admin
│   │   ├── layout.tsx
│   │   └── tenants/page.tsx
│   ├── api/
│   │   ├── stripe/webhook/route.ts
│   │   ├── pixel/[id]/route.ts   # M4: event ingestion endpoint
│   │   └── health/route.ts
│   ├── layout.tsx                # Root layout (fonts, providers)
│   ├── globals.css               # Design tokens + Tailwind base
│   └── page.tsx                  # Root redirect
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (auto-generated)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── org-switcher.tsx
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── user-menu.tsx
│   ├── dashboard/                # Dashboard-specific widgets
│   ├── campaigns/                # M2 components
│   ├── creatives/                # M3 components
│   └── onboarding/
│       └── onboarding-wizard.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (singleton)
│   │   ├── server.ts             # Server client (cookies)
│   │   └── middleware.ts         # Session refresh helper
│   ├── stripe/
│   │   ├── client.ts
│   │   ├── plans.ts              # Plan definitions & feature gates
│   │   └── webhooks.ts           # Webhook event handlers
│   ├── storage/
│   │   └── creative-assets.ts    # M15: upload/delete/list de assets no Supabase Storage
│   └── auth/
│       └── roles.ts              # RBAC helpers (canManageCampaigns, etc.)
│
├── types/
│   └── database.ts               # Supabase-generated DB types
│
├── middleware.ts                  # Route protection + session refresh
│
├── supabase/
│   └── migrations/               # SQL migration files (numbered)
│       ├── 001_initial_schema.sql
│       ├── 002_rbac.sql
│       └── 003_billing.sql
│
├── tests/
│   ├── e2e/                      # Playwright tests
│   └── unit/                     # Vitest tests
│
├── docs/
│   ├── PRD.md                    # Full product requirements
│   └── superpowers/plans/        # Implementation plans per milestone
│
├── public/
│   └── adflow.js                 # M4: client-side pixel script
│
├── .env.local.example            # Required env vars (no secrets)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

---

## Design System

### Color Tokens (set in `globals.css` and `tailwind.config.ts`)

```css
:root {
  --color-base:    #0D0D1A;   /* page background */
  --color-surface: #13131F;   /* card / panel background */
  --color-border:  #1E1E2E;   /* dividers, input borders */
  --color-muted:   #6B7280;   /* secondary text */
  --color-accent:  #E8390E;   /* primary CTA, active states */
  --color-success: #10B981;   /* positive metrics, approvals */
  --color-data:    #3B82F6;   /* charts, data points, links */
  --color-warning: #F59E0B;   /* budget alerts */
  --color-danger:  #EF4444;   /* errors, anomalies */
}
```

### Typography
- Font: **Inter** (via `next/font/google`)
- Code/data: **JetBrains Mono** (metric tables, pixel event logs)
- Scale follows Tailwind defaults; use `text-sm` for dense data tables

### UI Principles
- **Dark mode only** — no light mode toggle needed for MVP
- **Data-dense layouts** — favor tables and compact cards over big hero sections
- **No decorative elements** — every UI element must serve a function
- Linear.app is the primary design reference for the admin dashboard
- Northbeam is the reference for analytics/attribution views

---

## Database Conventions

All tables follow these conventions (enforced by RLS):

- Multi-tenant via `organization_id` on every table
- `created_at TIMESTAMPTZ DEFAULT NOW()` on all tables
- `updated_at TIMESTAMPTZ DEFAULT NOW()` with trigger on all mutable tables
- UUIDs as primary keys (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
- RLS enabled on all tables — never disable
- Server-side always uses `supabase.auth.getUser()` not `getSession()`

### Core Tables (M1)
- `organizations` — tenant root (name, plan, stripe_customer_id)
- `workspaces` — sub-accounts within an org (ad accounts, client brands)
- `profiles` — extends `auth.users` (display_name, avatar_url)
- `organization_members` — org membership + role (owner/admin/member/viewer)
- `workspace_members` — workspace access + role
- `billing_events` — Stripe webhook log

### RBAC Roles
| Role | Scope | Can Do |
|------|-------|--------|
| `owner` | Org | Full access, billing, member management |
| `admin` | Org | All except billing changes |
| `member` | Workspace | Create/edit campaigns and creatives |
| `viewer` | Workspace | Read-only (client dashboard) |
| `superadmin` | Platform | All tenants (AdFlow staff only) |

---

## Coding Conventions

### TypeScript
- Strict mode always on
- No `any` — use `unknown` + type guards when type is truly unknown
- Prefer `type` over `interface` for object shapes
- Import Supabase types from `@/types/database` — never inline table types

### React / Next.js
- Default to Server Components; add `'use client'` only when necessary (interactivity, hooks, browser APIs)
- Use `next/image` for all images
- Data fetching in Server Components via Supabase server client
- Client-side mutations via Server Actions or API routes (not direct Supabase calls)
- Route handlers in `app/api/` for webhooks and external-facing endpoints

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Database columns: `snake_case`
- Environment variables: `SCREAMING_SNAKE_CASE`
- shadcn components live in `components/ui/` — never modify generated files directly

### Error Handling
- API routes return `{ error: string }` with appropriate HTTP status
- Never expose Supabase/Stripe internal error messages to the client
- Log errors server-side; surface only user-friendly messages

### Testing
- **Unit tests:** Vitest + Testing Library (`tests/unit/`)
- **E2E tests:** Playwright (`tests/e2e/`)
- Test files mirror the source structure
- Run before every commit: `npm test` (unit) + `npm run test:e2e` (E2E)

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# OpenAI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `.env.local.example` for the full list.

---

## Development Milestones

| # | Milestone | Status | Plan File |
|---|-----------|--------|-----------|
| M0 | Setup & Design System | ✅ Done | — |
| M1 | Foundation & Auth | ✅ Done | `docs/superpowers/plans/2026-05-14-m1-foundation-auth.md` |
| M2 | Campaign Management | ✅ Done | — |
| M3 | AI Creative Studio | ✅ Done | — |
| M4 | Server-Side Pixel & Tracking | ✅ Done | — |
| M5 | Analytics & Attribution | ✅ Done | — |
| M6 | Landing Page AdFlow | ✅ Done | — |
| M7 | Automation & Alerts | ✅ Done | — |
| M8 | Programmatic DSP/SSP | ✅ Done | — |
| M9 | Monetização & Stripe | 🚧 Parcial | — |
| MS | Security & Hardening | ✅ Done | — |
| M11 | AI Traffic Manager (Campaign Diagnostics) | ✅ Done | `docs/superpowers/plans/2026-05-29-m10-ai-traffic-manager.md` |
| M-ADS | Ads Integrations Improvement (Meta/Google/TikTok/LinkedIn) | ✅ Done | `docs/superpowers/plans/2026-06-22-MASTER-plano-execucao.md` |
| M14 | Pixel Observability & SLO | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M13 | Event Data Layer (ClickHouse) | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M22 | Monetização para Go-Live (usage-based + fiscal BR) | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M10 | Deploy & Production | Planned | — |
| M17 | Consent & LGPD / Cookieless | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M16 | E-commerce Integrations (Nuvemshop / VTEX / Shopify) | ✅ Done | `docs/superpowers/plans/2026-06-24-m16-ecommerce-integrations.md` |
| M18 | Data Transparency (event explorer + export) | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M15 | Creative Asset Uploads + DCO | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M19 | Predictive & Autonomous Optimization | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M20 | White-label Agency Portal | Planned | `docs/superpowers/plans/2026-06-22-competitive-roadmap-expansion-plan.md` |
| M21 | In-app AI Assistant & Guided Onboarding | ✅ Done | `docs/superpowers/plans/2026-06-28-m21-ai-assistant.md` |
| M8-DMP | DMP Completion (real audience rule evaluation) | ✅ Done | `docs/superpowers/plans/2026-06-29-m8-dmp-completion.md` |
| M12 | PMP & Deal Enforcement | Planned (adiado — pós-M19) | — |

**Recommended execution order:** M14 → M13 → M22 → M10 → M17 → M16 → M18 → M15 → M19 → M20 → ~~M21~~ ✅ → M8-DMP → (reavaliar M12)

> **Nota:** M10 (deploy) pode subir em beta sem M22, mas **comercializar exige M22** (usage-based billing + fiscal BR). M12 (PMP/Deal Enforcement) deliberadamente adiado para depois de M19 — ver plano de expansão competitiva.

### M-ADS — Integrations Architecture (current state, post Fase 4)

Four ad platform clients exist in `lib/meta/`, `lib/google/`, `lib/tiktok/`, `lib/linkedin/`. Multi-tenant credential storage is in `lib/integrations/` (AES-256-GCM, table `org_api_credentials`). Key function: `getCredentialField(orgId, provider, field, envFallback)`.

**Completed (Fases 1–4 + backend M-ADS):**
- Multi-tenant credential lookup via `getCredentialField` — no more `process.env` gates in sync
- LinkedIn migrated to `/rest/adCampaigns` + `Linkedin-Version: 202506`
- `fetchWithRetry` with exponential backoff on all 4 platform clients (`lib/integrations/fetch-retry.ts`)
- Token refresh: Meta (`lib/meta/token-refresh.ts`), LinkedIn (`lib/linkedin/token-refresh.ts`), Google (inline in `lib/google/client.ts`), **TikTok** (`lib/tiktok/token-refresh.ts`) — wired in `commit 99c50b3`
- Pagination on all list calls (Meta: cursor, Google: nextPageToken, TikTok: offset, LinkedIn: offset)
- OAuth onboarding: `/api/integrations/[provider]/oauth/start` + `/callback` for all 4 providers
- Pixel fanout wired with `organizationId` — Meta CAPI token in `Authorization: Bearer` header
- `campaign_metrics_daily` populado pelo sync após cada sincronização das 4 plataformas
- Skill `tracking-divergence` no AI Traffic Manager: dispara `warning` quando pixel < 50% das conversões da plataforma (spend >= R$100)
- Página `/analytics/reconciliation` com tabela de divergência pixel × plataforma por campanha
- **DB upserts de `campaigns`, `ad_sets` e `ads` em `sync.ts` — ativos e testados** (`commit 99c50b3`)
- **Todos os mocks substituídos por queries Supabase reais** (`commit 08be84e`)

**Pendente (Onda 0 — ações manuais externas):**
- Configurar `META_APP_ID`/`META_APP_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` nas envs da Vercel (produção)
- Remover os 5 repositórios clonados da raiz (`everything-claude-code/`, `impeccable/`, `opensquad/`, `superpowers/`, `three.js/`) — ~2,3 GB, fora do git
- Migration `025_fix_handle_new_user_safe.sql` aplicada? Confirmar no Supabase prod antes do go-live
