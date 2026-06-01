import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildCampaignContexts } from "./context";
import { SKILLS } from "./skills/index";
import { narrateDiagnostic } from "./llm";
import type { AiDiagnostic } from "@/types/database";
import type { CampaignContext, SkillFinding } from "./types";

type RunOptions = {
  campaignId?: string;
};

const MAX_CONCURRENT_LLM = 3;

export async function runDiagnostics(
  workspaceId: string,
  organizationId: string,
  opts: RunOptions = {},
): Promise<AiDiagnostic[]> {
  const contexts = await buildCampaignContexts(workspaceId, organizationId, opts.campaignId);

  type PendingDiagnostic = {
    ctx: CampaignContext;
    finding: SkillFinding;
    skillId: string;
  };

  const pending: PendingDiagnostic[] = [];

  for (const ctx of contexts) {
    for (const skill of SKILLS) {
      const finding = skill.shouldTrigger(ctx);
      if (finding) {
        pending.push({ ctx, finding, skillId: skill.id });
      }
    }
  }

  const results: AiDiagnostic[] = [];
  const supabase = await createServerSupabaseClient();

  for (let i = 0; i < pending.length; i += MAX_CONCURRENT_LLM) {
    const batch = pending.slice(i, i + MAX_CONCURRENT_LLM);
    const narrated = await Promise.all(
      batch.map(({ ctx, finding }) => narrateDiagnostic(organizationId, ctx.name, finding)),
    );

    for (let j = 0; j < batch.length; j++) {
      const { ctx, finding, skillId } = batch[j];
      const { rationale, suggested_action } = narrated[j];

      const row = {
        workspace_id: workspaceId,
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
        campaign_id: ctx.campaignId,
        skill_id: skillId,
        severity: finding.severity,
        status: "open" as const,
        title: finding.title,
        rationale,
        suggested_action,
        metrics_snapshot: finding.metricsSnapshot,
      };

      const { data, error } = await supabase
        .from("ai_diagnostics")
        .upsert(row, {
          onConflict: "workspace_id,entity_type,entity_id,skill_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (!error && data) {
        results.push(data as AiDiagnostic);
      }
    }
  }

  return results;
}
