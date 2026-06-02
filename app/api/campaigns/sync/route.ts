import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageCampaigns } from "@/lib/auth/roles";
import { syncCampaignsFromPlatform } from "@/lib/campaigns/sync";
import { z } from "zod";

const VALID_PLATFORMS = ["meta", "google", "tiktok", "linkedin"] as const;
type SyncPlatform = (typeof VALID_PLATFORMS)[number];

const syncBodySchema = z.object({
  platform: z.enum(VALID_PLATFORMS),
  workspaceId: z.string().min(1, "workspaceId is required"),
});

// POST /api/campaigns/sync
// Body: { platform: 'meta' | 'google' | 'tiktok' | 'linkedin', workspaceId: string }
// Auth: requireServerSession() — member+ RBAC
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageCampaigns(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = syncBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 400 }
    );
  }

  const { platform, workspaceId } = parsed.data;

  // ── Workspace ownership guard ─────────────────────────────────────────────
  // The session workspace must match the requested workspaceId to prevent
  // cross-workspace IDOR. For superadmin the check is bypassed.
  if (session.role !== "superadmin" && session.workspace.id !== workspaceId) {
    return NextResponse.json(
      { error: "Sem permissão para este workspace." },
      { status: 403 }
    );
  }

  // ── Run sync for all platforms, filter to requested one ───────────────────
  let results: { platform: string; synced: number; error: string | null }[];
  try {
    results = await syncCampaignsFromPlatform(workspaceId, session.organization.id);
  } catch (err) {
    console.error("[api/campaigns/sync] syncCampaignsFromPlatform threw:", err);
    return NextResponse.json(
      { error: "Erro interno ao sincronizar campanhas." },
      { status: 500 }
    );
  }

  const match = results.find((r) => r.platform === platform);

  // If the platform had no credentials configured, syncCampaignsFromPlatform
  // simply omits it from the results array — treat that as 0 / no-op.
  const syncedPlatform: SyncPlatform = platform;
  const synced = match?.synced ?? 0;
  const error = match?.error ?? null;

  return NextResponse.json(
    { platform: syncedPlatform, synced, error },
    { status: 200 }
  );
}
