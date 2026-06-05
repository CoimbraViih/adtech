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

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO_DATE.test(dateFrom) || !ISO_DATE.test(dateTo)) {
    return NextResponse.json({ error: "Parâmetros de data inválidos." }, { status: 400 });
  }
  if (dateFrom > dateTo) {
    return NextResponse.json({ error: "Parâmetro 'from' deve ser anterior a 'to'." }, { status: 400 });
  }

  try {
    const rows = await getReconciliationRows(session.workspace.id, dateFrom, dateTo);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/analytics/reconciliation]", err);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
