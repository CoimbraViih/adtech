"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreativeAsset } from "@/types/database";
import { ALLOWED_MIME_TYPES, MAX_SIZE_BYTES } from "@/lib/storage/creative-assets";

type AssetUploaderProps = {
  workspaceId: string;
  creativeId?: string;
  campaignId?: string;
  rtbCampaignId?: string;
  initialAssets?: CreativeAsset[];
  onUploaded?: (asset: CreativeAsset) => void;
  onDeleted?: (id: string) => void;
  allowedDimensions?: Array<{ width: number; height: number; label: string }>;
};

type UploadingFile = {
  id: string;
  name: string;
  previewUrl: string;
  progress: number;
  error: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetUploader({
  workspaceId,
  creativeId,
  campaignId,
  rtbCampaignId,
  initialAssets = [],
  onUploaded,
  onDeleted,
  allowedDimensions,
}: AssetUploaderProps) {
  const [assets, setAssets] = useState<CreativeAsset[]>(initialAssets);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newUploads: UploadingFile[] = acceptedFiles.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        previewUrl: URL.createObjectURL(f),
        progress: 0,
        error: null,
      }));

      setUploading((prev) => [...prev, ...newUploads]);

      await Promise.all(
        acceptedFiles.map(async (file, idx) => {
          const uploadId = newUploads[idx].id;

          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("workspace_id", workspaceId);
            if (creativeId) formData.append("creative_id", creativeId);
            if (campaignId) formData.append("campaign_id", campaignId);
            if (rtbCampaignId) formData.append("rtb_campaign_id", rtbCampaignId);

            // Use XMLHttpRequest for progress tracking
            const asset = await new Promise<CreativeAsset>((resolve, reject) => {
              const xhr = new XMLHttpRequest();

              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const pct = Math.round((e.loaded / e.total) * 90);
                  setUploading((prev) =>
                    prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u))
                  );
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve(JSON.parse(xhr.responseText) as CreativeAsset);
                } else {
                  const body = JSON.parse(xhr.responseText) as { error?: string };
                  reject(new Error(body.error ?? "Erro no upload"));
                }
              };

              xhr.onerror = () => reject(new Error("Erro de rede"));
              xhr.open("POST", "/api/creative-assets");
              xhr.send(formData);
            });

            setUploading((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, progress: 100 } : u))
            );

            setTimeout(() => {
              setUploading((prev) => {
                const u = prev.find((x) => x.id === uploadId);
                if (u) URL.revokeObjectURL(u.previewUrl);
                return prev.filter((x) => x.id !== uploadId);
              });
              setAssets((prev) => [asset, ...prev]);
              onUploaded?.(asset);
            }, 400);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Falha no upload";
            setUploading((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, error: message } : u))
            );
          }
        })
      );
    },
    [workspaceId, creativeId, campaignId, rtbCampaignId, onUploaded]
  );

  async function handleDelete(assetId: string) {
    setDeletingId(assetId);
    try {
      const res = await fetch(`/api/creative-assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Erro ao remover");
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      onDeleted?.(assetId);
    } catch (err) {
      console.error("[asset-uploader] delete:", err);
    } finally {
      setDeletingId(null);
    }
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALLOWED_MIME_TYPES.map((t) => [t, []])),
    maxSize: MAX_SIZE_BYTES,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed",
          "px-6 py-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/5"
            : "border-[color:var(--adflow-border)] hover:border-[color:var(--adflow-accent)]/50 bg-[color:var(--adflow-base)]"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-10 h-10 rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] flex items-center justify-center">
          <Upload className="w-5 h-5 text-[color:var(--adflow-fg-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">
            {isDragActive ? "Solte os arquivos aqui" : "Arraste imagens ou clique para selecionar"}
          </p>
          <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
            JPEG, PNG, WebP ou GIF — máx. 10 MB por arquivo
          </p>
          {allowedDimensions && (
            <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
              Formatos IAB: {allowedDimensions.map((d) => d.label).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Rejection errors */}
      {fileRejections.length > 0 && (
        <ul className="space-y-1">
          {fileRejections.map(({ file, errors }) => (
            <li
              key={file.name}
              className="text-xs text-[color:var(--adflow-danger)] bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30 rounded-lg px-3 py-2"
            >
              <span className="font-medium">{file.name}</span>:{" "}
              {errors.map((e) => e.message).join(", ")}
            </li>
          ))}
        </ul>
      )}

      {/* In-progress uploads */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-3"
            >
              <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-[color:var(--adflow-base)]">
                {/* blob: URL — next/image cannot optimize local object URLs */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.previewUrl} alt={u.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[color:var(--adflow-fg)] truncate">{u.name}</p>
                {u.error ? (
                  <p className="text-xs text-[color:var(--adflow-danger)]">{u.error}</p>
                ) : (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[color:var(--adflow-border)]">
                    <div
                      className="h-1 rounded-full bg-[color:var(--adflow-accent)] transition-all duration-200"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {!u.error && u.progress < 100 && (
                <Loader2 className="w-4 h-4 text-[color:var(--adflow-fg-muted)] animate-spin shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded assets gallery */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative aspect-square rounded-lg overflow-hidden border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]"
            >
              <Image
                src={asset.public_url}
                alt={asset.alt_text ?? asset.filename ?? "asset"}
                fill
                className="object-cover"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                <p className="text-[10px] text-white text-center truncate w-full">
                  {asset.filename}
                </p>
                {asset.size_bytes && (
                  <p className="text-[10px] text-white/70">{formatBytes(asset.size_bytes)}</p>
                )}
                {asset.width_px && asset.height_px && (
                  <p className="text-[10px] text-white/70">
                    {asset.width_px}×{asset.height_px}
                  </p>
                )}
                <button
                  onClick={() => handleDelete(asset.id)}
                  disabled={deletingId === asset.id}
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                    "bg-[color:var(--adflow-danger)] text-white hover:bg-[color:var(--adflow-danger)]/80",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {deletingId === asset.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && uploading.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-[color:var(--adflow-fg-muted)]">
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Nenhum asset enviado ainda.</span>
        </div>
      )}
    </div>
  );
}
