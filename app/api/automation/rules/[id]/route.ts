import { NextResponse } from "next/server";
import { z } from "zod";
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
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { data, error } = await supabase
    .from("alert_rules")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
