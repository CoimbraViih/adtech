import { getCredentialField } from "@/lib/integrations/credentials";
import { chatCompletion } from "@/lib/ai/openai";
import type { SkillFinding } from "./types";

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
    ], { temperature: 0.2 });
    const parsed: NarratedDiagnostic = JSON.parse(raw.trim());
    return parsed;
  } catch {
    return { rationale: finding.evidence, suggested_action: "Revisar métricas da campanha." };
  }
}
