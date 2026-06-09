import { NextRequest, NextResponse } from "next/server";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageCampaigns } from "@/lib/auth/roles";
import { z } from "zod";
import type { AudienceCreateInput } from "@/types/database";

const audienceRuleSchema = z.object({
  event_type: z.string().min(1),
  operator: z.enum(["eq", "gte", "lte", "contains"]),
  value: z.union([z.string(), z.number()]),
  lookback_days: z.number().int().min(1),
});

const createSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["behavioral", "lookalike", "custom"]),
  description: z.string().nullable().optional(),
  rules: z.array(audienceRuleSchema),
  lookalike_source_id: z.string().nullable().optional(),
});

// GET /api/audiences — list audiences for the current workspace
export async function GET(_req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("audiences")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[audiences/list]", error.message);
    return NextResponse.json({ error: "Erro ao buscar audiências." }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/audiences — create a new audience
export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageCampaigns(session)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  const input: AudienceCreateInput = {
    name: parsed.data.name,
    type: parsed.data.type,
    description: parsed.data.description ?? null,
    rules: parsed.data.rules,
    lookalike_source_id: parsed.data.lookalike_source_id ?? null,
  };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("audiences")
    .insert({
      workspace_id: session.workspace.id,
      size_estimate: 0,
      ...input,
    })
    .select()
    .single();

  if (error) {
    console.error("[audiences/create]", error.message);
    return NextResponse.json({ error: "Erro ao criar audiência." }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
