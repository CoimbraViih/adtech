import type { Audience } from "@/types/database";
import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Returns audience IDs that match the given user.
 * TODO(M8-backend): query audience_segments WHERE user_id_hash = userIdHash
 * AND audience_id IN (SELECT id FROM audiences WHERE workspace_id = workspaceId)
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

  // workspaceId reserved for future Supabase swap-in
  void workspaceId;

  // TODO(M8-backend): query audience_segments for real matching
  return [];
}

/**
 * Estimates audience size by evaluating rules against pixel_events.
 * TODO(M8-backend): COUNT pixel_events matching audience rules (lookback_days, event_type, etc.)
 */
export async function evaluateAudienceRules(
  audience: Audience,
  workspaceId: string
): Promise<number> {
  // workspaceId reserved for future Supabase swap-in
  void workspaceId;

  return audience.rules.length * 3000 + audience.id.charCodeAt(0) * 100;
}

/**
 * Hashes a user identifier (cookie/fingerprint) for privacy-safe storage.
 * Uses SHA-256 via Node.js crypto module.
 */
export function hashUserId(rawId: string): string {
  if (!rawId) return "";
  return createHash("sha256").update(rawId).digest("hex");
}
