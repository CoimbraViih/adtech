import { NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/automation/rules";

export async function POST(
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

  // Verify ownership before marking read
  const supabase = await createServerSupabaseClient();
  const { data: notification } = await supabase
    .from("alert_notifications")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
