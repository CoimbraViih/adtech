"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { AssetUploader } from "@/components/creatives/asset-uploader";
import type { CreativeAsset } from "@/types/database";

type CampaignAssetsSectionProps = {
  workspaceId: string;
  campaignId: string;
  initialAssets?: CreativeAsset[];
};

export function CampaignAssetsSection({
  workspaceId,
  campaignId,
  initialAssets = [],
}: CampaignAssetsSectionProps) {
  const [count, setCount] = useState(initialAssets.length);

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Images className="w-4 h-4 text-[color:var(--adflow-fg-muted)]" />
        <h2 className="text-xs font-semibold text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          Imagens da campanha
          {count > 0 && (
            <span className="ml-2 font-mono normal-case text-[color:var(--adflow-fg-muted)]">
              ({count})
            </span>
          )}
        </h2>
      </div>
      <AssetUploader
        workspaceId={workspaceId}
        campaignId={campaignId}
        initialAssets={initialAssets}
        onUploaded={() => setCount((n) => n + 1)}
        onDeleted={() => setCount((n) => Math.max(0, n - 1))}
      />
    </div>
  );
}
