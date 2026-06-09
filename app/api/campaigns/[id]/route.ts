import { NextRequest, NextResponse } from "next/server";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageCampaigns } from "@/lib/auth/roles";
import { updateCampaignOnPlatform } from "@/lib/campaigns/platform";
import { z } from "zod";
import type { CampaignStatus } from "@/types/database";

const patchSchema = z.object({
  status: z.enum(["active", "paused", "draft", "archived"]).optional(),
  name: z.string().min(3).max(255).optional(),
  daily_budget: z.number().min(1).optional(),
  end_date: z.string().nullable().optional(),
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
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageCampaigns(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
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
    .from("campaigns")
    .select("id, platform, external_id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  if (parsed.data.status && existing.external_id) {
    try {
      await updateCampaignOnPlatform(session.organization.id, {
        platform: existing.platform,
        externalId: existing.external_id,
        status: parsed.data.status as CampaignStatus,
        dailyBudget: parsed.data.daily_budget,
      });
    } catch (err) {
      console.error("[campaigns/patch] platform update error:", err);
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("campaigns")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Erro ao atualizar campanha." }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageCampaigns(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("campaigns")
    .select("id, platform, external_id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  if (existing.external_id) {
    try {
      await updateCampaignOnPlatform(session.organization.id, {
        platform: existing.platform,
        externalId: existing.external_id,
        status: "archived",
      });
    } catch (err) {
      console.error("[campaigns/delete] platform archive error:", err);
    }
  }

  const { error: archiveError } = await supabase
    .from("campaigns")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", session.workspace.id);

  if (archiveError) {
    return NextResponse.json({ error: "Erro ao arquivar campanha." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
