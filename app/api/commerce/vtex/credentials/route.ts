import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { upsertCredentials } from "@/lib/integrations/credentials";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    apiKey?: string;
    apiToken?: string;
    accountName?: string;
  };
  const { apiKey, apiToken, accountName } = body;

  if (!apiKey || !apiToken || !accountName) {
    return NextResponse.json(
      { error: "apiKey, apiToken, and accountName are required" },
      { status: 400 }
    );
  }

  try {
    await upsertCredentials(session.organization.id, "vtex", {
      app_key: apiKey,
      app_token: apiToken,
      account_name: accountName,
    });

    const supabase = createServiceClient();
    await supabase.from("product_catalogs").upsert(
      {
        organization_id: session.organization.id,
        workspace_id: session.workspace.id,
        provider: "vtex",
        external_store_id: accountName,
        store_name: accountName,
      },
      { onConflict: "organization_id,provider" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vtex/credentials] save failed:", (err as Error).message);
    return NextResponse.json({ error: "Falha ao salvar credenciais" }, { status: 500 });
  }
}
