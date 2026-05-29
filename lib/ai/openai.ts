import type { CopyVariation, ScoreBreakdown, PolicyItem } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const OPENAI_API_URL = "https://api.openai.com/v1";

async function getApiKey(organizationId: string): Promise<string> {
  const key = await getCredentialField(organizationId, "openai", "api_key", "OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY não configurada. Configure em Settings → Integrações.");
  return key;
}

async function chatCompletion(
  apiKey: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { model?: string; temperature?: number; maxRetries?: number } = {}
): Promise<string> {
  const { model = "gpt-4o", temperature = 0.7, maxRetries = 2 } = opts;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, temperature, messages }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI ${res.status}: ${err}`);
      }

      const data = await res.json();
      return data.choices[0].message.content as string;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

// ── Copy generation ───────────────────────────────────────────────────────────

export async function generateCopyVariations(
  organizationId: string,
  briefing: string,
  count: number = 4
): Promise<CopyVariation[]> {
  const key = await getApiKey(organizationId);

  const system = `Você é um especialista em copywriting para anúncios digitais (Meta Ads e Google Ads).
Gere exatamente ${count} variações de copy para anúncio com base no briefing do usuário.
Responda APENAS com um JSON array válido, sem markdown, nenhum texto extra.
Formato: [{"headline":"...","description":"...","cta":"..."}]
Regras:
- headline: máximo 40 caracteres, impactante
- description: 60-150 caracteres, benefício claro
- cta: 2-4 palavras, verbo no imperativo`;

  const raw = await chatCompletion(key, [
    { role: "system", content: system },
    { role: "user", content: briefing },
  ]);

  try {
    const parsed = JSON.parse(raw.trim());
    return Array.isArray(parsed) ? parsed.slice(0, count) : [];
  } catch {
    throw new Error("Resposta da IA em formato inválido.");
  }
}

// ── Quality score ─────────────────────────────────────────────────────────────

export async function scoreCreative(
  organizationId: string,
  creative: {
    type: string;
    headline?: string | null;
    description?: string | null;
    cta?: string | null;
    prompt?: string | null;
  }
): Promise<{ score: number; breakdown: ScoreBreakdown }> {
  const key = await getApiKey(organizationId);

  const content = [
    creative.headline && `Headline: ${creative.headline}`,
    creative.description && `Descrição: ${creative.description}`,
    creative.cta && `CTA: ${creative.cta}`,
    creative.prompt && `Prompt: ${creative.prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `Você é um avaliador de criativos publicitários.
Avalie o criativo fornecido em 5 critérios, cada um de 0 a 20 (total máximo 100).
Responda APENAS com JSON válido, sem markdown.
Formato: {"clarity":N,"urgency":N,"cta_strength":N,"compliance":N,"relevance":N}
Critérios:
- clarity (0-20): quão claro e compreensível é o criativo
- urgency (0-20): sensação de urgência ou escassez
- cta_strength (0-20): força e clareza do call-to-action
- compliance (0-20): probabilidade de passar pelas políticas Meta/Google
- relevance (0-20): relevância percebida para o público-alvo`;

  const raw = await chatCompletion(key, [
    { role: "system", content: system },
    { role: "user", content: content },
  ], { temperature: 0.3 });

  try {
    const breakdown: ScoreBreakdown = JSON.parse(raw.trim());
    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { score: Math.min(100, Math.max(0, score)), breakdown };
  } catch {
    throw new Error("Resposta de score em formato inválido.");
  }
}

// ── Policy check ──────────────────────────────────────────────────────────────

export async function checkPolicy(
  organizationId: string,
  creative: {
    type: string;
    headline?: string | null;
    description?: string | null;
    cta?: string | null;
  }
): Promise<{ items: PolicyItem[]; passed: boolean }> {
  const key = await getApiKey(organizationId);

  const content = [
    creative.headline && `Headline: ${creative.headline}`,
    creative.description && `Descrição: ${creative.description}`,
    creative.cta && `CTA: ${creative.cta}`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `Você é um especialista em políticas de anúncios (Meta Ads e Google Ads).
Verifique o criativo em relação às seguintes regras e retorne um array JSON com o resultado de cada uma.
Responda APENAS com JSON válido, sem markdown.
Formato: [{"rule":"...","passed":true|false,"detail":"mensagem de correção ou null"}]
Regras a verificar:
1. Sem afirmações enganosas ou não comprováveis
2. CTA claro e direto
3. Sem linguagem proibida Meta (discriminação, conteúdo adulto, drogas)
4. Headline dentro de 30 caracteres para Google Ads (se aplicável)
5. Sem pressão excessiva ou linguagem de personalização proibida`;

  const raw = await chatCompletion(key, [
    { role: "system", content: system },
    { role: "user", content: content },
  ], { temperature: 0.2 });

  try {
    const items: PolicyItem[] = JSON.parse(raw.trim());
    const passed = items.every((i) => i.passed);
    return { items, passed };
  } catch {
    throw new Error("Resposta de política em formato inválido.");
  }
}
