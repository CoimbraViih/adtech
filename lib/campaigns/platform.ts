/**
 * Platform abstraction layer for campaign operations.
 * Routes create/update calls to the correct external API.
 * Credentials are resolved per-org from the DB — no opts pass-through.
 */

import type { CampaignCreateInput, CampaignPlatform, CampaignStatus } from "@/types/database";
import { createMetaCampaign, updateMetaCampaign } from "@/lib/meta/client";
import { createGoogleCampaign, updateGoogleCampaign } from "@/lib/google/client";
import { createTikTokCampaign, updateTikTokCampaign } from "@/lib/tiktok/client";
import { createLinkedInCampaign, updateLinkedInCampaign } from "@/lib/linkedin/client";

export async function createCampaignOnPlatform(
  organizationId: string,
  input: CampaignCreateInput
): Promise<string> {
  if (input.platform === "meta") {
    return createMetaCampaign(
      organizationId,
      {
        name: input.name,
        objective: input.objective,
        status: "draft",
        dailyBudget: input.daily_budget,
        lifetimeBudget: input.lifetime_budget,
        startDate: input.start_date,
        endDate: input.end_date,
      }
    );
  }

  if (input.platform === "google") {
    return createGoogleCampaign(
      organizationId,
      {
        name: input.name,
        objective: input.objective,
        status: "draft",
        dailyBudget: input.daily_budget,
        startDate: input.start_date,
        endDate: input.end_date,
      }
    );
  }

  if (input.platform === "tiktok") {
    return createTikTokCampaign(
      organizationId,
      {
        name: input.name,
        objective: input.objective,
        status: "draft",
        dailyBudget: input.daily_budget,
        lifetimeBudget: input.lifetime_budget,
        startDate: input.start_date,
        endDate: input.end_date,
      }
    );
  }

  if (input.platform === "linkedin") {
    return createLinkedInCampaign(
      organizationId,
      {
        name: input.name,
        objective: input.objective,
        status: "draft",
        dailyBudget: input.daily_budget,
        lifetimeBudget: input.lifetime_budget,
        startDate: input.start_date,
        endDate: input.end_date,
      }
    );
  }

  // programmatic: no external API — managed locally
  throw new Error("Programmatic campaigns are not yet supported via external API");
}

export async function updateCampaignOnPlatform(
  organizationId: string,
  update: {
    platform: CampaignPlatform;
    externalId: string;
    status?: CampaignStatus;
    dailyBudget?: number;
  }
): Promise<void> {
  if (update.platform === "meta") {
    return updateMetaCampaign(
      organizationId,
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget }
    );
  }

  if (update.platform === "google") {
    return updateGoogleCampaign(
      organizationId,
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget }
    );
  }

  if (update.platform === "tiktok") {
    return updateTikTokCampaign(
      organizationId,
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget }
    );
  }

  if (update.platform === "linkedin") {
    return updateLinkedInCampaign(
      organizationId,
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget }
    );
  }
}
