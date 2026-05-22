import Link from "next/link";
import Image from "next/image";
import { FileText, Image as ImageIcon, Video, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Creative, CreativeStatus } from "@/types/database";
import { CreativeTypeBadge } from "./creative-type-badge";
import { CreativeScore } from "./creative-score";
import { StatusBadge } from "@/components/campaigns/status-badge";

// Re-use StatusBadge which already handles in_review / approved / draft / rejected
// We just need to cast CreativeStatus to the union type it accepts
type AnyStatus = Parameters<typeof StatusBadge>[0]["status"];

type CreativeCardProps = {
  creative: Creative;
  campaignName?: string | null;
};

function Thumbnail({ creative }: { creative: Creative }) {
  if (creative.thumbnail_url || creative.asset_url) {
    const src = creative.thumbnail_url ?? creative.asset_url!;
    const isVideo = creative.type === "video";
    return (
      <div className="relative w-full aspect-video bg-[color:var(--adflow-border)] rounded-lg overflow-hidden flex items-center justify-center">
        <Image
          src={src}
          alt={creative.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Video className="w-8 h-8 text-white" />
          </div>
        )}
      </div>
    );
  }

  const Icon = creative.type === "copy" ? FileText : creative.type === "banner" ? ImageIcon : Video;

  return (
    <div className="w-full aspect-video bg-[color:var(--adflow-border)] rounded-lg flex flex-col items-center justify-center gap-2">
      <Icon className="w-8 h-8 text-[color:var(--adflow-fg-muted)]" />
      {creative.type === "copy" && creative.headline && (
        <p className="text-xs text-[color:var(--adflow-fg-muted)] px-4 text-center line-clamp-2">
          {creative.headline}
        </p>
      )}
    </div>
  );
}

export function CreativeCard({ creative, campaignName }: CreativeCardProps) {
  return (
    <Link
      href={`/creatives/${creative.id}`}
      className={cn(
        "group block rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]",
        "hover:border-[color:var(--adflow-fg-muted)]/50 transition-colors overflow-hidden"
      )}
    >
      <Thumbnail creative={creative} />

      <div className="p-3 space-y-2.5">
        {/* Name + link icon */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[color:var(--adflow-fg)] line-clamp-1">
            {creative.name}
          </p>
          <ExternalLink className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <CreativeTypeBadge type={creative.type} />
          <StatusBadge status={creative.status as AnyStatus} />
        </div>

        {/* Score + campaign */}
        <div className="flex items-center justify-between">
          {creative.score !== null ? (
            <div className="flex items-center gap-1.5">
              <CreativeScore score={creative.score} size="sm" />
              <span className="text-xs text-[color:var(--adflow-fg-muted)]">score</span>
            </div>
          ) : (
            <span className="text-xs text-[color:var(--adflow-fg-muted)]">Sem score</span>
          )}

          {campaignName && (
            <span className="text-xs text-[color:var(--adflow-fg-muted)] truncate max-w-[120px]">
              {campaignName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
