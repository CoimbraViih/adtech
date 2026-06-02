/**
 * Campaign sync: pulls campaigns + metrics from Meta, Google, TikTok and LinkedIn,
 * upserts into the local `campaigns` table.
 *
 * Called on-demand via GET /api/campaigns?sync=true or by a cron job.
 * Real Supabase upsert is wired in M-ADS-backend (currently stubbed with
 * TODO(M-ADS-backend) comments inline — DB write path is a no-op until then).
 *
 * Onda 3E: batch insights — each platform is synced with 1 insights call
 * instead of N (one per campaign).  sync_runs are recorded after every
 * platform sync attempt.
 */

import { listMetaCampaigns, getMetaAccountInsights } from "@/lib/meta/client";
import { listGoogleCampaigns, getGoogleAccountMetrics } from "@/lib/google/client";
import { listTikTokCampaigns, getTikTokBatchInsights } from "@/lib/tiktok/client";
import { listLinkedInCampaigns, getLinkedInAccountInsights } from "@/lib/linkedin/client";
import { getCredentialField } from "@/lib/integrations/credentials";
import { createServiceClient } from "@/lib/supabase/service";
import type { CampaignStatus } from "@/types/database";

// ── status mapping ─────────────────────────────────────────────────────────

function metaStatusToLocal(status: string): CampaignStatus {
  switch (status) {
    case "ACTIVE":   return "active";
    case "PAUSED":   return "paused";
    case "ARCHIVED": return "archived";
    default:         return "paused";
  }
}

function googleStatusToLocal(status: string): CampaignStatus {
  switch (status) {
    case "ENABLED":  return "active";
    case "PAUSED":   return "paused";
    case "REMOVED":  return "archived";
    default:         return "paused";
  }
}

function tiktokStatusToLocal(status: string): CampaignStatus {
  switch (status) {
    case "ENABLE":   return "active";
    case "DISABLE":  return "paused";
    case "DELETE":   return "archived";
    default:         return "paused";
  }
}

function linkedinStatusToLocal(status: string): CampaignStatus {
  switch (status) {
    case "ACTIVE":   return "active";
    case "PAUSED":   return "paused";
    case "ARCHIVED": return "archived";
    case "DRAFT":    return "draft";
    default:         return "paused";
  }
}

// ── credential guard ────────────────────────────────────────────────────────

async function hasCredentials(organizationId: string, provider: string): Promise<boolean> {
  // Google uses refresh_token (OAuth2), all other providers use access_token.
  // NOTE: credentials are stored per-organization, not per-workspace —
  // always pass organizationId here, not workspaceId.
  const fields: Record<string, string> = {
    meta:     "access_token",
    google:   "refresh_token",
    tiktok:   "access_token",
    linkedin: "access_token",
  };
  const field = fields[provider] ?? "access_token";
  const val = await getCredentialField(organizationId, provider, field, undefined);
  return !!val;
}

// ── sync_runs recorder ──────────────────────────────────────────────────────

type SyncRunResult = {
  campaignsSynced: number;
  status: "success" | "error" | "partial";
  errorMessage: string | null;
};

async function recordSyncRun(
  workspaceId: string,
  platform: string,
  startedAt: Date,
  result: SyncRunResult
): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from("sync_runs").insert({
      workspace_id: workspaceId,
      platform,
      status: result.status,
      campaigns_synced: result.campaignsSynced,
      error_message: result.errorMessage,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch (err) {
    // Recording a sync_run failure must never surface to the caller —
    // the underlying sync outcome is already captured in the return value.
    console.error("[sync/record_sync_run] failed to write sync_runs row:", err);
  }
}

// ── sync ───────────────────────────────────────────────────────────────────

export async function syncCampaignsFromPlatform(
  workspaceId: string,
  organizationId: string
): Promise<{ platform: string; synced: number; error: string | null }[]> {
  const results: { platform: string; synced: number; error: string | null }[] = [];

  // ── Meta ────────────────────────────────────────────────────────────────
  if (await hasCredentials(organizationId, "meta")) {
    const startedAt = new Date();
    try {
      // 1 call for campaign list + 1 call for all insights (batch).
      const [metaCampaigns, insightsByid] = await Promise.all([
        listMetaCampaigns(organizationId),
        getMetaAccountInsights(organizationId, { datePreset: "last_30d" }),
      ]);

      for (const mc of metaCampaigns) {
        const ins = insightsByid[mc.id];

        const spend = ins ? parseFloat(ins.spend) : 0;
        const impressions = ins ? parseInt(ins.impressions, 10) : 0;
        const clicks = ins ? parseInt(ins.clicks, 10) : 0;
        const purchases = ins?.actions?.find((a) => a.action_type === "purchase");
        const conversions = purchases ? parseInt(purchases.value, 10) : 0;
        const roasEntry = ins?.purchase_roas?.[0];
        const roas = roasEntry ? parseFloat(roasEntry.value) : null;
        const cpa = conversions > 0 ? spend / conversions : null;

        const _upsertData = {
          workspace_id: workspaceId,
          external_id: mc.id,
          platform: "meta" as const,
          name: mc.name,
          status: metaStatusToLocal(mc.status),
          daily_budget: mc.daily_budget ? parseInt(mc.daily_budget, 10) / 100 : 0,
          spend, impressions, clicks, conversions, roas, cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M-ADS-backend): wire real Supabase upsert
        // await supabase.from("campaigns").upsert(_upsertData, { onConflict: "workspace_id,external_id" });
        void _upsertData;
      }

      results.push({ platform: "meta", synced: metaCampaigns.length, error: null });
      await recordSyncRun(workspaceId, "meta", startedAt, {
        campaignsSynced: metaCampaigns.length,
        status: "success",
        errorMessage: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ platform: "meta", synced: 0, error: msg });
      console.error("[sync/meta] error:", err);
      await recordSyncRun(workspaceId, "meta", startedAt, {
        campaignsSynced: 0,
        status: "error",
        errorMessage: msg,
      });
    }
  }

  // ── Google ───────────────────────────────────────────────────────────────
  if (await hasCredentials(organizationId, "google")) {
    const startedAt = new Date();
    try {
      // 1 GAQL query for campaign list + 1 GAQL query for all metrics (batch).
      const [googleCampaigns, metricsByid] = await Promise.all([
        listGoogleCampaigns(organizationId),
        getGoogleAccountMetrics(organizationId),
      ]);

      for (const gc of googleCampaigns) {
        const row = metricsByid[gc.id];
        const m = row?.metrics;

        const spend = m ? parseInt(m.costMicros, 10) / 1_000_000 : 0;
        const impressions = m ? parseInt(m.impressions, 10) : 0;
        const clicks = m ? parseInt(m.clicks, 10) : 0;
        const conversions = m ? parseInt(m.conversions, 10) : 0;
        const revenue = m ? parseFloat(m.conversionsValue) : 0;
        const roas = spend > 0 ? revenue / spend : null;
        const cpa = conversions > 0 ? spend / conversions : null;

        const _upsertData = {
          workspace_id: workspaceId,
          external_id: gc.id,
          platform: "google" as const,
          name: gc.name,
          status: googleStatusToLocal(gc.status),
          spend, impressions, clicks, conversions, revenue, roas, cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M-ADS-backend): wire real Supabase upsert
        // await supabase.from("campaigns").upsert(_upsertData, { onConflict: "workspace_id,external_id" });
        void _upsertData;
      }

      results.push({ platform: "google", synced: googleCampaigns.length, error: null });
      await recordSyncRun(workspaceId, "google", startedAt, {
        campaignsSynced: googleCampaigns.length,
        status: "success",
        errorMessage: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ platform: "google", synced: 0, error: msg });
      console.error("[sync/google] error:", err);
      await recordSyncRun(workspaceId, "google", startedAt, {
        campaignsSynced: 0,
        status: "error",
        errorMessage: msg,
      });
    }
  }

  // ── TikTok ───────────────────────────────────────────────────────────────
  if (await hasCredentials(organizationId, "tiktok")) {
    const startedAt = new Date();
    try {
      const tiktokCampaigns = await listTikTokCampaigns(organizationId);

      // Batch: collect all campaign IDs, fetch insights in one call.
      const ids = tiktokCampaigns.map((tc) => tc.id);
      const insightsByid = await getTikTokBatchInsights(organizationId, ids);

      let syncedCount = 0;
      let partialError: string | null = null;

      for (const tc of tiktokCampaigns) {
        const ins = insightsByid[tc.id] ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
        const cpa = ins.conversions > 0 ? ins.spend / ins.conversions : null;

        const _upsertData = {
          workspace_id: workspaceId,
          external_id: tc.id,
          platform: "tiktok" as const,
          name: tc.name,
          status: tiktokStatusToLocal(tc.status),
          daily_budget: tc.budget,
          spend: ins.spend,
          impressions: ins.impressions,
          clicks: ins.clicks,
          conversions: ins.conversions,
          roas: null,
          cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M-ADS-backend): wire real Supabase upsert
        // await supabase.from("campaigns").upsert(_upsertData, { onConflict: "workspace_id,external_id" });
        void _upsertData;
        syncedCount++;
      }

      const campaignsWithoutInsights = tiktokCampaigns.filter((tc) => !insightsByid[tc.id]).length;
      if (campaignsWithoutInsights > 0 && tiktokCampaigns.length > 0) {
        partialError = `${campaignsWithoutInsights} campanha(s) sem dados de insights`;
      }

      const runStatus = partialError ? "partial" : "success";
      results.push({ platform: "tiktok", synced: syncedCount, error: partialError });
      await recordSyncRun(workspaceId, "tiktok", startedAt, {
        campaignsSynced: syncedCount,
        status: runStatus,
        errorMessage: partialError,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ platform: "tiktok", synced: 0, error: msg });
      console.error("[sync/tiktok] error:", err);
      await recordSyncRun(workspaceId, "tiktok", startedAt, {
        campaignsSynced: 0,
        status: "error",
        errorMessage: msg,
      });
    }
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  if (await hasCredentials(organizationId, "linkedin")) {
    const startedAt = new Date();
    try {
      // 1 call for campaign list + 1 call for all account insights (batch).
      const [linkedinCampaigns, insightsByid] = await Promise.all([
        listLinkedInCampaigns(organizationId),
        getLinkedInAccountInsights(organizationId),
      ]);

      let syncedCount = 0;
      let partialError: string | null = null;

      for (const lc of linkedinCampaigns) {
        const ins = insightsByid[lc.id] ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
        const cpa = ins.conversions > 0 ? ins.spend / ins.conversions : null;

        const _upsertData = {
          workspace_id: workspaceId,
          external_id: lc.id,
          platform: "linkedin" as const,
          name: lc.name,
          status: linkedinStatusToLocal(lc.status),
          daily_budget: lc.budget,
          spend: ins.spend,
          impressions: ins.impressions,
          clicks: ins.clicks,
          conversions: ins.conversions,
          roas: null,
          cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M-ADS-backend): wire real Supabase upsert
        // await supabase.from("campaigns").upsert(_upsertData, { onConflict: "workspace_id,external_id" });
        void _upsertData;
        syncedCount++;
      }

      const campaignsWithoutInsights = linkedinCampaigns.filter((lc) => !insightsByid[lc.id]).length;
      if (campaignsWithoutInsights > 0 && linkedinCampaigns.length > 0) {
        partialError = `${campaignsWithoutInsights} campanha(s) sem dados de insights`;
      }

      const runStatus = partialError ? "partial" : "success";
      results.push({ platform: "linkedin", synced: syncedCount, error: partialError });
      await recordSyncRun(workspaceId, "linkedin", startedAt, {
        campaignsSynced: syncedCount,
        status: runStatus,
        errorMessage: partialError,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ platform: "linkedin", synced: 0, error: msg });
      console.error("[sync/linkedin] error:", err);
      await recordSyncRun(workspaceId, "linkedin", startedAt, {
        campaignsSynced: 0,
        status: "error",
        errorMessage: msg,
      });
    }
  }

  return results;
}
