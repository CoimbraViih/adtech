/**
 * Platform abstraction layer for campaign operations.
 * Routes create/update calls to the correct external API.
 */

import type { CampaignCreateInput, CampaignPlatform, CampaignStatus } from "@/types/database";
import { createMetaCampaign, updateMetaCampaign } from "@/lib/meta/client";
import { createGoogleCampaign, updateGoogleCampaign } from "@/lib/google/client";
import { createTikTokCampaign, updateTikTokCampaign } from "@/lib/tiktok/client";
import { createLinkedInCampaign, updateLinkedInCampaign } from "@/lib/linkedin/client";

export async function createCampaignOnPlatform(
  input: CampaignCreateInput,
  opts?: { accessToken?: string; customerId?: string; refreshToken?: string; advertiserId?: string; adAccountId?: string }
): Promise<string> {
  if (input.platform === "meta") {
    return createMetaCampaign(
      { name: input.name, objective: input.objective, status: "draft", dailyBudget: input.daily_budget, lifetimeBudget: input.lifetime_budget, startDate: input.start_date, endDate: input.end_date },
      { accessToken: opts?.accessToken }
    );
  }

  if (input.platform === "google") {
    return createGoogleCampaign(
      { name: input.name, objective: input.objective, status: "draft", dailyBudget: input.daily_budget, startDate: input.start_date, endDate: input.end_date },
      { customerId: opts?.customerId, refreshToken: opts?.refreshToken }
    );
  }

  if (input.platform === "tiktok") {
    return createTikTokCampaign(
      { name: input.name, objective: input.objective, status: "draft", dailyBudget: input.daily_budget, lifetimeBudget: input.lifetime_budget, startDate: input.start_date, endDate: input.end_date },
      { accessToken: opts?.accessToken, advertiserId: opts?.advertiserId }
    );
  }

  if (input.platform === "linkedin") {
    return createLinkedInCampaign(
      { name: input.name, objective: input.objective, status: "draft", dailyBudget: input.daily_budget, lifetimeBudget: input.lifetime_budget, startDate: input.start_date, endDate: input.end_date },
      { accessToken: opts?.accessToken, adAccountId: opts?.adAccountId }
    );
  }

  // programmatic: no external API — managed locally
  throw new Error("Programmatic campaigns are not yet supported via external API");
}

export async function updateCampaignOnPlatform(update: {
  platform: CampaignPlatform;
  externalId: string;
  status?: CampaignStatus;
  dailyBudget?: number;
  accessToken?: string;
  customerId?: string;
  refreshToken?: string;
  advertiserId?: string;
  adAccountId?: string;
}): Promise<void> {
  if (update.platform === "meta") {
    return updateMetaCampaign(
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget },
      { accessToken: update.accessToken }
    );
  }

  if (update.platform === "google") {
    return updateGoogleCampaign(
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget },
      { customerId: update.customerId, refreshToken: update.refreshToken }
    );
  }

  if (update.platform === "tiktok") {
    return updateTikTokCampaign(
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget },
      { accessToken: update.accessToken, advertiserId: update.advertiserId }
    );
  }

  if (update.platform === "linkedin") {
    return updateLinkedInCampaign(
      update.externalId,
      { status: update.status, dailyBudget: update.dailyBudget },
      { accessToken: update.accessToken, adAccountId: update.adAccountId }
    );
  }
}
