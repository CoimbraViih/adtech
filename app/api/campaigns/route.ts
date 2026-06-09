import { NextRequest, NextResponse } from "next/server";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageCampaigns } from "@/lib/auth/roles";
import { syncCampaignsFromPlatform } from "@/lib/campaigns/sync";
import { createCampaignOnPlatform } from "@/lib/campaigns/platform";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { z } from "zod";
import type { CampaignCreateInput } from "@/types/database";

const campaignCreateLimiter = createRateLimiter("campaign-create", 20, 60 * 60 * 1000);

const createSchema = z.object({
  name: z.string().min(3).max(255),
  platform: z.enum(["meta", "google", "tiktok", "linkedin", "programmatic"]),
  objective: z.enum(["awareness", "traffic", "engagement", "leads", "sales", "app_promotion"]),
  daily_budget: z.number().min(1),
  lifetime_budget: z.number().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  targeting: z.object({
    age_min: z.number().optional(),
    age_max: z.number().optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    custom_audiences: z.array(z.string()).optional(),
  }).optional(),
});

// GET /api/campaigns — list campaigns for the current workspace
export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");
  const sync = searchParams.get("sync") === "true";

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("workspace_id", session.workspace.id);

  if (platform) query = query.eq("platform", platform);
  if (status) query = query.eq("status", status);

  const { data: campaigns, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[campaigns/list]", error.message);
    return NextResponse.json({ error: "Erro ao buscar campanhas." }, { status: 500 });
  }

  if (sync) {
    try {
      await syncCampaignsFromPlatform(session.workspace.id, session.organization.id);
    } catch (err) {
      console.error("[campaigns/sync] error:", (err as Error).message);
    }
  }

  return NextResponse.json(campaigns ?? []);
}

// POST /api/campaigns — create a new campaign
export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageCampaigns(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  if (campaignCreateLimiter(session.workspace.id)) {
    return NextResponse.json(
      { error: "Limite de criação de campanhas atingido. Tente novamente em 1 hora." },
      { status: 429 }
    );
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

  const input: CampaignCreateInput = {
    name: parsed.data.name,
    platform: parsed.data.platform,
    objective: parsed.data.objective,
    daily_budget: parsed.data.daily_budget,
    lifetime_budget: parsed.data.lifetime_budget ?? null,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date ?? null,
    targeting: parsed.data.targeting,
  };

  let externalId: string | null = null;
  if (input.platform !== "programmatic") {
    try {
      externalId = await createCampaignOnPlatform(session.organization.id, input);
    } catch (err) {
      console.error(`[campaigns/create] platform error:`, err);
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      workspace_id: session.workspace.id,
      external_id: externalId,
      status: "draft",
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      cpa: null,
      roas: null,
      ctr: null,
      cpc: null,
      ...input,
    })
    .select()
    .single();

  if (error) {
    console.error("[campaigns/create]", error.message);
    return NextResponse.json({ error: "Erro ao criar campanha." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
