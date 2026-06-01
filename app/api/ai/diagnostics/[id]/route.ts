import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DiagnosticStatus } from "@/types/database";

const bodySchema = z.object({
  status: z.enum(["acknowledged", "applied", "dismissed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const { data: diagnostic } = await supabase
    .from("ai_diagnostics")
    .select("workspace_id")
    .eq("id", id)
    .single() as { data: { workspace_id: string } | null; error: unknown };

  if (!diagnostic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", diagnostic.workspace_id)
    .eq("user_id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("ai_diagnostics")
    .update({ status: parsed.data.status as DiagnosticStatus })
    .eq("id", id)
    .select()
    .single() as { data: unknown; error: unknown };

  if (error) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
  return NextResponse.json({ diagnostic: updated });
}
