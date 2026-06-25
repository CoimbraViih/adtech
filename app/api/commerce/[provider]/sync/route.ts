import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { syncCommerceProvider } from "@/lib/commerce/sync";
import type { CommerceProvider } from "@/lib/commerce/types";

type RouteCtx = { params: Promise<{ provider: string }> };

const VALID = new Set<CommerceProvider>(["nuvemshop", "vtex", "shopify"]);

export async function POST(
  _request: NextRequest,
  { params }: RouteCtx
): Promise<NextResponse> {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { provider } = await params;
  if (!VALID.has(provider as CommerceProvider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  try {
    const result = await syncCommerceProvider(
      session.organization.id,
      provider as CommerceProvider
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[commerce/sync] ${provider}:`, err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
