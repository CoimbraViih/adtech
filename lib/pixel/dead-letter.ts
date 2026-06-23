import { createServiceClient } from "@/lib/supabase/service";
import type { DeadLetterReason } from "@/types/database";

export async function writeToDeadLetter(params: {
  pixelId: string;
  organizationId: string | null;
  reason: DeadLetterReason;
  eventPayload: unknown;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("pixel_dead_letter").insert({
      pixel_id: params.pixelId,
      organization_id: params.organizationId,
      rejection_reason: params.reason,
      event_payload: params.eventPayload,
    });
    if (error) console.error("[pixel/dead-letter] insert error:", error.message);
  } catch (err) {
    console.error("[pixel/dead-letter] write failed:", (err as Error).message);
  }
}
