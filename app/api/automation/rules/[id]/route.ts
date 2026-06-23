import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const patchRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  condition: z.enum(["roas_below", "cpa_above", "spend_above", "ctr_below", "conversions_below"]).optional(),
  threshold: z.number().finite().optional(),
  status: z.enum(["active", "paused"]).optional(),
  cooldown_minutes: z.number().int().min(1).optional(),
  campaign_id: z.string().uuid().nullable().optional(),
}).strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const parsed = patchRuleSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "body"}: ${first.message}` },
      { status: 422 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_rules")
    .update(parsed.data)
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from("alert_rules")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
