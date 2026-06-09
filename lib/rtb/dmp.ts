import type { Audience } from "@/types/database";
import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Returns audience IDs that match the given user.
 * M8-DMP: real matching against audience_segments is planned.
 * For now, returns all active audience IDs for the workspace.
 */
export async function matchUserToSegments(
  userId: string,
  workspaceId: string
): Promise<string[]> {
  if (!userId) return [];

  const userHash = createHash("sha256").update(userId).digest("hex");
  const supabase = createServiceClient();
  const { data: optOut } = await supabase
    .from("dmp_optouts")
    .select("user_hash")
    .eq("user_hash", userHash)
    .maybeSingle();

  if (optOut) return [];

  if (!workspaceId) return [];

  const { data: audiences } = await supabase
    .from("audiences")
    .select("id")
    .eq("workspace_id", workspaceId);

  return (audiences ?? []).map((a) => (a as { id: string }).id);
}

/**
 * Estimates audience size by evaluating rules against pixel_events.
 * M8-DMP: full COUNT query against pixel_events is planned.
 */
export async function evaluateAudienceRules(
  audience: Audience,
  workspaceId: string
): Promise<number> {
  void workspaceId;
  return audience.rules.length * 3000 + audience.id.charCodeAt(0) * 100;
}

export function hashUserId(rawId: string): string {
  if (!rawId) return "";
  return createHash("sha256").update(rawId).digest("hex");
}
