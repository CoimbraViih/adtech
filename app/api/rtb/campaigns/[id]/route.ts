import { NextRequest, NextResponse } from "next/server";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["active", "paused", "draft", "archived"]).optional(),
  daily_budget: z.number().positive().optional(),
  max_cpm: z.number().positive().optional(),
  frequency_cap: z.number().int().min(1).optional(),
  audience_id: z.string().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const { data: campaign, error } = await supabase
    .from("rtb_campaigns")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campanha RTB não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ data: campaign });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("rtb_campaigns")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Campanha RTB não encontrada." }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("rtb_campaigns")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Erro ao atualizar campanha RTB." }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("rtb_campaigns")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Campanha RTB não encontrada." }, { status: 404 });
  }

  const { error: archiveError } = await supabase
    .from("rtb_campaigns")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", session.workspace.id);

  if (archiveError) {
    return NextResponse.json({ error: "Erro ao arquivar campanha RTB." }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
