import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, requireServerSession } from "@/lib/supabase/server";
import type { PmpDeal, PmpDealCreateInput } from "@/types/database";

const PmpDealCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  deal_id: z.string().min(1),
  deal_name: z.string().min(1),
  deal_type: z.enum(["private", "preferred", "guaranteed"]),
  floor_price: z.number().min(0),
  publisher_name: z.string().optional().nullable(),
  wseat: z.array(z.string()).optional().nullable(),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
});

// GET /api/rtb/deals?workspace_id=<uuid>[&include_expired=true]
export async function GET(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
  }

  const includeExpired = searchParams.get("include_expired") === "true";

  const supabase = await createServerSupabaseClient();

  // Verify the authenticated user is a member of this workspace
  const { data: wsMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!wsMember) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let query = supabase
    .from("pmp_deals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (!includeExpired) {
    query = query.neq("status", "expired");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[rtb/deals/GET]", error.message);
    return NextResponse.json({ error: "Erro ao buscar deals." }, { status: 500 });
  }

  return NextResponse.json({ deals: (data ?? []) as PmpDeal[] });
}

// POST /api/rtb/deals — create a new PMP deal
export async function POST(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = PmpDealCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  const { workspace_id, ...dealFields } = parsed.data;

  // Verify the authenticated user is owner/admin of the org that owns the workspace
  const supabase = await createServerSupabaseClient();

  const { data: wsMember } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspace_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!wsMember || !["owner", "admin"].includes(wsMember.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const input: PmpDealCreateInput = {
    deal_id: dealFields.deal_id,
    deal_name: dealFields.deal_name,
    deal_type: dealFields.deal_type,
    floor_price: dealFields.floor_price,
    publisher_name: dealFields.publisher_name ?? null,
    status: "active",
    wseat: dealFields.wseat ?? null,
    start_date: dealFields.start_date ?? null,
    end_date: dealFields.end_date ?? null,
  };

  const { data, error } = await supabase
    .from("pmp_deals")
    .insert({ workspace_id, ...input })
    .select()
    .single();

  if (error) {
    console.error("[rtb/deals/POST]", error.message);
    if (error.code === "42501") {
      return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao criar deal." }, { status: 500 });
  }

  return NextResponse.json({ deal: data as PmpDeal }, { status: 201 });
}
