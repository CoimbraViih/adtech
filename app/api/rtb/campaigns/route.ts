import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { MOCK_RTB_CAMPAIGNS } from "@/lib/rtb/mock-data";
import { z } from "zod";
import type { RtbCampaignCreateInput } from "@/types/database";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  deal_type: z.enum(["open", "private", "preferred", "guaranteed"]),
  deal_id: z.string().nullable().optional(),
  floor_cpm: z.number().min(0),
  max_cpm: z.number().positive(),
  daily_budget: z.number().positive(),
  total_budget: z.number().nullable().optional(),
  pacing: z.enum(["even", "asap"]),
  frequency_cap: z.number().int().min(1),
  frequency_cap_hours: z.number().int().min(1),
  creative_id: z.string().nullable().optional(),
  audience_id: z.string().nullable().optional(),
  targeting: z.record(z.string(), z.unknown()).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// GET /api/rtb/campaigns — list RTB campaigns for the current workspace
export async function GET(req: NextRequest) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspace_id") ?? "ws_demo";

  // TODO(M8-backend): replace with Supabase query
  // const supabase = createServerSupabaseClient();
  // const { data, error } = await supabase.from("rtb_campaigns").select("*").eq("workspace_id", workspaceId);
  const data = MOCK_RTB_CAMPAIGNS.filter((c) => c.workspace_id === workspaceId);

  return NextResponse.json({ data });
}

// POST /api/rtb/campaigns — create a new RTB campaign
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

  const input: RtbCampaignCreateInput = {
    name: parsed.data.name,
    deal_type: parsed.data.deal_type,
    deal_id: parsed.data.deal_id ?? null,
    floor_cpm: parsed.data.floor_cpm,
    max_cpm: parsed.data.max_cpm,
    daily_budget: parsed.data.daily_budget,
    total_budget: parsed.data.total_budget ?? null,
    pacing: parsed.data.pacing,
    frequency_cap: parsed.data.frequency_cap,
    frequency_cap_hours: parsed.data.frequency_cap_hours,
    creative_id: parsed.data.creative_id ?? null,
    audience_id: parsed.data.audience_id ?? null,
    targeting: parsed.data.targeting ?? {},
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date ?? null,
  };

  // TODO(M8-backend): insert into Supabase
  // const { data, error } = await supabase.from("rtb_campaigns").insert({
  //   workspace_id: session.workspace.id,
  //   ...input,
  // }).select().single();

  const now = new Date().toISOString();
  const newCampaign = {
    id: `rtb_${Date.now()}`,
    workspace_id: session.workspace.id,
    campaign_id: null,
    status: "draft" as const,
    impressions: 0,
    wins: 0,
    spend: 0,
    win_rate: null,
    avg_cpm: null,
    created_at: now,
    updated_at: now,
    ...input,
  };

  return NextResponse.json({ data: newCampaign }, { status: 201 });
}
