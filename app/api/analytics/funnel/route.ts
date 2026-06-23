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
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  if ((rawFrom && !ISO_DATE.test(rawFrom)) || (rawTo && !ISO_DATE.test(rawTo))) {
    return NextResponse.json({ error: "Parâmetros 'from'/'to' devem ter formato YYYY-MM-DD." }, { status: 422 });
  }
  const dateFrom = rawFrom ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateTo = rawTo ?? new Date().toISOString().slice(0, 10);

  const steps = await getFunnelSteps(session.workspace.id, dateFrom, dateTo);
  return NextResponse.json(steps);
}
