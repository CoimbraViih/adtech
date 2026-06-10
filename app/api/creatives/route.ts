import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, requireServerSession } from "@/lib/supabase/server";
import { canManageCreatives } from "@/lib/auth/roles";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["copy", "banner", "video"]),
  name: z.string().min(1).max(255),
  campaign_id: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  asset_url: z.string().url().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  format: z.enum(["1:1", "16:9", "9:16", "4:5", "1.91:1"]).nullable().optional(),
  prompt: z.string().nullable().optional(),
  model_used: z.string().nullable().optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  score_breakdown: z.record(z.string(), z.number()).nullable().optional(),
  policy_items: z.array(z.object({
    rule: z.string(),
    passed: z.boolean(),
    detail: z.string().nullable(),
  })).nullable().optional(),
  policy_passed: z.boolean().nullable().optional(),
});

// GET /api/creatives — list creatives for the current workspace
export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const campaignId = searchParams.get("campaign_id");

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("creatives")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type as string);
  if (status) query = query.eq("status", status as string);
  if (campaignId) query = query.eq("campaign_id", campaignId as string);

  const { data, error } = await query;
  if (error) {
    console.error("[creatives/GET]", error.message);
    return NextResponse.json({ error: "Erro ao buscar criativos." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/creatives — save a creative
export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageCreatives(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
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

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("creatives")
    .insert({
      workspace_id: session.workspace.id,
      status: "draft",
      version: 1,
      parent_id: null,
      ...parsed.data,
      campaign_id: parsed.data.campaign_id ?? null,
      headline: parsed.data.headline ?? null,
      description: parsed.data.description ?? null,
      cta: parsed.data.cta ?? null,
      asset_url: parsed.data.asset_url ?? null,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      format: parsed.data.format ?? null,
      prompt: parsed.data.prompt ?? null,
      model_used: parsed.data.model_used ?? null,
      score: parsed.data.score ?? null,
      score_breakdown: parsed.data.score_breakdown ?? null,
      policy_items: parsed.data.policy_items ?? null,
      policy_passed: parsed.data.policy_passed ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[creatives/POST]", error.message);
    return NextResponse.json({ error: "Erro ao salvar criativo." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
