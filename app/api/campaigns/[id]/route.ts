import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageCampaigns } from "@/lib/auth/roles";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns/mock-data";
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

// GET /api/campaigns/[id]
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  // TODO(M2-backend): replace with Supabase query
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

// PATCH /api/campaigns/[id] — update status, budget, etc.
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

  // TODO(M2-backend): update in Supabase
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  // Propagate status change to external platform
  if (parsed.data.status && campaign.external_id) {
    try {
      await updateCampaignOnPlatform(session.organization.id, {
        platform: campaign.platform,
        externalId: campaign.external_id,
        status: parsed.data.status as CampaignStatus,
        dailyBudget: parsed.data.daily_budget,
      });
    } catch (err) {
      console.error("[campaigns/patch] platform update error:", err);
      // Non-fatal: update locally anyway
    }
  }

  const updated = { ...campaign, ...parsed.data, updated_at: new Date().toISOString() };
  return NextResponse.json(updated);
}

// DELETE /api/campaigns/[id] — archive campaign
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

  // TODO(M2-backend): soft-delete (status = 'archived') in Supabase
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  if (campaign.external_id) {
    try {
      await updateCampaignOnPlatform(session.organization.id, {
        platform: campaign.platform,
        externalId: campaign.external_id,
        status: "archived",
      });
    } catch (err) {
      console.error("[campaigns/delete] platform archive error:", err);
    }
  }

  return NextResponse.json({ success: true });
}
