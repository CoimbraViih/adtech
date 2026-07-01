import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, requireServerSession } from "@/lib/supabase/server";
import type { PmpDeal } from "@/types/database";

const PmpDealUpdateSchema = z.object({
  deal_name: z.string().min(1).optional(),
  floor_price: z.number().min(0).optional(),
  status: z.enum(["active", "paused"]).optional(),
  wseat: z.array(z.string()).nullable().optional(),
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
});

// PATCH /api/rtb/deals/[id] — update a PMP deal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // Fetch deal and verify it belongs to a workspace the user is a member of
  const { data: existing, error: fetchError } = await supabase
    .from("pmp_deals")
    .select("id, workspace_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Deal não encontrado." }, { status: 404 });
  }

  const { data: wsMember } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", existing.workspace_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!wsMember || !["owner", "admin"].includes(wsMember.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = PmpDealUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pmp_deals")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[rtb/deals/PATCH]", error.message);
    if (error.code === "42501") {
      return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao atualizar deal." }, { status: 500 });
  }

  return NextResponse.json({ deal: data as PmpDeal });
}

// DELETE /api/rtb/deals/[id] — soft-delete a PMP deal (sets status='expired')
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // Fetch deal and verify workspace membership
  const { data: existing, error: fetchError } = await supabase
    .from("pmp_deals")
    .select("id, workspace_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Deal não encontrado." }, { status: 404 });
  }

  const { data: wsMember } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", existing.workspace_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!wsMember || !["owner", "admin"].includes(wsMember.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  // Soft-delete: set status to 'expired' to preserve audit trail
  const { error } = await supabase
    .from("pmp_deals")
    .update({ status: "expired" })
    .eq("id", id);

  if (error) {
    console.error("[rtb/deals/DELETE]", error.message);
    if (error.code === "42501") {
      return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao remover deal." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
