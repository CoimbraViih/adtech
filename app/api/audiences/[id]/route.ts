import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { MOCK_AUDIENCES } from "@/lib/rtb/mock-data";
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

// GET /api/audiences/[id]
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  // TODO(M8-backend): replace with Supabase query
  const audience = MOCK_AUDIENCES.find((a) => a.id === id);
  if (!audience) {
    return NextResponse.json(
      { error: "Audiência não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: audience });
}

// PATCH /api/audiences/[id] — update name, description, or rules
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
  const audience = MOCK_AUDIENCES.find((a) => a.id === id);
  if (!audience) {
    return NextResponse.json(
      { error: "Audiência não encontrada." },
      { status: 404 }
    );
  }

  const updated = {
    ...audience,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({ data: updated });
}

// DELETE /api/audiences/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  // TODO(M8-backend): delete from Supabase
  const audience = MOCK_AUDIENCES.find((a) => a.id === id);
  if (!audience) {
    return NextResponse.json(
      { error: "Audiência não encontrada." },
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}
