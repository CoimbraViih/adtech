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

import { listMetaCampaigns, getMetaAccountInsights, listMetaAdSets, listMetaAds } from "@/lib/meta/client";
import { listGoogleCampaigns, getGoogleAccountMetrics, listGoogleAdGroups, listGoogleAds } from "@/lib/google/client";
import { listTikTokCampaigns, getTikTokBatchInsights, listTikTokAdGroups, listTikTokAds } from "@/lib/tiktok/client";
import { listLinkedInCampaigns, getLinkedInAccountInsights, listLinkedInCreatives } from "@/lib/linkedin/client";
import { getCredentialField } from "@/lib/integrations/credentials";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeCampaignMetrics, upsertDailyMetrics } from "@/lib/analytics/cross-platform";
import type { CampaignStatus } from "@/types/database";

// TODO(M-ADS-backend): extract per-platform ad set/ads sync into a shared helper before wiring real Supabase upserts — currently 4 near-identical blocks

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

// ── ad set / ad status helpers ─────────────────────────────────────────────

type AdSetStatus = "active" | "paused" | "archived";
type AdStatus = "active" | "paused" | "archived" | "in_review" | "rejected";

function normalizeAdSetStatus(raw: string): AdSetStatus {
  const upper = raw.toUpperCase();
  if (upper === "ACTIVE" || upper === "ENABLE" || upper === "ENABLED") return "active";
  if (upper === "PAUSED" || upper === "DISABLE" || upper === "DISABLED") return "paused";
  if (upper === "DELETED" || upper === "REMOVED" || upper === "ARCHIVED") return "archived";
  return "paused";
}

function normalizeAdStatus(raw: string): AdStatus {
  const upper = raw.toUpperCase();
  if (upper === "ACTIVE" || upper === "ENABLE" || upper === "ENABLED") return "active";
  if (upper === "PAUSED" || upper === "DISABLE" || upper === "DISABLED") return "paused";
  if (upper === "DELETED" || upper === "REMOVED" || upper === "ARCHIVED") return "archived";
  if (upper === "IN_REVIEW" || upper === "PENDING_REVIEW") return "in_review";
  if (upper === "DISAPPROVED" || upper === "REJECTED") return "rejected";
  return "paused";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

      // ── Meta ad sets & ads sync (opt-in, errors do not fail campaign sync) ──
      for (const mc of metaCampaigns) {
        const mcStatus = metaStatusToLocal(mc.status);
        if (mcStatus !== "active" && mcStatus !== "paused") continue;
        try {
          const adSets = await listMetaAdSets(organizationId, mc.id);
          for (const as_ of adSets) {
            const _adSetData = {
              workspace_id: workspaceId,
              external_id: as_.id,
              name: as_.name,
              status: normalizeAdSetStatus(as_.status),
              daily_budget: as_.daily_budget ? parseInt(as_.daily_budget, 10) / 100 : null,
              targeting: as_.targeting ?? {},
              updated_at: new Date().toISOString(),
            };
            // TODO(M-ADS-backend): wire real Supabase upsert
            // await supabase.from("ad_sets").upsert(_adSetData, { onConflict: "workspace_id,external_id" });
            void _adSetData;

            try {
              const ads = await listMetaAds(organizationId, as_.id);
              for (const ad of ads) {
                const _adData = {
                  workspace_id: workspaceId,
                  external_id: ad.id,
                  name: ad.name,
                  status: normalizeAdStatus(ad.status),
                  updated_at: new Date().toISOString(),
                };
                // TODO(M-ADS-backend): wire real Supabase upsert
                // await supabase.from("ads").upsert(_adData, { onConflict: "workspace_id,external_id" });
                void _adData;
              }
            } catch (adErr) {
              console.warn(`[sync/meta] ads sync error for adSet ${as_.id}:`, adErr);
            }
          }
        } catch (asErr) {
          console.warn(`[sync/meta] ad_sets sync error for campaign ${mc.id}:`, asErr);
        }
      }

      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      if (metaCampaigns.length > 0) {
        try {
          const metricsInput = metaCampaigns.map((mc) => {
            const ins = insightsByid[mc.id];
            const spend = ins ? parseFloat(ins.spend) : 0;
            const impressions = ins ? parseInt(ins.impressions, 10) : 0;
            const clicks = ins ? parseInt(ins.clicks, 10) : 0;
            const purchases = ins?.actions?.find((a: { action_type: string }) => a.action_type === "purchase");
            const conversions = purchases ? parseInt(purchases.value, 10) : 0;
            const roasEntry = ins?.purchase_roas?.[0];
            const revenue = roasEntry ? parseFloat(roasEntry.value) * spend : 0;
            return { externalId: mc.id, spend, impressions, clicks, conversions, revenue };
          });
          await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "meta", todayIso(), metricsInput));
        } catch (metricsErr) {
          console.warn("[sync/meta] upsertDailyMetrics failed (non-fatal):", metricsErr);
        }
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

      // ── Google ad groups & ads sync (opt-in, errors do not fail campaign sync) ─
      for (const gc of googleCampaigns) {
        const gcStatus = googleStatusToLocal(gc.status);
        if (gcStatus !== "active" && gcStatus !== "paused") continue;
        try {
          const adGroups = await listGoogleAdGroups(organizationId, gc.id);
          for (const ag of adGroups) {
            const _adGroupData = {
              workspace_id: workspaceId,
              external_id: ag.id,
              name: ag.name,
              status: normalizeAdSetStatus(ag.status),
              bid_amount: ag.cpcBidMicros ? parseInt(ag.cpcBidMicros, 10) / 1_000_000 : null,
              targeting: {},
              updated_at: new Date().toISOString(),
            };
            // TODO(M-ADS-backend): wire real Supabase upsert
            // await supabase.from("ad_sets").upsert(_adGroupData, { onConflict: "workspace_id,external_id" });
            void _adGroupData;

            try {
              const ads = await listGoogleAds(organizationId, ag.id);
              for (const ad of ads) {
                const _adData = {
                  workspace_id: workspaceId,
                  external_id: ad.id,
                  name: ad.name ?? "",
                  status: normalizeAdStatus(ad.status),
                  updated_at: new Date().toISOString(),
                };
                // TODO(M-ADS-backend): wire real Supabase upsert
                // await supabase.from("ads").upsert(_adData, { onConflict: "workspace_id,external_id" });
                void _adData;
              }
            } catch (adErr) {
              console.warn(`[sync/google] ads sync error for adGroup ${ag.id}:`, adErr);
            }
          }
        } catch (agErr) {
          console.warn(`[sync/google] ad_groups sync error for campaign ${gc.id}:`, agErr);
        }
      }

      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      if (googleCampaigns.length > 0) {
        try {
          const metricsInput = googleCampaigns.map((gc) => {
            const row = metricsByid[gc.id];
            const m = row?.metrics;
            const spend = m ? parseInt(m.costMicros, 10) / 1_000_000 : 0;
            const impressions = m ? parseInt(m.impressions, 10) : 0;
            const clicks = m ? parseInt(m.clicks, 10) : 0;
            const conversions = m ? parseInt(m.conversions, 10) : 0;
            const revenue = m ? parseFloat(m.conversionsValue) : 0;
            return { externalId: gc.id, spend, impressions, clicks, conversions, revenue };
          });
          await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "google", todayIso(), metricsInput));
        } catch (metricsErr) {
          console.warn("[sync/google] upsertDailyMetrics failed (non-fatal):", metricsErr);
        }
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

      // ── TikTok ad groups & ads sync (opt-in, errors do not fail campaign sync) ─
      for (const tc of tiktokCampaigns) {
        const tcStatus = tiktokStatusToLocal(tc.status);
        if (tcStatus !== "active" && tcStatus !== "paused") continue;
        try {
          const adGroups = await listTikTokAdGroups(organizationId, tc.id);
          for (const ag of adGroups) {
            const _adGroupData = {
              workspace_id: workspaceId,
              external_id: ag.id,
              name: ag.name,
              status: normalizeAdSetStatus(ag.status),
              daily_budget: ag.budget > 0 ? ag.budget : null,
              targeting: {},
              updated_at: new Date().toISOString(),
            };
            // TODO(M-ADS-backend): wire real Supabase upsert
            // await supabase.from("ad_sets").upsert(_adGroupData, { onConflict: "workspace_id,external_id" });
            void _adGroupData;

            try {
              const ads = await listTikTokAds(organizationId, ag.id);
              for (const ad of ads) {
                const _adData = {
                  workspace_id: workspaceId,
                  external_id: ad.id,
                  name: ad.name,
                  status: normalizeAdStatus(ad.status),
                  updated_at: new Date().toISOString(),
                };
                // TODO(M-ADS-backend): wire real Supabase upsert
                // await supabase.from("ads").upsert(_adData, { onConflict: "workspace_id,external_id" });
                void _adData;
              }
            } catch (adErr) {
              console.warn(`[sync/tiktok] ads sync error for adGroup ${ag.id}:`, adErr);
            }
          }
        } catch (agErr) {
          console.warn(`[sync/tiktok] ad_groups sync error for campaign ${tc.id}:`, agErr);
        }
      }

      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      if (tiktokCampaigns.length > 0) {
        try {
          const metricsInput = tiktokCampaigns.map((tc) => {
            const ins = insightsByid[tc.id] ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
            return { externalId: tc.id, spend: ins.spend, impressions: ins.impressions, clicks: ins.clicks, conversions: ins.conversions, revenue: 0 };
          });
          await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "tiktok", todayIso(), metricsInput));
        } catch (metricsErr) {
          console.warn("[sync/tiktok] upsertDailyMetrics failed (non-fatal):", metricsErr);
        }
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

      // ── LinkedIn creatives sync (opt-in, errors do not fail campaign sync) ───
      // LinkedIn has no ad-set level — creatives map directly to ads.
      for (const lc of linkedinCampaigns) {
        const lcStatus = linkedinStatusToLocal(lc.status);
        if (lcStatus !== "active" && lcStatus !== "paused") continue;
        try {
          const creatives = await listLinkedInCreatives(organizationId, lc.id);
          for (const creative of creatives) {
            const _adData = {
              workspace_id: workspaceId,
              external_id: creative.id,
              name: creative.reference ?? `Creative ${creative.id}`,
              status: normalizeAdStatus(creative.status),
              updated_at: new Date().toISOString(),
            };
            // TODO(M-ADS-backend): wire real Supabase upsert
            // await supabase.from("ads").upsert(_adData, { onConflict: "workspace_id,external_id" });
            void _adData;
          }
        } catch (creativeErr) {
          console.warn(`[sync/linkedin] creatives sync error for campaign ${lc.id}:`, creativeErr);
        }
      }

      // Upsert daily metrics snapshot — errors must not fail the campaign sync.
      if (linkedinCampaigns.length > 0) {
        try {
          const metricsInput = linkedinCampaigns.map((lc) => {
            const ins = insightsByid[lc.id] ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
            return { externalId: lc.id, spend: ins.spend, impressions: ins.impressions, clicks: ins.clicks, conversions: ins.conversions, revenue: 0 };
          });
          await upsertDailyMetrics(normalizeCampaignMetrics(workspaceId, "linkedin", todayIso(), metricsInput));
        } catch (metricsErr) {
          console.warn("[sync/linkedin] upsertDailyMetrics failed (non-fatal):", metricsErr);
        }
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
