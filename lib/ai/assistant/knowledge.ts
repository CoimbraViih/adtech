export function getKnowledgeContext(): string {
  return `
# AdFlow — Base de Conhecimento

## Campanhas
- Campanhas são organizadas por workspace. Cada campanha tem plataforma (Meta, Google, TikTok, LinkedIn), status (active/paused/draft), orçamento diário e período.
- Métricas disponíveis: impressões, cliques, conversões, gasto, CTR, CPA, ROAS.
- Para criar uma campanha: Campanhas → Nova Campanha.

## Criativos
- Criativos são gerados por IA (copy + banner). Cada criativo tem headline, description, CTA e quality score (0-100).
- Para gerar criativos: Criativos → Novo Criativo → preencher briefing.

## Pixel & Rastreamento
- O pixel AdFlow é um script JS instalado no site. Captura page_view, add_to_cart, purchase, lead.
- Para instalar: Pixel → Copiar código → colar antes de </head>.
- Conversões do pixel aparecem em Analytics → Eventos.

## Analytics & Atribuição
- Multi-touch attribution: first-touch, last-touch, linear.
- Reconciliação: Analytics → Reconciliação — mostra divergência pixel × plataforma por campanha.

## Automação
- Alertas automáticos e otimização preditiva em Automação → Otimização Preditiva.
- Ações: pausar campanha, aumentar/diminuir orçamento (requer confirmação).

## Landing Pages
- Builder no-code em Landing Pages. Suporta blocos de texto, imagem, formulário e CTA.

## Integrações
- Meta, Google Ads, TikTok, LinkedIn: conecte em Configurações → Integrações via OAuth.
- E-commerce: Nuvemshop, VTEX, Shopify — sincroniza produtos e conversões.

## Billing
- Planos: Free / Pro / Agency. Gerencie em Configurações → Billing.

## Métricas — Definições
- CTR (Click-Through Rate): cliques / impressões × 100
- CPA (Custo por Aquisição): gasto / conversões
- ROAS (Return on Ad Spend): receita / gasto
- CPM (Custo por Mil Impressões): gasto / impressões × 1000
`.trim();
}
