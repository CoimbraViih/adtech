import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getFunnelSteps } from "@/lib/analytics/aggregates";

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

  const steps = await getFunnelSteps(session.workspace.id, dateFrom, dateTo);
  return NextResponse.json(steps);
}
