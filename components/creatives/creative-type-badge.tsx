import { cn } from "@/lib/utils";
import { FileText, Image, Video } from "lucide-react";
import type { CreativeType } from "@/types/database";

const TYPE_CONFIG: Record<
  CreativeType,
  { label: string; icon: React.ComponentType<{ className?: string }>; classes: string }
> = {
  copy: {
    label: "Copy",
    icon: FileText,
    classes:
      "bg-[color:var(--adflow-data)]/15 text-[color:var(--adflow-data)] border-[color:var(--adflow-data)]/30",
  },
  banner: {
    label: "Banner",
    icon: Image,
    classes:
      "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  video: {
    label: "Vídeo",
    icon: Video,
    classes:
      "bg-[color:var(--adflow-accent)]/15 text-[color:var(--adflow-accent)] border-[color:var(--adflow-accent)]/30",
  },
};

type CreativeTypeBadgeProps = {
  type: CreativeType;
  className?: string;
};

export function CreativeTypeBadge({ type, className }: CreativeTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.classes,
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {config.label}
    </span>
  );
}

export const CREATIVE_TYPE_LABEL: Record<CreativeType, string> = {
  copy: "Copy",
  banner: "Banner",
  video: "Vídeo",
};
