# AdFlow — Plano de Monetização & Desenvolvimento

> **Versão:** 1.0 | **Data:** Junho 2026 | **Status:** Planejamento  
> Documento derivado de análise competitiva de mercado (Smartly.io, The Trade Desk, Madgicx, Albert.ai, Skai) e pesquisa de mercado programático LATAM 2026.

---

## Sumário

1. [Contexto de Mercado](#1-contexto-de-mercado)
2. [Posicionamento Estratégico](#2-posicionamento-estratégico)
3. [Plano de Monetização](#3-plano-de-monetização)
4. [Módulo de Spend Tracking](#4-módulo-de-spend-tracking)
5. [Plano de Desenvolvimento por Milestone](#5-plano-de-desenvolvimento-por-milestone)
6. [Projeções de Receita](#6-projeções-de-receita)
7. [Riscos e Mitigações](#7-riscos-e-mitigações)

---

## 1. Contexto de Mercado

### Mercado Programático Global (2026)
- Mercado global: **$725 bilhões** (+18% YoY)
- Programático representa **91,5%** de todo display digital
- América do Sul: **$70B** em 2025 → $116B em 2030 (CAGR 10,58%)
- Brasil: maior mercado programático da América Latina

### Canais em Crescimento
| Canal | Crescimento YoY | Oportunidade |
|-------|----------------|--------------|
| CTV (Connected TV) | +28% | $36B globais; CPMs 3,4x maior que display |
| Retail Media | +34% | O mais rápido; $158B projetados até 2027 |
| DOOH Programático | +41% | 53% do DOOH brasileiro já é programático |
| Private Marketplace (PMP) | +41% | Open exchange caiu de 71% → 59% do share |

### Gaps Competitivos Identificados
Os principais concorrentes (Smartly.io, The Trade Desk, Madgicx, Albert.ai) **não entregam**:
- Loop fechado criativo → campanha → pixel → otimização
- Pixel server-side com LGPD compliance nativo para o Brasil
- DSP acessível com mínimo abaixo de R$50k/trimestre
- Geração de vídeo em português para TikTok/Reels
- CTV + DOOH no mesmo painel de gestão
- White-label real para agências brasileiras médias

---

## 2. Posicionamento Estratégico

> **"O único sistema operacional de marketing digital construído para agências brasileiras — que fecha o loop entre criativo, mídia, pixel e resultado."**

### Por que este posicionamento é defensável
- Smartly.io: enterprise, $4-5k/mês mínimo, sem programático, sem pixel próprio
- The Trade Desk: $100k/trimestre mínimo, inacessível para 95% das agências brasileiras
- Madgicx/Revealbot: ferramentas pontuais, só Meta, sem loop fechado
- Nenhum player tem LGPD-native + dados em São Paulo (AWS sa-east-1)

---

## 3. Plano de Monetização

### 3.1 Estrutura de Planos (Subscriptions)

| Plano | Preço/mês | Público | Limites |
|-------|-----------|---------|---------|
| **Starter** | R$ 499 | Freelancers, pequenas agências | 3 contas de mídia, 50 criativos IA/mês, sem programático |
| **Pro** | R$ 1.299 | Agências médias (5-20 clientes) | 10 contas, programático básico (RTB), 200 criativos/mês |
| **Agency** | R$ 2.999 | Agências grandes, grupos | Ilimitado, white-label, API, DMP, PMP, CTV/DOOH |
| **Managed** | Sob consulta (R$8k+) | Anunciantes diretos enterprise | Tudo + equipe dedicada AdFlow, SLA garantido |

**Regras de upsell natural:**
- Starter → Pro: quando atinge limite de 50 criativos ou quer programático
- Pro → Agency: quando precisa de white-label para revender ou acessar CTV/DOOH
- Agency → Managed: quando gasta >R$500k/mês em verba gerenciada

### 3.2 Take Rate sobre Verba Gerenciada (Paid Social)

Aplicado sobre **toda verba trafegada** pelas contas conectadas à AdFlow.

| Plano | % sobre Verba | Threshold |
|-------|--------------|-----------|
| Starter | 5% | Até R$50k/mês |
| Pro | 4% | R$50k–200k/mês |
| Agency | 3% | R$200k–1M/mês |
| Managed | Negociado (1,5–2,5%) | Acima de R$1M/mês |

**Como calcular:** se uma agência Pro tem 10 clientes com R$15k/mês de verba cada = R$150k/mês total → AdFlow recebe R$6.000/mês só de take rate, além dos R$1.299 de subscription.

**Canais cobertos:** Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads.

### 3.3 Take Rate Programático (DSP/SSP)

#### DSP (Demand Side — Compradores)
Verba programática comprada pelos clientes através do DSP da AdFlow.

| Volume Mensal | Take Rate |
|--------------|-----------|
| Até R$50k | 18% |
| R$50k–200k | 15% |
| R$200k–500k | 12% |
| Acima de R$500k | Negociado (8–10%) |

**Mínimo de entrada:** R$5.000/mês de verba programática (vs. $100k/trimestre do The Trade Desk).

#### SSP (Supply Side — Publishers)
Publishers brasileiros conectam inventory. AdFlow retém 15-20% de cada impressão vendida.

**Estratégia de aquisição de inventory:**
1. **Fase 1 (M7):** Integrar VIOOH/We OOH (1,3B impressões/mês DOOH Brasil) via OpenRTB
2. **Fase 2 (M7+3 meses):** Publishers digitais (blogs, portais de nicho, apps)
3. **Fase 3 (M9):** CTV — Pluto TV, Samsung TV Plus, inventory aberto de streamers brasileiros

#### Private Marketplace (PMP) — Fee de Curadoria
Deals fechados entre anunciantes e publishers específicos. AdFlow cobra **8% de curadoria** sobre o volume do deal.

### 3.4 DMP — Dados como Produto

O pixel server-side (M4) acumula dados comportamentais anonimizados que viram receita:

| Produto | Preço | Modelo |
|---------|-------|--------|
| **Segmentos de Audiência** | R$2/CPM sobre impressões com dados | Incluído no Agency, add-on no Pro |
| **AdFlow Market Intelligence** | R$2.500–5.000/relatório trimestral | Benchmark de CAC/ROAS por vertical |
| **Lookalike Data Enrichment** | R$800/mês | Para anunciantes que querem expandir audiências |

> **Compliance:** todos os dados do DMP são anonimizados via differential privacy, com consentimento registrado conforme LGPD. Dados armazenados exclusivamente em AWS sa-east-1 (São Paulo).

### 3.5 Créditos de IA

Geração de criativos (copy, banner, vídeo) é cobrada por crédito acima do limite do plano:

| Tipo | Créditos |
|------|----------|
| Copy (headline + descrição + CTA) | 1 crédito |
| Banner estático (Stability AI) | 3 créditos |
| Vídeo 15s (Runway + ElevenLabs + Whisper) | 10 créditos |
| Pack de 100 créditos | R$ 79 |
| Pack de 500 créditos | R$ 299 |

### 3.6 Add-ons e Receitas Adicionais

| Add-on | Preço | Disponível em |
|--------|-------|--------------|
| White-label (marca própria) | R$ 500/mês | Pro+ |
| API access (rate limit aumentado) | R$ 300/mês | Agency |
| Landing Page Builder | Incluído no Pro+ | — |
| Relatório de Atribuição Executivo | R$ 500/relatório | Todos |
| Certificação AdFlow (formação) | R$ 1.200/usuário | Avulso |
| Managed Service (verba ≥R$200k/mês) | R$ 5.000–15.000/mês | Managed |

### 3.7 Programa de Parceiros (Agências)

Estrutura de receita compartilhada para agências que revendem AdFlow com white-label:

| Tier | Volume de Clientes Ativos | Comissão sobre MRR dos Clientes |
|------|--------------------------|--------------------------------|
| Silver | 3–9 clientes | 15% |
| Gold | 10–24 clientes | 20% |
| Platinum | 25+ clientes | 25% + account manager dedicado |

---

## 4. Módulo de Spend Tracking

> Saber exatamente quanto cada cliente gasta mensalmente em ads (Meta, Google, TikTok, LinkedIn) e em RTB programático é **crítico** para calcular o take rate corretamente e para o próprio AdFlow otimizar seu faturamento.

### 4.1 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    AdFlow Spend Tracker                  │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Meta Ads    │  Google Ads  │  TikTok Ads  │ LinkedIn   │
│  Marketing   │  API         │  Ads API     │ Marketing  │
│  API         │              │              │ Solutions  │
└──────┬───────┴──────┬───────┴──────┬───────┴─────┬──────┘
       │              │              │             │
       └──────────────┴──────────────┴─────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Spend Ingestion  │
                    │   Service (Go)     │
                    │   Intervalo: 1h    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │    ClickHouse      │
                    │  (OLAP - eventos)  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌─────▼────────┐
    │ Dashboard       │ │ Billing     │ │ Alertas &    │
    │ Spend Analytics │ │ Engine      │ │ Anomalias    │
    │ (cliente)       │ │ (take rate) │ │ (automação)  │
    └────────────────┘ └─────────────┘ └──────────────┘
```

### 4.2 Fontes de Dados — Integração por Plataforma

#### Meta Ads
```typescript
// lib/spend/meta.ts
// Endpoint: GET /act_{ad_account_id}/insights
// Campos: spend, impressions, clicks, date_start, date_stop
// Granularidade: diária
// Auth: OAuth 2.0 — System User Token (não User Token, para evitar expiração)
```

#### Google Ads
```typescript
// lib/spend/google.ts
// API: Google Ads API v17+
// Query: SELECT campaign.id, metrics.cost_micros, segments.date FROM campaign
// Atenção: cost_micros = gasto em micros (dividir por 1.000.000 para obter R$)
// Auth: OAuth 2.0 + refresh token com escopo adwords
```

#### TikTok Ads
```typescript
// lib/spend/tiktok.ts
// Endpoint: GET /open_api/v1.3/report/integrated/get/
// Campos: spend, impressions, clicks, stat_time_day
// Auth: TikTok for Business OAuth
```

#### LinkedIn Ads
```typescript
// lib/spend/linkedin.ts
// Endpoint: GET /adAnalytics?q=analytics
// Campos: costInLocalCurrency, impressions, clicks
// Auth: OAuth 2.0 — Marketing Developer Platform
```

#### RTB / Programático (DSP próprio)
```typescript
// lib/spend/rtb.ts
// Fonte interna: tabela bid_events no ClickHouse
// Query: SELECT workspace_id, SUM(clearing_price) as spend, date
// Granularidade: real-time (streaming) e batch horário
```

### 4.3 Modelo de Dados (ClickHouse)

```sql
-- Tabela principal de spend events
CREATE TABLE spend_events (
    id              UUID DEFAULT generateUUIDv4(),
    organization_id UUID NOT NULL,
    workspace_id    UUID NOT NULL,
    platform        Enum8('meta'=1, 'google'=2, 'tiktok'=3, 'linkedin'=4, 'rtb'=5),
    account_id      String,          -- ID da conta na plataforma
    campaign_id     String,
    spend_brl       Decimal(18, 4),  -- Sempre em BRL
    spend_usd       Decimal(18, 4),  -- Original em USD (quando aplicável)
    fx_rate         Float32,         -- Taxa de câmbio usada
    impressions     UInt64,
    clicks          UInt32,
    date            Date,
    ingested_at     DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, workspace_id, platform, date);

-- Materialized view para totais mensais (billing)
CREATE MATERIALIZED VIEW spend_monthly_mv
ENGINE = SummingMergeTree()
ORDER BY (organization_id, workspace_id, platform, toYYYYMM(date))
AS SELECT
    organization_id,
    workspace_id,
    platform,
    toYYYYMM(date) AS month,
    SUM(spend_brl) AS total_spend_brl,
    SUM(impressions) AS total_impressions,
    SUM(clicks) AS total_clicks;
```

### 4.4 Serviço de Ingestão (Go)

```go
// services/spend-ingestor/main.go
// Roda a cada 1 hora via cron no Kubernetes
// Para cada workspace com contas conectadas:
//   1. Busca spend do dia anterior via API da plataforma
//   2. Converte para BRL usando taxa BCB (Banco Central)
//   3. Insere no ClickHouse via batch (10k rows por insert)
//   4. Publica evento no Redis pub/sub para atualizar dashboard em real-time
//   5. Calcula take rate acumulado e grava em spend_billing (Postgres/Supabase)

type SpendRecord struct {
    OrganizationID uuid.UUID
    WorkspaceID    uuid.UUID
    Platform       string
    AccountID      string
    CampaignID     string
    SpendBRL       decimal.Decimal
    SpendUSD       decimal.Decimal
    FXRate         float32
    Impressions    uint64
    Clicks         uint32
    Date           time.Time
}
```

### 4.5 Motor de Billing — Cálculo de Take Rate

```typescript
// lib/billing/take-rate.ts
// Roda no primeiro dia de cada mês (cron) + webhook em tempo real

export async function calculateMonthlyTakeRate(
  organizationId: string,
  month: string  // "2026-06"
): Promise<BillingResult> {
  // 1. Busca total de spend no ClickHouse (spend_monthly_mv)
  // 2. Aplica tier de take rate baseado no plano da org
  // 3. Separa: paid social take rate + RTB take rate + PMP fee
  // 4. Gera invoice no Stripe via usage-based billing
  // 5. Salva em billing_events (Supabase) para auditoria
  
  const paidSocialSpend = await getMonthlySpend(organizationId, month, ['meta','google','tiktok','linkedin']);
  const rtbSpend = await getMonthlySpend(organizationId, month, ['rtb']);
  
  const plan = await getOrgPlan(organizationId);
  const paidSocialRate = TAKE_RATES[plan].paidSocial;
  const rtbRate = TAKE_RATES[plan].rtb;
  
  const paidSocialFee = paidSocialSpend * paidSocialRate;
  const rtbFee = rtbSpend * rtbRate;
  
  // Stripe Meter Events para usage-based billing
  await stripe.billing.meterEvents.create({
    event_name: 'paid_social_spend',
    payload: { value: paidSocialSpend.toString(), stripe_customer_id: org.stripeCustomerId }
  });
  
  return { paidSocialFee, rtbFee, totalFee: paidSocialFee + rtbFee };
}
```

### 4.6 Alertas Automáticos de Spend

Integrado ao M8 (Automação & Alertas):

| Alerta | Trigger | Ação |
|--------|---------|------|
| Budget 80% consumido | Spend ≥ 80% do budget do mês | Push notification + e-mail |
| Anomalia de spend | Gasto 2x acima da média dos últimos 7 dias | Alerta urgente + sugestão de pausa |
| CPA acima do target | CPA 30% acima do target configurado | Sugestão automática de ajuste de lance |
| Zero spend (campanha parada) | 0 gasto por 6h em campanha ativa | Alerta de campanha travada |
| Limite de take rate | Cliente próximo do próximo tier de preço | Notificação pro-ativa para o gestor |

### 4.7 Integração com Small Business Plugin (Stripe)

O plugin `small-business:stripe` da AdFlow permite que o **próprio operador da plataforma** (a equipe AdFlow) monitore a receita gerada pelos take rates, como se fosse um negócio SaaS:

```
Plugin small-business conectado ao Stripe da AdFlow:
- cash-flow-snapshot: projeção 30/60/90 dias de receita (MRR + take rates)
- friday-brief: resumo semanal de MRR, novos clientes, churn, take rate acumulado
- month-end-prep: fechamento mensal com reconciliação subscription + usage billing
- invoice-chase: cobrança automática de take rates não liquidados
```

**Webhook Stripe → Supabase (billing_events):**
```typescript
// app/api/stripe/webhook/route.ts
// Eventos tratados:
// - invoice.payment_succeeded → confirma recebimento, atualiza billing_events
// - invoice.payment_failed → aciona retry + notificação para o cliente
// - customer.subscription.updated → atualiza plano da org em organizations.plan
// - billing_meter_event → registra uso de take rate para faturamento
```

---

## 5. Plano de Desenvolvimento por Milestone

### Ordem Recomendada com Justificativa de Negócio

```
M1 → M2 → M4 → M5 → M3/M6 → M8 → M7 → M9 → M11
```

**Lógica:** M1 é fundação obrigatória. M2 entrega o produto mínimo vendável (gestão de campanhas). M4 é o pixel — sem ele, M5 (analytics) e o take rate sobre spend não funcionam. M3/M6 são upsell sobre a base estabelecida. M7 (programático) é o motor de maior margem mas requer infraestrutura Go + ClickHouse madura.

---

### M1 — Foundation & Auth
**Duração estimada:** 3 semanas  
**Receita gerada:** Indireta (viabiliza todos os outros módulos)  
**Plano mínimo:** Starter

Entregáveis:
- Autenticação completa (magic link + Google OAuth via Supabase Auth)
- Multi-tenant: organizations + workspaces + membros com RBAC
- Onboarding wizard (conectar contas de mídia)
- Billing base: Stripe subscriptions (Starter/Pro/Agency)
- **Spend Tracking v0:** estrutura de tabelas no ClickHouse, serviço de ingestão esqueleto

---

### M2 — Campaign Management
**Duração estimada:** 4 semanas  
**Receita gerada:** Subscription (Starter+) + início do take rate sobre verba Meta/Google  
**Plano mínimo:** Starter

Entregáveis:
- Conexão Meta Marketing API + Google Ads API
- Dashboard de campanhas (ROAS, CPA, spend, impressões, cliques)
- Criação/edição de campanhas diretamente na plataforma
- **Spend Tracking v1:** ingestão horária de Meta + Google, cálculo de take rate diário
- Billing: ativação do Stripe Meter para `paid_social_spend`

---

### M4 — Server-Side Pixel & Tracking
**Duração estimada:** 3 semanas  
**Receita gerada:** Feature premium (diferencial vs. concorrentes), reduz churn  
**Plano mínimo:** Pro

Entregáveis:
- `adflow.js` client-side (1KB gzipped)
- Endpoint de ingestão de eventos: `app/api/pixel/[id]/route.ts` (Go post-MVP)
- Integração Meta CAPI + Google Enhanced Conversions
- Dashboard de eventos: pageview, add_to_cart, purchase, lead
- **LGPD Compliance:** banner de consentimento gerado automaticamente, TTL de dados configurável
- **Spend Tracking v2:** correlação evento de conversão ↔ spend por campanha (base do M5)

---

### M5 — Analytics & Attribution
**Duração estimada:** 4 semanas  
**Receita gerada:** Upsell pro plano Agency, base para "AdFlow Intelligence Reports" (R$2.5k/relatório)  
**Plano mínimo:** Pro

Entregáveis:
- Modelos de atribuição: last-click, linear, time-decay, data-driven
- Dashboard multi-touch: qual canal influenciou cada conversão
- **Spend Tracking v3:** take rate calculado por conversão atribuída (não só por spend bruto)
- Relatório executivo exportável (PDF/XLSX) — add-on R$500/relatório
- Alertas de anomalia de CPA/ROAS (base para M8)

---

### M3 — AI Creative Studio
**Duração estimada:** 5 semanas  
**Receita gerada:** Sistema de créditos IA, diferencial competitivo vs. Smartly/Madgicx  
**Plano mínimo:** Starter (limitado), Pro (completo)

Entregáveis:
- Copy: GPT-4o — headlines, descrições, CTAs por plataforma e objetivo
- Banners: Stability AI — geração a partir de brief ou produto
- Vídeo: Runway + ElevenLabs (locução PT-BR) + Whisper (legendas)
- Creative Score 0-100 com checagem automática de política Meta/Google
- DCO (Dynamic Creative Optimization): variações automáticas por segmento
- Integração TikTok Ads API para publicação direta de vídeos

---

### M6 — Landing Page Builder
**Duração estimada:** 4 semanas  
**Receita gerada:** Incluído no Pro+, elimina necessidade de Unbounce/Webflow  
**Plano mínimo:** Pro

Entregáveis:
- Editor drag-and-drop no-code
- Templates por objetivo (lead, e-commerce, evento, SaaS)
- Integração nativa com pixel AdFlow (tracking automático)
- Thank You Page com upsell configurável
- A/B testing nativo de landing pages
- Performance conectada ao dashboard de campanhas (CTR ↔ CVR)

---

### M8 — Automation & Alerts
**Duração estimada:** 3 semanas  
**Receita gerada:** Reduz churn (stickiness), base do Managed tier  
**Plano mínimo:** Pro

Entregáveis:
- Funil builder visual (e-mail + SMS + WhatsApp Business API)
- Alertas configuráveis de spend (80% de budget, anomalia, campanha parada)
- Regras de automação: "se CPA > X, pausar ad set"
- Integração WhatsApp Business API para notificações em tempo real
- **Spend Tracking v4:** alertas automáticos de take rate tier (cliente próximo do próximo nível)

---

### M7 — Programmatic DSP/SSP
**Duração estimada:** 8 semanas  
**Receita gerada:** Take rate programático (10–18%), SSP fee (15–20%), PMP fee (8%) — maior margem da plataforma  
**Plano mínimo:** Agency

Entregáveis:
- DSP: integração OpenRTB 2.6, bidding engine em Go
- SSP: onboarding de publishers, header bidding (Prebid.js)
- Inventory: integração VIOOH/We OOH (DOOH Brasil, 1.3B impressões/mês)
- CTV: inventory aberto via Magnite/PubMatic (inicialmente como comprador)
- Private Marketplace: criação e gestão de deals
- DMP: segmentos de audiência baseados em dados do pixel
- **Spend Tracking v5:** RTB spend em real-time via streaming ClickHouse
- UID2 / cookieless identity para targeting pós-cookie

---

### M9 — White-label & SuperAdmin
**Duração estimada:** 4 semanas  
**Receita gerada:** R$500/mês/agência white-label + programa de parceiros  
**Plano mínimo:** Agency

Entregáveis:
- White-label completo: domínio próprio, logo, cores, e-mails
- SuperAdmin panel: gestão de tenants, planos, uso de API, saúde da plataforma
- Programa de parceiros: dashboard de comissões, links de referral rastreáveis
- API pública documentada (rate limits por plano)
- Billing transparente para agências: repasse automático de take rate ao cliente final

---

### M11 — AI Traffic Manager (Campaign Diagnostics)
**Duração estimada:** 5 semanas  
**Receita gerada:** Diferencial premium Managed tier  
**Plano mínimo:** Agency/Managed

Entregáveis:
- Score de saúde da campanha em tempo real
- Diagnóstico automático: "seu CPM subiu 40% porque o leilão do seu público está saturado"
- Recomendações priorizadas por impacto estimado em ROAS
- Auto-apply de otimizações com aprovação do gestor
- Benchmark vs. outras campanhas no mesmo vertical (dados anonimizados do DMP)

---

## 6. Projeções de Receita

### Cenário Base (18 meses após lançamento M1)

Premissas: 3% de conversão de trial, churn mensal de 4%, take rate médio efetivo de 4%.

| Mês | Clientes Ativos | MRR (Subs) | Take Rate (est.) | Receita Total |
|-----|----------------|------------|-----------------|--------------|
| M3  | 15             | R$ 15k     | R$ 8k           | R$ 23k       |
| M6  | 45             | R$ 58k     | R$ 35k          | R$ 93k       |
| M9  | 90             | R$ 135k    | R$ 90k          | R$ 225k      |
| M12 | 160            | R$ 280k    | R$ 200k         | R$ 480k      |
| M18 | 280            | R$ 560k    | R$ 450k         | R$ 1.01M     |

> Com ativação do DSP/SSP (M7) no M9, o take rate programático pode adicionar R$50–200k/mês ao cenário acima, dependendo do volume de inventory.

### Unit Economics Target

| Métrica | Target |
|---------|--------|
| LTV (Agency) | R$ 85.000 |
| CAC | < R$ 3.500 |
| LTV/CAC | > 24x |
| Payback period | < 6 meses |
| Margem bruta | > 75% |

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Meta/Google bloqueiam acesso à API | Baixa | Alto | Manter tokens de acesso via System Users, diversificar para TikTok/LinkedIn desde o início |
| LGPD — multa por uso indevido de dados | Média | Alto | DPO (Data Protection Officer) desde o M1, dados em sa-east-1, consentimento auditável |
| Concorrente global lança produto similar para BR | Média | Médio | Velocidade de execução + relacionamento com parceiros Google/Meta no Brasil |
| Churn alto por pricing de take rate | Média | Médio | Transparência radical no billing dashboard, alertas de custo antes de atingir tier |
| Inadimplência de take rate | Alta | Médio | Pre-autorização no Stripe, bloqueio de contas se invoice não paga em 7 dias |
| Fraude em inventory programático | Média | Alto | IVT (Invalid Traffic) detection via ClickHouse, integração HUMAN Security/DoubleVerify |

---

*Documento gerado em Junho/2026. Revisão recomendada a cada milestone concluído.*
