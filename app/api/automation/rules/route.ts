import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchAllRules } from "@/lib/automation/rules";
import type { AlertRuleCreateInput } from "@/types/database";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  try {
    const rules = await fetchAllRules(workspaceId);
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = body as AlertRuleCreateInput;
  if (!input.workspace_id || !input.name || !input.condition || input.threshold === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase.from("alert_rules").insert({
    workspace_id: input.workspace_id,
    campaign_id: input.campaign_id ?? null,
    name: input.name,
    condition: input.condition,
    threshold: input.threshold,
    cooldown_minutes: input.cooldown_minutes ?? 60,
    status: "active",
  }).select().single();

  if (error) return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
