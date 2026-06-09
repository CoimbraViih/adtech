"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";
import { AssetUploader } from "@/components/creatives/asset-uploader";
import type { CreativeAsset } from "@/types/database";
import { cn } from "@/lib/utils";

const IAB_FORMATS = [
  { width: 300, height: 250, label: "300×250 (Medium Rectangle)" },
  { width: 728, height: 90,  label: "728×90 (Leaderboard)" },
  { width: 320, height: 50,  label: "320×50 (Mobile Banner)" },
  { width: 160, height: 600, label: "160×600 (Wide Skyscraper)" },
  { width: 300, height: 600, label: "300×600 (Half Page)" },
] as const;

type RtbAssetsSectionProps = {
  workspaceId: string;
  rtbCampaignId: string;
  initialAssets?: CreativeAsset[];
};

function formatLabel(asset: CreativeAsset): string {
  if (asset.width_px && asset.height_px) {
    const match = IAB_FORMATS.find(
      (f) => f.width === asset.width_px && f.height === asset.height_px
    );
    return match ? match.label : `${asset.width_px}×${asset.height_px}`;
  }
  return asset.filename ?? "Banner";
}

function groupByFormat(assets: CreativeAsset[]): Map<string, CreativeAsset[]> {
  const groups = new Map<string, CreativeAsset[]>();
  for (const asset of assets) {
    const key = asset.width_px && asset.height_px
      ? `${asset.width_px}x${asset.height_px}`
      : "outros";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(asset);
  }
  return groups;
}

export function RtbAssetsSection({
  workspaceId,
  rtbCampaignId,
  initialAssets = [],
}: RtbAssetsSectionProps) {
  const [assets, setAssets] = useState<CreativeAsset[]>(initialAssets);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleUploaded(asset: CreativeAsset) {
    setAssets((prev) => [asset, ...prev]);
  }

  async function handleDelete(assetId: string) {
    setDeletingId(assetId);
    try {
      const res = await fetch(`/api/creative-assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Erro ao remover");
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error("[rtb-assets] delete:", err);
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = groupByFormat(assets);

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-[color:var(--adflow-fg-muted)]" />
        <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          Banners display
        </h2>
      </div>

      {/* IAB format guide */}
      <div className="flex flex-wrap gap-1.5">
        {IAB_FORMATS.map((f) => {
          const key = `${f.width}x${f.height}`;
          const hasAssets = grouped.has(key);
          return (
            <span
              key={key}
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border transition-colors",
                hasAssets
                  ? "border-[color:var(--adflow-success)]/40 bg-[color:var(--adflow-success)]/10 text-[color:var(--adflow-success)]"
                  : "border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)] text-[color:var(--adflow-fg-muted)]"
              )}
            >
              {f.width}×{f.height}
            </span>
          );
        })}
      </div>

      {/* Uploader */}
      <AssetUploader
        workspaceId={workspaceId}
        rtbCampaignId={rtbCampaignId}
        initialAssets={[]}
        onUploaded={handleUploaded}
        allowedDimensions={IAB_FORMATS as unknown as Array<{ width: number; height: number; label: string }>}
      />

      {/* Grouped by format */}
      {grouped.size > 0 && (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([key, groupAssets]) => {
            const format = IAB_FORMATS.find((f) => `${f.width}x${f.height}` === key);
            const label = format ? format.label : key;
            return (
              <div key={key}>
                <p className="text-xs font-medium text-[color:var(--adflow-fg-muted)] mb-2">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {groupAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative rounded-lg overflow-hidden border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]"
                      style={{ width: 120, height: 80 }}
                      title={formatLabel(asset)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.public_url}
                        alt={asset.alt_text ?? asset.filename ?? "banner"}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleDelete(asset.id)}
                          disabled={deletingId === asset.id}
                          className="text-[10px] font-medium text-white bg-[color:var(--adflow-danger)] rounded px-2 py-0.5 hover:bg-[color:var(--adflow-danger)]/80 transition-colors disabled:opacity-50"
                        >
                          {deletingId === asset.id ? "..." : "Remover"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
