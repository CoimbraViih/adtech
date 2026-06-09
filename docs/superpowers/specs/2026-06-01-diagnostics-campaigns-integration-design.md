# Design: Integração Diagnósticos ↔ Campanhas

**Data:** 2026-06-01  
**Branch:** feat/integrations-api-keys  
**Contexto:** M11 AI Traffic Manager já implementado com rota `/analytics/diagnostics`. Esta spec integra os diagnósticos diretamente na página de detalhe de cada campanha e adiciona um widget de alertas no dashboard.

---

## Objetivo

1. Mostrar os diagnósticos abertos de uma campanha dentro do próprio detalhe (`/campaigns/[id]`).
2. Surfaçar no dashboard as campanhas que têm diagnósticos críticos/warnings, com ícone de atenção e resumo do pior diagnóstico.

---

## Peças de trabalho

### 1. Seção de Diagnósticos no Detalhe da Campanha

**Arquivo a modificar:** `app/(dashboard)/campaigns/[id]/page.tsx`

Após a seção "Conjuntos de anúncios", adicionar um bloco "Diagnósticos" com:

- Busca de `ai_diagnostics` filtrada por `campaign_id = id` e `status = 'open'`, ordenada por severidade (`critical` → `warning` → `info`).
- Se há ≥ 2 diagnósticos: renderiza `SeveritySummary`.
- Lista de `DiagnosticCard` para cada diagnóstico.
- Botão `RunDiagnosticsButton` com `campaignId` prop para rodar diagnóstico apenas desta campanha.
- Estado vazio: mensagem "Nenhum problema detectado" + botão de rodar.
- Layout: `rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4` (padrão do projeto).
- Sessão/workspace: `getSessionFromCookies` (padrão do projeto).

**Componentes reutilizados (sem modificação):**
- `components/diagnostics/diagnostic-card.tsx`
- `components/diagnostics/severity-summary.tsx`
- `components/diagnostics/run-diagnostics-button.tsx`

**Prop nova em `RunDiagnosticsButton`:** aceitar `campaignId?: string` opcional e passá-lo no body do POST para `/api/ai/diagnostics/run`.

---

### 2. Widget "Campanhas em Alerta" no Dashboard

**Novo arquivo:** `components/dashboard/campaign-alerts-widget.tsx`

Componente Server Component que recebe `alerts: CampaignAlert[]`:

```typescript
type CampaignAlert = {
  campaignId: string;
  campaignName: string;
  platform: string;
  worstSeverity: "critical" | "warning";
  worstTitle: string;
  openCount: number;
};
```

Renderização por item:
- Ícone de severidade: `AlertTriangle` vermelho para `critical`, amarelo para `warning`.
- Nome da campanha (link para `/campaigns/[id]`).
- Título do pior diagnóstico em `text-[color:var(--adflow-fg-muted)]`.
- Badge com contagem de diagnósticos abertos.

Máximo de 5 itens. Se `alerts.length === 0`: não renderiza nada (retorna `null`).

**Arquivo a modificar:** `app/(dashboard)/dashboard/page.tsx`

- Adicionar chamada a `getCampaignAlerts()` (mock com `TODO(M2-backend)` comment).
- Renderizar `CampaignAlertsWidget` entre o Hub row e `TopCampaignsTable`, somente se `alerts.length > 0`.

**Arquivo a modificar:** `lib/dashboard/mock-data.ts` — adicionar função `getCampaignAlerts()` que retorna mock baseado em `MOCK_CAMPAIGNS` com diagnósticos simulados para 1-2 campanhas.

---

## Fluxo de dados

```
Dashboard page (server)
  └── getCampaignAlerts() [mock → Supabase join]
        └── CampaignAlertsWidget (server, condicional)

Campaign detail page (server)
  ├── getSessionFromCookies()
  ├── supabase.ai_diagnostics.select where campaign_id = id AND status = 'open'
  ├── SeveritySummary (client, condicional)
  ├── DiagnosticCard[] (client)
  └── RunDiagnosticsButton (client, com campaignId)
```

---

## Componentes a criar / modificar

| Ação | Arquivo |
|------|---------|
| Modificar | `app/(dashboard)/campaigns/[id]/page.tsx` |
| Modificar | `components/diagnostics/run-diagnostics-button.tsx` |
| Modificar | `app/(dashboard)/dashboard/page.tsx` |
| Modificar | `lib/dashboard/mock-data.ts` |
| Criar | `components/dashboard/campaign-alerts-widget.tsx` |

---

## Invariantes

- Design tokens: todos os componentes usam variáveis CSS `--adflow-*` do projeto.
- Sem nova navegação: a rota `/analytics/diagnostics` continua existindo — não é removida.
- RBAC: nenhuma mudança nas políticas — o detalhe da campanha já exige sessão válida.
- Mock-first: dados de diagnóstico no dashboard usam mock com comentário `TODO(M2-backend)`.
- `RunDiagnosticsButton.campaignId` é opcional — continua funcionando na página `/analytics/diagnostics` sem prop.
