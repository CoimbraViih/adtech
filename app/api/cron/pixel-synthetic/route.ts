import { NextRequest, NextResponse } from "next/server";
import { runSyntheticCheck } from "@/lib/observability/synthetic";
import { writeToDeadLetter } from "@/lib/pixel/dead-letter";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Guard: apenas Vercel Cron (via CRON_SECRET) ou chamadas internas
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pixelId = process.env.SYNTHETIC_PIXEL_ID;
  if (!pixelId) {
    console.warn("[pixel/synthetic] SYNTHETIC_PIXEL_ID not set — skipping check");
    return NextResponse.json({ skipped: true });
  }

  const result = await runSyntheticCheck(pixelId);

  if (!result.success) {
    // Registra a falha na dead-letter para rastreamento de falhas consecutivas
    await writeToDeadLetter({
      pixelId,
      organizationId: null,
      reason: "synthetic_check_failed",
      eventPayload: { latencyMs: result.latencyMs, error: result.error },
    });

    // Verifica falhas consecutivas nos últimos 2 minutos
    try {
      const supabase = createServiceClient();
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("pixel_dead_letter")
        .select("id", { count: "exact", head: true })
        .eq("rejection_reason", "synthetic_check_failed")
        .gte("created_at", twoMinutesAgo);

      if (count && count >= 2) {
        // Log estruturado para Vercel Log Drains / alertas
        console.error(
          JSON.stringify({
            level: "ALERT",
            event: "pixel_synthetic_consecutive_failures",
            consecutive_failures: count,
            window_minutes: 2,
            error: result.error,
          })
        );
      }
    } catch (countErr) {
      console.error("[pixel/synthetic] failed to count consecutive failures:", (countErr as Error).message);
    }

    return NextResponse.json({
      success: false,
      latencyMs: result.latencyMs,
      error: result.error,
    });
  }

  console.log(
    JSON.stringify({
      level: "INFO",
      event: "pixel_synthetic_ok",
      latencyMs: result.latencyMs,
    })
  );

  return NextResponse.json({ success: true, latencyMs: result.latencyMs });
}
