import { createServiceClient } from "@/lib/supabase/service";

export type SyntheticCheckResult = {
  success: boolean;
  latencyMs: number;
  error?: string;
};

export async function runSyntheticCheck(pixelId: string): Promise<SyntheticCheckResult> {
  const start = Date.now();
  const sessionId = `synthetic-${Date.now()}`;

  try {
    const supabase = createServiceClient();

    // Insere evento sintético diretamente via service role
    const { error: insertError } = await supabase.from("pixel_events").insert({
      pixel_id: pixelId,
      event_type: "page_view",
      session_id: sessionId,
      url: null,
      referrer: null,
      ip: null,
      user_agent: "synthetic-check/1.0",
      event_name: null,
      value: null,
      currency: null,
      properties: { synthetic: true },
    });

    if (insertError) {
      return { success: false, latencyMs: Date.now() - start, error: insertError.message };
    }

    // Valida que o evento foi persistido
    const { data, error: readError } = await supabase
      .from("pixel_events")
      .select("id")
      .eq("pixel_id", pixelId)
      .eq("session_id", sessionId)
      .limit(1)
      .single();

    if (readError || !data) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: readError?.message ?? "Event not found after insert",
      };
    }

    return { success: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { success: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}
