import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { MOCK_RTB_CAMPAIGNS } from "@/lib/rtb/mock-data";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["active", "paused", "draft", "archived"]).optional(),
  daily_budget: z.number().positive().optional(),
  max_cpm: z.number().positive().optional(),
  frequency_cap: z.number().int().min(1).optional(),
  audience_id: z.string().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/rtb/campaigns/[id]
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  // TODO(M8-backend): replace with Supabase query
  const campaign = MOCK_RTB_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json(
      { error: "Campanha RTB não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: campaign });
}

// PATCH /api/rtb/campaigns/[id] — update status, budget, etc.
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await requireServerSession();
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

  // TODO(M8-backend): update in Supabase
  const campaign = MOCK_RTB_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json(
      { error: "Campanha RTB não encontrada." },
      { status: 404 }
    );
  }

  const updated = {
    ...campaign,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({ data: updated });
}

// DELETE /api/rtb/campaigns/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  // TODO(M8-backend): soft-delete (status = 'archived') in Supabase
  const campaign = MOCK_RTB_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json(
      { error: "Campanha RTB não encontrada." },
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}
