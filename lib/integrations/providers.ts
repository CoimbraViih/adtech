import type { ProviderDef, ProviderCategory, TestResult } from "@/lib/integrations/types";

async function fetchSafe(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    const body = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: (err as Error).message };
  }
}

const PROVIDERS_LIST: ProviderDef[] = [
  {
    key: "meta",
    label: "Meta Ads",
    description: "Gerencie campanhas e sincronize métricas do Meta Ads Manager.",
    category: "ads",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxxx...", secret: true,
        helpText: "Meta Business Suite → Configurações → Acesso à API → Gerar token" },
      { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_123456789", secret: false },
    ],
    async testConnection(creds) {
      const r = await fetchSafe(
        `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${creds.access_token}`
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao Meta Ads." };
      return { ok: false, message: `Token inválido ou expirado. (HTTP ${r.status})` };
    },
  },
  {
    key: "google",
    label: "Google Ads",
    description: "Gerencie campanhas e acesse relatórios do Google Ads via API.",
    category: "ads",
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
    fields: [
      { key: "developer_token", label: "Developer Token", placeholder: "ABcDeFgHiJkL...", secret: true,
        helpText: "Google Ads → Ferramentas → API Center → Developer Token" },
      { key: "client_id", label: "OAuth2 Client ID", placeholder: "xxxxx.apps.googleusercontent.com", secret: false },
      { key: "client_secret", label: "OAuth2 Client Secret", placeholder: "GOCSPX-...", secret: true },
      { key: "refresh_token", label: "Refresh Token", placeholder: "1//0g...", secret: true,
        helpText: "Gerado via OAuth2 consent flow" },
      { key: "customer_id", label: "Customer ID", placeholder: "1234567890", secret: false,
        helpText: "Sem traços — apenas números" },
    ],
    async testConnection(creds) {
      const tokenRes = await fetchSafe("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          refresh_token: creds.refresh_token,
          grant_type: "refresh_token",
        }).toString(),
      });
      if (!tokenRes.ok) return { ok: false, message: `OAuth2 falhou. Verifique Client ID, Secret e Refresh Token. (HTTP ${tokenRes.status})` };
      const { access_token } = JSON.parse(tokenRes.body) as { access_token?: string };
      if (!access_token) return { ok: false, message: "Não foi possível obter access_token do Google." };
      const r = await fetchSafe(
        `https://googleads.googleapis.com/v24/customers/${creds.customer_id}/googleAds:search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "developer-token": creds.developer_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
        }
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao Google Ads." };
      return { ok: false, message: `Google Ads retornou erro. (HTTP ${r.status})` };
    },
  },
  {
    key: "tiktok",
    label: "TikTok Ads",
    description: "Gerencie campanhas TikTok e sincronize performance.",
    category: "ads",
    docsUrl: "https://ads.tiktok.com/marketing_api/docs",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", secret: true,
        helpText: "TikTok Ads Manager → Ativo → Aplicativo → Access Token" },
      { key: "advertiser_id", label: "Advertiser ID", placeholder: "7123456789012345678", secret: false },
    ],
    async testConnection(creds) {
      const r = await fetchSafe(
        `https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/?app_id=&secret=`,
        { headers: { "Access-Token": creds.access_token } }
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao TikTok Ads." };
      return { ok: false, message: `Token inválido. (HTTP ${r.status})` };
    },
  },
  {
    key: "linkedin",
    label: "LinkedIn Ads",
    description: "Gerencie campanhas B2B e acesse analytics do LinkedIn.",
    category: "ads",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "AQXxxxxxxxx...", secret: true,
        helpText: "LinkedIn Developer Portal → OAuth2 → gerar token com escopo r_ads,rw_ads" },
      { key: "account_id", label: "Account ID (URN)", placeholder: "123456789", secret: false },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.linkedin.com/rest/adAccounts?q=search&search.status.values[0]=ACTIVE", {
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "LinkedIn-Version": "202506",
        },
      });
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao LinkedIn Ads." };
      return { ok: false, message: `Token inválido. (HTTP ${r.status})` };
    },
  },
  {
    key: "openai",
    label: "OpenAI",
    description: "GPT-4o para geração de copy, scoring e verificação de política.",
    category: "ai",
    docsUrl: "https://platform.openai.com/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-proj-...", secret: true,
        helpText: "platform.openai.com → API Keys → Create new secret key" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${creds.api_key}` },
      });
      if (r.ok) return { ok: true, message: "API Key válida — OpenAI conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "anthropic",
    label: "Anthropic",
    description: "Claude para análise avançada e insights de campanha.",
    category: "ai",
    docsUrl: "https://console.anthropic.com/settings/keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-ant-...", secret: true,
        helpText: "console.anthropic.com → API Keys" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": creds.api_key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (r.ok) return { ok: true, message: "API Key válida — Anthropic conectado." };
      if (r.status === 529) return { ok: false, message: "Anthropic está sobrecarregado. Tente novamente em instantes." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "stability",
    label: "Stability AI",
    description: "Geração de banners e imagens para criativos.",
    category: "ai",
    docsUrl: "https://platform.stability.ai/account/keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-...", secret: true,
        helpText: "platform.stability.ai → Account → API Keys" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.stability.ai/v1/user/account", {
        headers: { Authorization: `Bearer ${creds.api_key}` },
      });
      if (r.ok) return { ok: true, message: "API Key válida — Stability AI conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "runway",
    label: "Runway ML",
    description: "Geração de vídeos para criativos dinâmicos.",
    category: "ai",
    docsUrl: "https://docs.runwayml.com",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "key_...", secret: true,
        helpText: "app.runwayml.com → Account → API → Generate API Key" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.runwayml.com/v1/tasks", {
        headers: { Authorization: `Bearer ${creds.api_key}`, "X-Runway-Version": "2024-11-06" },
      });
      if (r.ok) return { ok: true, message: "API Key válida — Runway conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    description: "Voice-over automático para vídeos de campanha.",
    category: "ai",
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk_...", secret: true,
        helpText: "elevenlabs.io → Profile → API Keys" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": creds.api_key },
      });
      if (r.ok) return { ok: true, message: "API Key válida — ElevenLabs conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "resend",
    label: "Resend",
    description: "E-mails transacionais e alertas de automação.",
    category: "communication",
    docsUrl: "https://resend.com/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_...", secret: true,
        helpText: "resend.com → API Keys → Create API Key" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${creds.api_key}` },
      });
      if (r.ok) return { ok: true, message: "API Key válida — Resend conectado." };
      return { ok: false, message: `API Key inválida. (HTTP ${r.status})` };
    },
  },
  {
    key: "whatsapp",
    label: "WhatsApp Business",
    description: "Automação de mensagens via WhatsApp Business API.",
    category: "communication",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: [
      { key: "token", label: "Access Token", placeholder: "EAAxxxxxxxx...", secret: true,
        helpText: "Meta for Developers → WhatsApp → Configuration → Access Token" },
      { key: "phone_id", label: "Phone Number ID", placeholder: "123456789012345", secret: false,
        helpText: "Meta for Developers → WhatsApp → Getting Started → Phone Number ID" },
    ],
    async testConnection(creds) {
      const r = await fetchSafe(
        `https://graph.facebook.com/v25.0/${creds.phone_id}?access_token=${creds.token}`
      );
      if (r.ok) return { ok: true, message: "Conectado com sucesso ao WhatsApp Business." };
      return { ok: false, message: `Credenciais inválidas. (HTTP ${r.status})` };
    },
  },
  {
    key: "rtb",
    label: "RTB / SSP",
    description: "Token de autenticação para parceiros SSP no endpoint de bid.",
    category: "programmatic",
    docsUrl: "",
    fields: [
      { key: "ssp_token", label: "SSP Bearer Token", placeholder: "Qualquer string secreta longa", secret: true,
        helpText: "Compartilhe este token com o SSP parceiro para autenticar requests ao endpoint /api/rtb/bid" },
    ],
    async testConnection(creds): Promise<TestResult> {
      if (!creds.ssp_token || creds.ssp_token.trim().length === 0) {
        return { ok: false, message: "Token não pode ser vazio." };
      }
      return { ok: true, message: "Token configurado. Compartilhe-o com o SSP parceiro." };
    },
  },
];

export const PROVIDERS: Record<string, ProviderDef> = Object.fromEntries(
  PROVIDERS_LIST.map((p) => [p.key, p])
);

export type CategoryMeta = { key: ProviderCategory; label: string };

export const PROVIDER_CATEGORIES: CategoryMeta[] = [
  { key: "ads",           label: "Anúncios" },
  { key: "ai",            label: "IA / Criativos" },
  { key: "communication", label: "Comunicação" },
  { key: "programmatic",  label: "Programático" },
];
