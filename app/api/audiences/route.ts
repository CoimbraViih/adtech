import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { MOCK_AUDIENCES } from "@/lib/rtb/mock-data";
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
export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspace_id") ?? session.workspace.id;

  // TODO(M8-backend): replace with Supabase query
  // const supabase = createServerSupabaseClient();
  // const { data, error } = await supabase.from("audiences").select("*").eq("workspace_id", workspaceId);
  const data = MOCK_AUDIENCES.filter((a) => a.workspace_id === workspaceId || a.workspace_id === "ws_demo");

  return NextResponse.json({ data });
}

// POST /api/audiences — create a new audience
export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
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

  // TODO(M8-backend): insert into Supabase
  // const { data, error } = await supabase.from("audiences").insert({
  //   workspace_id: session.workspace.id,
  //   ...input,
  // }).select().single();

  const now = new Date().toISOString();
  const newAudience = {
    id: `aud_${Date.now()}`,
    workspace_id: session.workspace.id,
    size_estimate: 0,
    created_at: now,
    updated_at: now,
    ...input,
  };

  return NextResponse.json({ data: newAudience }, { status: 201 });
}
