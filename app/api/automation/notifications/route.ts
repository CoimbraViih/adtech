import { NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { fetchUnreadNotifications } from "@/lib/automation/rules";

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
    const notifications = await fetchUnreadNotifications(workspaceId);
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
