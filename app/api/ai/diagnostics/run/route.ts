import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runDiagnostics } from "@/lib/ai/diagnostics/engine";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { workspaceId, campaignId } = parsed.data;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (!membership || membership.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("organization_id")
    .eq("id", workspaceId)
    .single() as { data: { organization_id: string } | null; error: unknown };

  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const diagnostics = await runDiagnostics(workspaceId, workspace.organization_id, {
      campaignId,
    });
    return NextResponse.json({ diagnostics });
  } catch (err) {
    console.error("[diagnostics/run]", err);
    return NextResponse.json({ error: "Falha ao executar diagnósticos" }, { status: 500 });
  }
}
