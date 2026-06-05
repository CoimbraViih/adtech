import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import {
  uploadCreativeAsset,
  getAssetsByWorkspace,
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BYTES,
} from "@/lib/storage/creative-assets";

export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspace_id") ?? session.workspace.id;
  const creativeId = searchParams.get("creative_id") ?? undefined;
  const campaignId = searchParams.get("campaign_id") ?? undefined;
  const rtbCampaignId = searchParams.get("rtb_campaign_id") ?? undefined;

  const assets = await getAssetsByWorkspace(workspaceId, { creativeId, campaignId, rtbCampaignId });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo 'file' obrigatório" }, { status: 400 });
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo não suportado. Aceitos: ${ALLOWED_MIME_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Arquivo excede o limite de 10 MB" }, { status: 400 });
  }

  const workspaceId = (formData.get("workspace_id") as string | null) ?? session.workspace.id;
  const creativeId = (formData.get("creative_id") as string | null) ?? undefined;
  const campaignId = (formData.get("campaign_id") as string | null) ?? undefined;
  const rtbCampaignId = (formData.get("rtb_campaign_id") as string | null) ?? undefined;

  try {
    const asset = await uploadCreativeAsset(file, workspaceId, {
      creativeId,
      campaignId,
      rtbCampaignId,
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("[creative-assets] upload error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
