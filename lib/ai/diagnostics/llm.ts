import { getCredentialField } from "@/lib/integrations/credentials";
import type { SkillFinding } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1";

async function chatCompletion(
  apiKey: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", temperature: 0.2, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export type NarratedDiagnostic = {
  rationale: string;
  suggested_action: string;
};

export async function narrateDiagnostic(
  organizationId: string,
  campaignName: string,
  finding: SkillFinding,
): Promise<NarratedDiagnostic> {
  const apiKey = await getCredentialField(organizationId, "openai", "api_key", "OPENAI_API_KEY");

  if (!apiKey) {
    return { rationale: finding.evidence, suggested_action: "Revisar métricas da campanha." };
  }

  const system = `Você é um gestor sênior de tráfego pago brasileiro. Analise o problema detectado automaticamente em uma campanha e escreva:
1. "rationale": 2-3 frases explicando POR QUE isso é um problema, em pt-BR, para o gestor entender o impacto.
2. "suggested_action": 1-2 frases com a ação concreta mais importante a tomar AGORA.

REGRA CRÍTICA: Use APENAS os números presentes em "evidence". Não invente métricas.
Responda APENAS com JSON válido, sem markdown.
Formato: {"rationale":"...","suggested_action":"..."}`;

  const user = `Campanha: ${campaignName}\nProblema detectado: ${finding.title}\nEvidência: ${finding.evidence}`;

  try {
    const raw = await chatCompletion(apiKey, [
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed: NarratedDiagnostic = JSON.parse(raw.trim());
    return parsed;
  } catch {
    return { rationale: finding.evidence, suggested_action: "Revisar métricas da campanha." };
  }
}
