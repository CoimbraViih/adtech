import type { CreativeAsset } from "@/types/database";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export { ALLOWED_MIME_TYPES, MAX_SIZE_BYTES };

type UploadOpts = {
  creativeId?: string;
  campaignId?: string;
  rtbCampaignId?: string;
};

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] ?? "bin";
}

function generatePath(workspaceId: string, mimeType: string): string {
  const uuid = crypto.randomUUID();
  const ext = getExtension(mimeType);
  return `${workspaceId}/${uuid}.${ext}`;
}

// TODO(M15-backend): replace stubs with real Supabase Storage + DB calls

export async function uploadCreativeAsset(
  file: File,
  workspaceId: string,
  opts: UploadOpts = {}
): Promise<CreativeAsset> {
  const storagePath = generatePath(workspaceId, file.type);

  // TODO(M15-backend): upload to Supabase Storage bucket "creative-assets"
  // const supabase = createServiceRoleClient();
  // const { error: storageError } = await supabase.storage
  //   .from("creative-assets")
  //   .upload(storagePath, file, { contentType: file.type });
  // if (storageError) throw new Error(storageError.message);
  //
  // const { data: { publicUrl } } = supabase.storage
  //   .from("creative-assets")
  //   .getPublicUrl(storagePath);
  //
  // const { data, error } = await supabase
  //   .from("creative_assets")
  //   .insert({ workspace_id: workspaceId, storage_path: storagePath, public_url: publicUrl, ... })
  //   .select()
  //   .single();
  // if (error) throw new Error(error.message);
  // return data;

  const publicUrl = `https://placeholder.supabase.co/storage/v1/object/public/creative-assets/${storagePath}`;
  return {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    creative_id: opts.creativeId ?? null,
    campaign_id: opts.campaignId ?? null,
    rtb_campaign_id: opts.rtbCampaignId ?? null,
    storage_path: storagePath,
    public_url: publicUrl,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    width_px: null,
    height_px: null,
    alt_text: null,
    created_at: new Date().toISOString(),
  };
}

export async function deleteCreativeAsset(id: string): Promise<void> {
  // TODO(M15-backend): delete from Supabase Storage + DB
  // const supabase = createServiceRoleClient();
  // const { data: asset } = await supabase.from("creative_assets").select("storage_path").eq("id", id).single();
  // if (asset) await supabase.storage.from("creative-assets").remove([asset.storage_path]);
  // await supabase.from("creative_assets").delete().eq("id", id);
  void id;
}

export async function getAssetsByCreative(creativeId: string): Promise<CreativeAsset[]> {
  // TODO(M15-backend): query Supabase
  // const supabase = createServiceRoleClient();
  // const { data } = await supabase.from("creative_assets").select("*").eq("creative_id", creativeId).order("created_at", { ascending: false });
  // return data ?? [];
  void creativeId;
  return [];
}

export async function getAssetsByCampaign(campaignId: string): Promise<CreativeAsset[]> {
  // TODO(M15-backend): query Supabase
  void campaignId;
  return [];
}

export async function getAssetsByRtbCampaign(rtbCampaignId: string): Promise<CreativeAsset[]> {
  // TODO(M15-backend): query Supabase
  void rtbCampaignId;
  return [];
}

export async function getAssetsByWorkspace(
  workspaceId: string,
  filters: { creativeId?: string; campaignId?: string; rtbCampaignId?: string } = {}
): Promise<CreativeAsset[]> {
  // TODO(M15-backend): query Supabase with optional filters
  void workspaceId;
  void filters;
  return [];
}
