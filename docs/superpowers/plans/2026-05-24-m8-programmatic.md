# M8 — Programático DSP/SSP — Plano de Implementação

**Branch:** `feat/m8-programmatic`  
**Objetivo:** Compra programática de mídia via OpenRTB 2.6 (Opção B: protocolo real + SSP mock interno). DMP com segmentação comportamental baseada em pixel_events (M4). Dashboard de performance RTB. Interface totalmente funcional com dados mock; backend stubado com TODO(M8-backend) para swap-in Supabase.

---

## Contexto de Arquitetura

```
SSP Mock (lib/rtb/mock-ssp.ts)
      │
      │  POST /api/rtb/bid  (OpenRTB 2.6 BidRequest)
      ▼
  Bid Endpoint  ──→  lib/rtb/bidder.ts  ──→  lib/rtb/dmp.ts
                         │                        │
                    CPM floor                Segmento do usuário
                    Pacing check             via pixel_events (M4)
                    Freq cap check
                         │
                    BidResponse (OpenRTB 2.6)
                         │
                    bid_requests_log  (Postgres/mock)
```

**Padrões do projeto a seguir:**
- Server Components por padrão; `'use client'` só para interatividade
- Mock data com `TODO(M8-backend)` em todos os pontos de swap-in
- Zod em todo boundary (API routes)
- Recharts para charts, shadcn/ui para primitivos
- Dark mode only, tokens CSS do design system
- `types/database.ts` para todos os tipos DB
- Migration numerada sequencialmente (próxima: `009_programmatic.sql`)

---

## Tarefas

### Tarefa 1 — Foundation: Migration + Types + Mock Data

**Arquivos a criar/modificar:**

#### `supabase/migrations/009_programmatic.sql`
```sql
-- ENUMs
CREATE TYPE deal_type AS ENUM ('open', 'private', 'preferred', 'guaranteed');
CREATE TYPE bid_outcome AS ENUM ('win', 'loss', 'no_bid', 'error');
CREATE TYPE audience_type AS ENUM ('behavioral', 'lookalike', 'custom');

-- RTB Campaigns
CREATE TABLE rtb_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft', 'archived')),
  deal_type deal_type NOT NULL DEFAULT 'open',
  deal_id TEXT,
  floor_cpm NUMERIC(10,4) NOT NULL DEFAULT 0,
  max_cpm NUMERIC(10,4) NOT NULL,
  daily_budget NUMERIC(10,2) NOT NULL,
  total_budget NUMERIC(10,2),
  pacing TEXT NOT NULL DEFAULT 'even' CHECK (pacing IN ('even', 'asap')),
  frequency_cap INTEGER DEFAULT 3,
  frequency_cap_hours INTEGER DEFAULT 24,
  creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
  audience_id UUID,
  targeting JSONB NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE,
  -- denormalized metrics
  impressions INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,4),
  avg_cpm NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bid Requests Log
CREATE TABLE bid_requests_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rtb_campaign_id UUID REFERENCES rtb_campaigns(id) ON DELETE SET NULL,
  ssp_id TEXT NOT NULL,
  auction_id TEXT NOT NULL,
  user_id_hash TEXT,
  domain TEXT,
  floor_cpm NUMERIC(10,4),
  bid_cpm NUMERIC(10,4),
  outcome bid_outcome NOT NULL,
  response_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audiences (DMP)
CREATE TABLE audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type audience_type NOT NULL DEFAULT 'behavioral',
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  lookalike_source_id UUID,
  size_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audience Segments (matches: user_id_hash → audience)
CREATE TABLE audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  user_id_hash TEXT NOT NULL,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(audience_id, user_id_hash)
);

-- Triggers
CREATE TRIGGER set_updated_at_rtb_campaigns
  BEFORE UPDATE ON rtb_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_audiences
  BEFORE UPDATE ON audiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_rtb_campaigns_workspace ON rtb_campaigns(workspace_id);
CREATE INDEX idx_rtb_campaigns_status ON rtb_campaigns(status);
CREATE INDEX idx_bid_requests_log_workspace ON bid_requests_log(workspace_id);
CREATE INDEX idx_bid_requests_log_campaign ON bid_requests_log(rtb_campaign_id);
CREATE INDEX idx_bid_requests_log_created ON bid_requests_log(created_at DESC);
CREATE INDEX idx_audiences_workspace ON audiences(workspace_id);
CREATE INDEX idx_audience_segments_audience ON audience_segments(audience_id);
CREATE INDEX idx_audience_segments_user ON audience_segments(user_id_hash);

-- RLS
ALTER TABLE rtb_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_requests_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage rtb campaigns"
  ON rtb_campaigns FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members can read bid logs"
  ON bid_requests_log FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service role can insert bid logs"
  ON bid_requests_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "workspace members can manage audiences"
  ON audiences FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members can read segments"
  ON audience_segments FOR SELECT
  USING (audience_id IN (
    SELECT id FROM audiences WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
```

#### `types/database.ts` — adicionar ao final do arquivo:
```typescript
// ─── M8: Programático DSP/SSP ────────────────────────────────────────────────

export type DealType = 'open' | 'private' | 'preferred' | 'guaranteed';
export type BidOutcome = 'win' | 'loss' | 'no_bid' | 'error';
export type AudienceType = 'behavioral' | 'lookalike' | 'custom';
export type RtbCampaignStatus = 'active' | 'paused' | 'draft' | 'archived';
export type PacingType = 'even' | 'asap';

export type RtbCampaign = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  name: string;
  status: RtbCampaignStatus;
  deal_type: DealType;
  deal_id: string | null;
  floor_cpm: number;
  max_cpm: number;
  daily_budget: number;
  total_budget: number | null;
  pacing: PacingType;
  frequency_cap: number;
  frequency_cap_hours: number;
  creative_id: string | null;
  audience_id: string | null;
  targeting: Record<string, unknown>;
  start_date: string;
  end_date: string | null;
  // denormalized metrics
  impressions: number;
  wins: number;
  spend: number;
  win_rate: number | null;
  avg_cpm: number | null;
  created_at: string;
  updated_at: string;
};

export type RtbCampaignCreateInput = {
  name: string;
  deal_type: DealType;
  deal_id?: string | null;
  floor_cpm: number;
  max_cpm: number;
  daily_budget: number;
  total_budget?: number | null;
  pacing: PacingType;
  frequency_cap: number;
  frequency_cap_hours: number;
  creative_id?: string | null;
  audience_id?: string | null;
  targeting?: Record<string, unknown>;
  start_date: string;
  end_date?: string | null;
};

export type BidRequestLog = {
  id: string;
  workspace_id: string;
  rtb_campaign_id: string | null;
  ssp_id: string;
  auction_id: string;
  user_id_hash: string | null;
  domain: string | null;
  floor_cpm: number | null;
  bid_cpm: number | null;
  outcome: BidOutcome;
  response_ms: number | null;
  created_at: string;
};

export type AudienceRule = {
  event_type: string;
  operator: 'eq' | 'gte' | 'lte' | 'contains';
  value: string | number;
  lookback_days: number;
};

export type Audience = {
  id: string;
  workspace_id: string;
  name: string;
  type: AudienceType;
  description: string | null;
  rules: AudienceRule[];
  lookalike_source_id: string | null;
  size_estimate: number;
  created_at: string;
  updated_at: string;
};

export type AudienceCreateInput = {
  name: string;
  type: AudienceType;
  description?: string | null;
  rules: AudienceRule[];
  lookalike_source_id?: string | null;
};

// OpenRTB 2.6 types (subset used by AdFlow)
export type OpenRtbImp = {
  id: string;
  banner?: { w: number; h: number; format?: Array<{ w: number; h: number }> };
  bidfloor?: number;
  bidfloorcur?: string;
};

export type OpenRtbBidRequest = {
  id: string;
  imp: OpenRtbImp[];
  site?: { domain: string; page: string };
  app?: { bundle: string; name: string };
  user?: { id: string };
  device?: { ua: string; ip: string; language: string };
  at: 1 | 2; // 1=first-price, 2=second-price
  tmax?: number;
  wseat?: string[];
};

export type OpenRtbBid = {
  id: string;
  impid: string;
  price: number;
  adid?: string;
  adm?: string;
  adomain?: string[];
  crid?: string;
  w?: number;
  h?: number;
};

export type OpenRtbSeatBid = {
  bid: OpenRtbBid[];
  seat?: string;
};

export type OpenRtbBidResponse = {
  id: string;
  seatbid?: OpenRtbSeatBid[];
  bidid?: string;
  cur?: string;
  nbr?: number; // no-bid reason code
};
```

#### `lib/rtb/mock-data.ts`
Dados mock seguindo o padrão de `lib/campaigns/mock-data.ts` e `lib/dashboard/mock-data.ts`. Deve exportar:
- `MOCK_RTB_CAMPAIGNS: RtbCampaign[]` — 4 campanhas RTB com status variados
- `MOCK_AUDIENCES: Audience[]` — 5 audiências (2 behavioral, 1 lookalike, 2 custom)
- `MOCK_BID_LOG: BidRequestLog[]` — 30 entradas de log (mix de win/loss/no_bid)
- `getMockRtbKpis(workspaceId: string)` — retorna `{ totalBids, wins, winRate, avgCpm, totalSpend, impressions }`
- `getMockBidLandscape(campaignId: string)` — retorna array `{ cpm: number; count: number }[]` (histograma para chart)
- `getMockWinRateTimeSeries(campaignId: string)` — retorna array `{ date: string; winRate: number; bids: number }[]` (30 dias)

---

### Tarefa 2 — RTB Library: bidder + DMP + mock SSP

**Arquivos a criar:**

#### `lib/rtb/bidder.ts`
Funções puras — sem dependências de banco (testáveis isoladamente).

```typescript
// Exports:
export function checkPacing(campaign: RtbCampaign, todaySpend: number): boolean
// retorna true se ainda há budget disponível (todaySpend < daily_budget)

export function checkFrequencyCap(campaign: RtbCampaign, impressionCount: number): boolean
// retorna true se impressionCount < frequency_cap

export function calculateCpm(campaign: RtbCampaign, floorCpm: number): number | null
// retorna CPM de bid (max_cpm se max_cpm > floor, senão null = no-bid)
// lógica simples MVP: bid = max_cpm se elegível

export function selectBid(
  campaigns: RtbCampaign[],
  request: OpenRtbBidRequest,
  context: { todaySpend: Map<string, number>; impressionCounts: Map<string, number> }
): { campaign: RtbCampaign; cpm: number } | null
// filtra campanhas ativas, verifica pacing + freq cap + floor, retorna melhor bid (maior CPM)
```

#### `lib/rtb/dmp.ts`
Match de usuário com segmentos. Stub com TODO(M8-backend) para queries reais em pixel_events.

```typescript
export async function matchUserToSegments(
  userIdHash: string,
  workspaceId: string
): Promise<string[]>
// TODO(M8-backend): query audience_segments JOIN audiences WHERE workspace_id = workspaceId AND user_id_hash = userIdHash
// Mock: retorna audiência aleatória da lista mock para demonstração

export async function evaluateAudienceRules(
  audienceId: string,
  workspaceId: string
): Promise<number>
// TODO(M8-backend): conta pixel_events matching rules para estimar tamanho do segmento
// Mock: retorna number aleatório entre 1000-50000
```

#### `lib/rtb/mock-ssp.ts`
Gerador de BidRequests para demo/testes. Exporta:
```typescript
export function generateBidRequest(opts?: {
  domain?: string;
  userId?: string;
  floorCpm?: number;
}): OpenRtbBidRequest
// Gera um BidRequest OpenRTB 2.6 válido com valores plausíveis
```

---

### Tarefa 3 — API Routes

**Arquivos a criar:**

#### `app/api/rtb/bid/route.ts`
Endpoint público OpenRTB 2.6. Autenticado via `Authorization: Bearer $RTB_SSP_TOKEN`.

- `OPTIONS` — CORS preflight
- `POST` — recebe `OpenRtbBidRequest`, valida com Zod, chama `selectBid` + `matchUserToSegments`, retorna `OpenRtbBidResponse` ou 204 (no-bid)
- Log do resultado em `bid_requests_log` (TODO(M8-backend) para Supabase, por ora usa mock)
- Timeout: resposta em <100ms (tmax do request)
- Headers de resposta: `X-Response-Time`, `Content-Type: application/json`

#### `app/api/rtb/campaigns/route.ts`
- `GET` — lista campanhas RTB do workspace (retorna mock com TODO(M8-backend))
- `POST` — cria campanha RTB (valida com Zod `RtbCampaignCreateInput`, retorna mock criado)

#### `app/api/rtb/campaigns/[id]/route.ts`
- `GET` — detalhe da campanha RTB
- `PATCH` — atualiza status/budget (whitelist de campos)
- `DELETE` — soft delete (status = 'archived'), retorna 204

#### `app/api/audiences/route.ts`
- `GET` — lista audiências do workspace
- `POST` — cria audiência (valida com Zod `AudienceCreateInput`)

#### `app/api/audiences/[id]/route.ts`
- `GET` — detalhe da audiência
- `PATCH` — atualiza campos whitelist
- `DELETE` — retorna 204

Todos os endpoints seguem o padrão de autenticação do projeto: verificam sessão via `requireServerSession` (TODO(M8-backend) para swap-in Supabase).

---

### Tarefa 4 — Dashboard Programático

**Arquivos a criar:**

#### `app/(dashboard)/campaigns/programmatic/page.tsx`
Server Component. Layout idêntico ao padrão das páginas de campanhas/analytics:
- `GlobalDateFilter` no topo (mesmo componente de M5)
- 4 KPI cards: **Total de Bids**, **Win Rate** (%), **CPM Médio** (R$), **Gasto Total** (R$)
- Tabela de campanhas RTB: nome, status badge, deal type, max CPM, daily budget, impressões, win rate, ações (editar/pausar/arquivar)
- Botão "Nova Campanha RTB" → `/campaigns/programmatic/new`
- Link de navegação na sidebar para "Programático" (sub-item de Campanhas)
- Dados via `getMockRtbKpis` e `MOCK_RTB_CAMPAIGNS`

#### `components/campaigns/rtb-performance.tsx`
Client Component (`'use client'`). Dois charts Recharts:
1. **Bid Landscape** — BarChart horizontal: eixo X = range de CPM, eixo Y = volume de bids (histograma). Mostra onde os bids estão concentrados.
2. **Win Rate ao Longo do Tempo** — LineChart dual-axis: win rate (%) e volume de bids por dia (30 dias). Mesmo estilo do `campaign-charts.tsx` (dark tooltip customizado, cores do design system).

Props: `{ campaignId: string }`. Dados via `getMockBidLandscape` e `getMockWinRateTimeSeries`.

#### `app/(dashboard)/campaigns/programmatic/[id]/page.tsx`
Server Component. Detalhe da campanha RTB:
- 5 KPI cards: Impressões, Wins, Win Rate, CPM Médio, Gasto
- `RtbPerformance` chart component
- Tabela de últimos 20 bid requests do log (auction_id, domínio, CPM ofertado, outcome badge, latência ms)
- Seção de configuração: deal type, floor CPM, max CPM, frequency cap, audiência vinculada
- Dados mock com TODO(M8-backend)

---

### Tarefa 5 — Wizard Nova Campanha RTB

#### `app/(dashboard)/campaigns/programmatic/new/page.tsx`
Server Component wrapper. Renderiza `RtbCampaignForm`.

#### `components/campaigns/rtb-campaign-form.tsx`
Client Component (`'use client'`). Wizard 4 passos (mesmo padrão de `campaign-form.tsx`):

**Passo 1 — Configuração de Deal:**
- Nome da campanha (text input)
- Deal Type: radio card selector (Open Auction / Private Marketplace / Preferred Deal / Programmatic Guaranteed) — com ícone e descrição por tipo
- Deal ID (text input, visível apenas para private/preferred/guaranteed)

**Passo 2 — Audiência & Targeting:**
- Seletor de audiência (dropdown com `MOCK_AUDIENCES`)
- Targeting adicional: domínios permitidos (tags input), idioma, device type (checkboxes: desktop/mobile/tablet)

**Passo 3 — Bid & Orçamento:**
- Floor CPM (número, R$)
- Max CPM (número, R$)
- Daily Budget (número, R$)
- Total Budget (número, R$, opcional)
- Pacing: radio (Even / ASAP)
- Frequency Cap: número + horas

**Passo 4 — Revisão:**
- Resumo de todas as configurações em cards de leitura
- Data de início / fim
- Botão "Criar Campanha RTB" → POST `/api/rtb/campaigns`

Validação: React Hook Form + Zod. Erro inline por campo. Loading state no botão de submit.

---

### Tarefa 6 — Audiences / DMP

#### `app/(dashboard)/audiences/page.tsx`
Server Component. Layout:
- Header com título "Audiências" e botão "Nova Audiência"
- 3 KPI cards: **Total de Audiências**, **Tamanho Total Estimado**, **Audiências Ativas** (com segmentos recentes)
- `AudiencesListClient` (Client Component para busca/filtros)

#### `components/audiences/audiences-list-client.tsx`
Client Component. Busca por nome + filtro por tipo (Todos / Behavioral / Lookalike / Custom). Tabela com: nome, tipo badge, tamanho estimado, regras (contagem), data de criação, ações (editar/excluir).

#### `components/audiences/segment-builder.tsx`
Client Component usado no dialog de criação/edição de audiência. Permite adicionar/remover regras de segmentação:
- Cada regra: `event_type` (dropdown: pageview / purchase / lead / add_to_cart / custom), `operator` (select), `value` (text/number), `lookback_days` (número)
- Botão "+ Adicionar Regra"
- Estimativa de tamanho ao vivo (chama `/api/audiences/[id]/estimate` ou mostra valor mockado)
- Preview do segmento: "~X usuários nos últimos 30 dias"

#### `app/(dashboard)/audiences/[id]/page.tsx`
Server Component. Detalhe da audiência:
- KPI cards: tamanho estimado, regras ativas, última atualização
- Lista de regras em cards legíveis
- Campanhas RTB que usam esta audiência
- Botão "Editar Audiência" abre o `SegmentBuilder` em dialog

---

### Tarefa 7 — Testes

#### `tests/unit/rtb-bidder.test.ts`
Testes unitários das funções puras do bidder. Casos:
- `checkPacing`: dentro do budget → true; acima do budget → false
- `checkFrequencyCap`: abaixo do cap → true; acima → false
- `calculateCpm`: max_cpm > floor → retorna max_cpm; max_cpm <= floor → retorna null
- `selectBid`: sem campanhas → null; campanha pausada → null; floor muito alto → null; campanha elegível → retorna bid com CPM correto; múltiplas campanhas elegíveis → retorna a de maior CPM

#### `tests/unit/dmp-match.test.ts`
Testes do DMP (mockando dependências de banco):
- `matchUserToSegments`: retorna array de string IDs; aceita userId vazio; sem audiências → array vazio
- `evaluateAudienceRules`: retorna número >= 0

#### `tests/e2e/programmatic.spec.ts`
Playwright E2E:
- Página `/campaigns/programmatic` carrega com título e KPI cards
- Tabela de campanhas RTB tem linhas
- Botão "Nova Campanha RTB" navega para `/campaigns/programmatic/new`
- Wizard passo 1 mostra deal type selector
- Página `/audiences` carrega com KPI cards e tabela
- Botão "Nova Audiência" abre dialog com segment builder

---

## Sidebar — adicionar link "Programático"

No `components/layout/sidebar.tsx`, adicionar sub-item de navegação "Programático" sob "Campanhas" apontando para `/campaigns/programmatic`. Seguir o padrão visual dos outros itens da sidebar.

---

## Variáveis de Ambiente

Adicionar ao `.env.local.example`:
```bash
# M8: RTB
RTB_SSP_TOKEN=                    # Bearer token para autenticar SSPs no endpoint de bid
```

---

## Ordem de Execução

1. Foundation (migration + types + mock data)
2. RTB Library (bidder + DMP + mock SSP)
3. API Routes
4. Dashboard Programático (página principal + charts + detalhe)
5. Wizard Nova Campanha RTB
6. Audiences / DMP (páginas + segment builder)
7. Testes

Cada tarefa depende das anteriores. Executar sequencialmente.
