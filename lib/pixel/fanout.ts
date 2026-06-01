import type { Pixel, PixelEvent } from "@/types/database";
import { sendMetaCapiEvent } from "@/lib/pixel/meta-capi";
import { sendGoogleEcEvent } from "@/lib/pixel/google-ec";

export async function fanoutToPlatforms(event: PixelEvent, pixel: Pixel): Promise<void> {
  // TODO(M4-backend): resolve organizationId from pixel.workspace_id lookup.
  // For now pass "" so credentials fall back to environment variables.
  const organizationId = "";

  const tasks: Promise<void>[] = [];

  if (pixel.meta_pixel_id) {
    tasks.push(sendMetaCapiEvent(organizationId, event, pixel.meta_pixel_id));
  }

  if (pixel.google_tag_id) {
    tasks.push(sendGoogleEcEvent(organizationId, event, pixel.google_tag_id));
  }

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[pixel/fanout] adapter error:", result.reason);
    }
  }
}
