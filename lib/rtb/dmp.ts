import type { Audience, AudienceRule } from "@/types/database";
import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Returns a set of user_id_hashes from pixel_events that satisfy the given rule.
 * Queries pixel_events within the lookback window filtered by event_type and operator.
 */
export async function getUsersMatchingRule(
  rule: AudienceRule,
  workspaceId: string
): Promise<Set<string>> {
  const supabase = createServiceClient();

  const { data: pixels } = await supabase
    .from("pixels")
    .select("id")
    .eq("workspace_id", workspaceId);

  const pixelIds = (pixels ?? []).map((p: { id: string }) => p.id);
  if (!pixelIds.length) return new Set();

  const cutoff = new Date(
    Date.now() - rule.lookback_days * 86_400_000
  ).toISOString();

  const query = supabase
    .from("pixel_events")
    .select("user_id_hash")
    .in("pixel_id", pixelIds)
    .eq("event_type", rule.event_type)
    .gte("received_at", cutoff)
    .not("user_id_hash", "is", null);

  const { data: events } = await (
    rule.operator === "contains" && typeof rule.value === "string"
      ? query.ilike("event_name", `%${rule.value}%`)
      : query
  );

  const counts = new Map<string, number>();
  for (const ev of (events ?? []) as Array<{ user_id_hash: string | null }>) {
    if (ev.user_id_hash) {
      counts.set(ev.user_id_hash, (counts.get(ev.user_id_hash) ?? 0) + 1);
    }
  }

  const threshold = typeof rule.value === "number" ? rule.value : 1;
  const result = new Set<string>();

  for (const [hash, count] of counts) {
    if (rule.operator === "eq" || rule.operator === "contains") {
      result.add(hash);
    } else if (rule.operator === "gte" && count >= threshold) {
      result.add(hash);
    } else if (rule.operator === "lte" && count <= threshold) {
      result.add(hash);
    }
  }

  return result;
}

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
 * Returns the count of distinct users satisfying ALL rules (set intersection).
 */
export async function evaluateAudienceRules(
  audience: Audience,
  workspaceId: string
): Promise<number> {
  if (!audience.rules.length) return 0;

  const sets = await Promise.all(
    audience.rules.map((rule) => getUsersMatchingRule(rule, workspaceId))
  );

  // Interseção: só contam usuários que satisfazem TODAS as regras
  let intersection = sets[0];
  for (let i = 1; i < sets.length; i++) {
    const next = sets[i];
    const smaller = intersection.size <= next.size ? intersection : next;
    const larger = intersection.size > next.size ? intersection : next;
    const result = new Set<string>();
    for (const hash of smaller) {
      if (larger.has(hash)) result.add(hash);
    }
    intersection = result;
  }

  return intersection.size;
}

/**
 * Batch job: iterates all audiences for a workspace, evaluates rules via
 * getUsersMatchingRule (set intersection), upserts matching users into
 * audience_segments, and updates size_estimate on the audiences table.
 * Returns { processed, total } where processed = audiences without errors.
 */
export async function buildAudienceMemberships(
  workspaceId: string
): Promise<{ processed: number; total: number }> {
  const supabase = createServiceClient();

  const { data: audiences } = await supabase
    .from("audiences")
    .select("*")
    .eq("workspace_id", workspaceId);

  const audienceList = (audiences ?? []) as Audience[];
  if (!audienceList.length) return { processed: 0, total: 0 };

  let processed = 0;
  const total = audienceList.length;
  const EXPIRES_DAYS = 90;

  for (const audience of audienceList) {
    try {
      // Calcular memberships via set intersection
      const sets = audience.rules.length
        ? await Promise.all(audience.rules.map((r) => getUsersMatchingRule(r, workspaceId)))
        : [];

      let matchingHashes: Set<string>;
      if (!sets.length) {
        matchingHashes = new Set();
      } else {
        matchingHashes = sets[0];
        for (let i = 1; i < sets.length; i++) {
          const next = sets[i];
          const result = new Set<string>();
          for (const hash of matchingHashes) {
            if (next.has(hash)) result.add(hash);
          }
          matchingHashes = result;
        }
      }

      // Upsert matching users into audience_segments
      if (matchingHashes.size > 0) {
        const expiresAt = new Date(
          Date.now() + EXPIRES_DAYS * 86_400_000
        ).toISOString();
        const rows = Array.from(matchingHashes).map((hash) => ({
          audience_id: audience.id,
          user_id_hash: hash,
          matched_at: new Date().toISOString(),
          expires_at: expiresAt,
        }));
        await supabase
          .from("audience_segments")
          .upsert(rows, { onConflict: "audience_id,user_id_hash" });
      }

      // Update size_estimate on audiences
      await supabase
        .from("audiences")
        .update({ size_estimate: matchingHashes.size })
        .eq("id", audience.id);

      processed++;
    } catch (err) {
      console.error(`[dmp] buildAudienceMemberships error for audience ${audience.id}:`, err);
    }
  }

  return { processed, total };
}

/**
 * Hashes a user identifier (cookie/fingerprint) for privacy-safe storage.
 * Uses SHA-256 via Node.js crypto module.
 */
export function hashUserId(rawId: string): string {
  if (!rawId) return "";
  return createHash("sha256").update(rawId).digest("hex");
}
