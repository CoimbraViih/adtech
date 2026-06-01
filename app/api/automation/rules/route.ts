import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchAllRules } from "@/lib/automation/rules";

const createRuleSchema = z.object({
  campaign_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  condition: z.enum(["roas_below", "cpa_above", "spend_above", "ctr_below", "conversions_below"]),
  threshold: z.number().finite(),
  cooldown_minutes: z.number().int().min(1).optional(),
});

export async function GET(request: Request) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  // Reject requests for workspaces the session user doesn't own
  if (workspaceId !== session.workspace.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rules = await fetchAllRules(workspaceId);
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "body"}: ${first.message}` },
      { status: 422 }
    );
  }

  // Always derive workspace_id from the authenticated session — never trust body
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("alert_rules").insert({
    workspace_id: session.workspace.id,
    campaign_id: parsed.data.campaign_id ?? null,
    name: parsed.data.name,
    condition: parsed.data.condition,
    threshold: parsed.data.threshold,
    cooldown_minutes: parsed.data.cooldown_minutes ?? 60,
    status: "active",
  }).select().single();

  if (error) return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
