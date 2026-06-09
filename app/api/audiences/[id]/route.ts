import { NextRequest, NextResponse } from "next/server";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const audienceRuleSchema = z.object({
  event_type: z.string().min(1),
  operator: z.enum(["eq", "gte", "lte", "contains"]),
  value: z.union([z.string(), z.number()]),
  lookback_days: z.number().int().min(1),
});

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  rules: z.array(audienceRuleSchema).optional(),
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
  const { data: audience, error } = await supabase
    .from("audiences")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (error || !audience) {
    return NextResponse.json({ error: "Audiência não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ data: audience });
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
    .from("audiences")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Audiência não encontrada." }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("audiences")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Erro ao atualizar audiência." }, { status: 500 });
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
    .from("audiences")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Audiência não encontrada." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("audiences")
    .delete()
    .eq("id", id)
    .eq("workspace_id", session.workspace.id);

  if (deleteError) {
    return NextResponse.json({ error: "Erro ao excluir audiência." }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
