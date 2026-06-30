// app/api/rtb/audiences/rebuild/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildAudienceMemberships } from "@/lib/rtb/dmp";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).workspace_id !== "string"
  ) {
    return NextResponse.json({ error: "workspace_id is required." }, { status: 400 });
  }

  const workspaceId = (body as { workspace_id: string }).workspace_id;

  // Verificar que o usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const result = await buildAudienceMemberships(workspaceId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rtb/audiences/rebuild] error:", err);
    return NextResponse.json({ error: "Rebuild failed." }, { status: 500 });
  }
}
