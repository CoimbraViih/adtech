import type { Audience } from "@/types/database";
import { MOCK_AUDIENCES } from "@/lib/rtb/mock-data";
import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Returns audience IDs that match the given user.
 * TODO(M8-backend): query audience_segments WHERE user_id_hash = userIdHash
 * AND audience_id IN (SELECT id FROM audiences WHERE workspace_id = workspaceId)
 */
export async function matchUserToSegments(
  userIdHash: string,
  workspaceId: string
): Promise<string[]> {
  if (!userIdHash) return [];

  const userHash = createHash("sha256").update(userIdHash).digest("hex");
  const supabase = createServiceClient();
  const { data: optOut } = await supabase
    .from("dmp_optouts")
    .select("user_hash")
    .eq("user_hash", userHash)
    .maybeSingle();

  if (optOut) return [];

  // workspaceId reserved for future Supabase swap-in
  void workspaceId;

  return MOCK_AUDIENCES.slice(0, 2).map((a) => a.id);
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
 * Uses a simple base64 placeholder — real implementation uses crypto.subtle.
 * TODO(M8-backend): replace with crypto.subtle.digest SHA-256
 */
export function hashUserId(rawId: string): string {
  return btoa(rawId).replace(/=/g, "").slice(0, 32);
}
