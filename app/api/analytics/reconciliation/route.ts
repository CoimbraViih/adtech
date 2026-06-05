import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { getReconciliationRows } from "@/lib/analytics/cross-platform";

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateTo =
    searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const dateFrom =
    searchParams.get("from") ??
    new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  try {
    const rows = await getReconciliationRows(session.workspace.id, dateFrom, dateTo);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/analytics/reconciliation]", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
