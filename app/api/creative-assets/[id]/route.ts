import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageCampaigns } from "@/lib/auth/roles";
import { deleteCreativeAsset } from "@/lib/storage/creative-assets";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!canManageCampaigns(session)) {
    return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteCreativeAsset(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[creative-assets] delete error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao remover asset" }, { status: 500 });
  }
}
