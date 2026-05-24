import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getChannelAttribution } from "@/lib/analytics/aggregates";
import type { AttributionModel } from "@/types/database";

const VALID_MODELS: AttributionModel[] = ["last_click", "linear", "time_decay"];

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const rawModel = searchParams.get("model") ?? "last_click";

  if (!VALID_MODELS.includes(rawModel as AttributionModel)) {
    return NextResponse.json({ error: "model inválido. Use: last_click, linear, time_decay." }, { status: 400 });
  }

  const channels = await getChannelAttribution(
    session.workspace.id,
    dateFrom,
    dateTo,
    rawModel as AttributionModel
  );
  return NextResponse.json(channels);
}
