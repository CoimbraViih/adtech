/**
 * Campaign sync: pulls campaigns + metrics from Meta, Google, TikTok and LinkedIn,
 * upserts into the local `campaigns` table.
 *
 * Called on-demand via GET /api/campaigns?sync=true or by a cron job.
 * TODO(M2-backend): replace mock upsert with real Supabase calls.
 */

import { listMetaCampaigns, getMetaCampaignInsights } from "@/lib/meta/client";
import { listGoogleCampaigns, getGoogleCampaignMetrics } from "@/lib/google/client";
import { listTikTokCampaigns, getTikTokCampaignInsights } from "@/lib/tiktok/client";
import { listLinkedInCampaigns, getLinkedInCampaignInsights } from "@/lib/linkedin/client";
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

// ── sync ───────────────────────────────────────────────────────────────────

export async function syncCampaignsFromPlatform(workspaceId: string, organizationId: string): Promise<void> {
  const errors: Error[] = [];

  // ── Meta ────────────────────────────────────────────────────────────────
  if (process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID) {
    try {
      const metaCampaigns = await listMetaCampaigns(organizationId);

      for (const mc of metaCampaigns) {
        const insights = await getMetaCampaignInsights(organizationId, mc.id, { datePreset: "last_30d" });
        const ins = insights[0];

        const spend = ins ? parseFloat(ins.spend) : 0;
        const impressions = ins ? parseInt(ins.impressions, 10) : 0;
        const clicks = ins ? parseInt(ins.clicks, 10) : 0;
        const purchases = ins?.actions?.find((a) => a.action_type === "purchase");
        const conversions = purchases ? parseInt(purchases.value, 10) : 0;
        const roasEntry = ins?.purchase_roas?.[0];
        const roas = roasEntry ? parseFloat(roasEntry.value) : null;
        const cpa = conversions > 0 ? spend / conversions : null;

        const upsertData = {
          workspace_id: workspaceId,
          external_id: mc.id,
          platform: "meta" as const,
          name: mc.name,
          status: metaStatusToLocal(mc.status),
          daily_budget: mc.daily_budget ? parseInt(mc.daily_budget, 10) / 100 : 0,
          spend, impressions, clicks, conversions, roas, cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M2-backend): upsert into Supabase
        // await supabase.from("campaigns").upsert(upsertData, { onConflict: "workspace_id,external_id" });
        console.log("[sync/meta] upsert:", upsertData.name, upsertData.status);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
      console.error("[sync/meta] error:", err);
    }
  }

  // ── Google ───────────────────────────────────────────────────────────────
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID && process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    try {
      const googleCampaigns = await listGoogleCampaigns(organizationId);

      for (const gc of googleCampaigns) {
        const metrics = await getGoogleCampaignMetrics(organizationId, gc.id);
        const m = metrics[0]?.metrics;

        const spend = m ? parseInt(m.costMicros, 10) / 1_000_000 : 0;
        const impressions = m ? parseInt(m.impressions, 10) : 0;
        const clicks = m ? parseInt(m.clicks, 10) : 0;
        const conversions = m ? parseInt(m.conversions, 10) : 0;
        const revenue = m ? parseFloat(m.conversionsValue) : 0;
        const roas = spend > 0 ? revenue / spend : null;
        const cpa = conversions > 0 ? spend / conversions : null;

        const upsertData = {
          workspace_id: workspaceId,
          external_id: gc.id,
          platform: "google" as const,
          name: gc.name,
          status: googleStatusToLocal(gc.status),
          spend, impressions, clicks, conversions, revenue, roas, cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M2-backend): upsert into Supabase
        // await supabase.from("campaigns").upsert(upsertData, { onConflict: "workspace_id,external_id" });
        console.log("[sync/google] upsert:", upsertData.name, upsertData.status);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
      console.error("[sync/google] error:", err);
    }
  }

  // ── TikTok ───────────────────────────────────────────────────────────────
  if (process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID) {
    try {
      const tiktokCampaigns = await listTikTokCampaigns(organizationId);

      for (const tc of tiktokCampaigns) {
        const insights = await getTikTokCampaignInsights(organizationId, tc.id);
        const cpa = insights.conversions > 0 ? insights.spend / insights.conversions : null;

        const upsertData = {
          workspace_id: workspaceId,
          external_id: tc.id,
          platform: "tiktok" as const,
          name: tc.name,
          status: tiktokStatusToLocal(tc.status),
          daily_budget: tc.budget,
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
          conversions: insights.conversions,
          roas: null,
          cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M2-backend): upsert into Supabase
        // await supabase.from("campaigns").upsert(upsertData, { onConflict: "workspace_id,external_id" });
        console.log("[sync/tiktok] upsert:", upsertData.name, upsertData.status);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
      console.error("[sync/tiktok] error:", err);
    }
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  if (process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AD_ACCOUNT_ID) {
    try {
      const linkedinCampaigns = await listLinkedInCampaigns(organizationId);

      for (const lc of linkedinCampaigns) {
        const insights = await getLinkedInCampaignInsights(organizationId, lc.id);
        const cpa = insights.conversions > 0 ? insights.spend / insights.conversions : null;

        const upsertData = {
          workspace_id: workspaceId,
          external_id: lc.id,
          platform: "linkedin" as const,
          name: lc.name,
          status: linkedinStatusToLocal(lc.status),
          daily_budget: lc.budget,
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
          conversions: insights.conversions,
          roas: null,
          cpa,
          updated_at: new Date().toISOString(),
        };

        // TODO(M2-backend): upsert into Supabase
        // await supabase.from("campaigns").upsert(upsertData, { onConflict: "workspace_id,external_id" });
        console.log("[sync/linkedin] upsert:", upsertData.name, upsertData.status);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
      console.error("[sync/linkedin] error:", err);
    }
  }

  if (errors.length > 0 && errors.length === 4) {
    throw new AggregateError(errors, "Campaign sync failed on all platforms");
  }
}
