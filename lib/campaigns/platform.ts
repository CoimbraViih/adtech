/**
 * Platform abstraction layer for campaign operations.
 * Routes create/update calls to the correct external API (Meta or Google).
 */

import type { CampaignCreateInput, CampaignPlatform, CampaignStatus } from "@/types/database";
import { createMetaCampaign, updateMetaCampaign } from "@/lib/meta/client";
import { createGoogleCampaign, updateGoogleCampaign } from "@/lib/google/client";

/**
 * Create a campaign on the external platform.
 * Returns the platform-side campaign ID, or throws if the API call fails.
 */
export async function createCampaignOnPlatform(
  input: CampaignCreateInput,
  opts?: { accessToken?: string; customerId?: string; refreshToken?: string }
): Promise<string> {
  if (input.platform === "meta") {
    return createMetaCampaign(
      {
        name: input.name,
        objective: input.objective,
        status: "draft",
        dailyBudget: input.daily_budget,
        lifetimeBudget: input.lifetime_budget,
        startDate: input.start_date,
        endDate: input.end_date,
      },
      { accessToken: opts?.accessToken }
    );
  }

  if (input.platform === "google") {
    return createGoogleCampaign(
      {
        name: input.name,
        objective: input.objective,
        status: "draft",
        dailyBudget: input.daily_budget,
        startDate: input.start_date,
        endDate: input.end_date,
      },
      { customerId: opts?.customerId, refreshToken: opts?.refreshToken }
    );
  }

  // programmatic: no external API in M2 — campaigns are managed locally
  throw new Error("Programmatic campaigns are not yet supported via external API");
}

/**
 * Update a campaign status or budget on the external platform.
 */
export async function updateCampaignOnPlatform(update: {
  platform: CampaignPlatform;
  externalId: string;
  status?: CampaignStatus;
  dailyBudget?: number;
  accessToken?: string;
  customerId?: string;
  refreshToken?: string;
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
}
