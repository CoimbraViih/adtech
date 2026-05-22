import { cn } from "@/lib/utils";
import type { CampaignPlatform } from "@/types/database";

type SvgProps = { className?: string; style?: React.CSSProperties };

// Meta (Facebook/Instagram) wordmark SVG
function MetaIcon({ className, style }: SvgProps) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={style}
      aria-label="Meta"
    >
      <rect width="60" height="60" rx="10" fill="#1877F2" />
      <path
        d="M30 12C20.06 12 12 20.06 12 30c0 8.84 6.48 16.17 14.96 17.57V35.06h-4.5V30h4.5v-3.9c0-4.44 2.64-6.9 6.7-6.9 1.94 0 3.96.35 3.96.35v4.36h-2.23c-2.2 0-2.88 1.36-2.88 2.76V30h4.9l-.78 5.06H32.5v12.51C40.98 46.07 48 38.8 48 30c0-9.94-8.06-18-18-18z"
        fill="white"
      />
    </svg>
  );
}

// Google Ads "G" logo SVG
function GoogleIcon({ className, style }: SvgProps) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={style}
      aria-label="Google"
    >
      <rect width="60" height="60" rx="10" fill="white" />
      <path
        d="M44.5 30.5c0-1.1-.1-2.15-.28-3.17H30v6h8.12a6.93 6.93 0 01-3 4.54v3.77h4.84C42.63 38.92 44.5 35.04 44.5 30.5z"
        fill="#4285F4"
      />
      <path
        d="M30 46c4.08 0 7.5-1.35 10-3.66l-4.84-3.77c-1.35.9-3.06 1.43-5.16 1.43-3.97 0-7.33-2.68-8.53-6.28H16.5v3.9C19 42.6 24.1 46 30 46z"
        fill="#34A853"
      />
      <path
        d="M21.47 33.72A9.1 9.1 0 0121 30.5c0-1.12.19-2.2.47-3.22v-3.9H16.5A16 16 0 0015 30.5c0 2.58.62 5.01 1.5 7.12l4.97-3.9z"
        fill="#FBBC05"
      />
      <path
        d="M30 21a9.66 9.66 0 016.84 2.67l5.1-5.1C38.5 15.68 34.6 14 30 14c-5.9 0-11 3.4-13.5 8.38l4.97 3.9C22.67 23.68 26.03 21 30 21z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Programmatic / DSP icon
function ProgrammaticIcon({ className, style }: SvgProps) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={style}
      aria-label="Programático"
    >
      <rect width="60" height="60" rx="10" fill="#8B5CF6" />
      <path
        d="M20 38l6-16 4 10 4-6 6 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="20" r="3" fill="white" opacity="0.8" />
    </svg>
  );
}

const PLATFORM_LABEL: Record<CampaignPlatform, string> = {
  meta: "Meta",
  google: "Google",
  programmatic: "Programático",
};

type PlatformIconProps = {
  platform: CampaignPlatform;
  size?: number;
  showLabel?: boolean;
  className?: string;
};

export function PlatformIcon({
  platform,
  size = 20,
  showLabel = false,
  className,
}: PlatformIconProps) {
  const iconClass = cn(className);

  const sizeStyle = { width: size, height: size, flexShrink: 0 } as const;

  const icon =
    platform === "meta" ? (
      <MetaIcon className={iconClass} style={sizeStyle} />
    ) : platform === "google" ? (
      <GoogleIcon className={iconClass} style={sizeStyle} />
    ) : (
      <ProgrammaticIcon className={iconClass} style={sizeStyle} />
    );

  if (!showLabel) return icon;

  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="text-sm text-[color:var(--adflow-fg)]">
        {PLATFORM_LABEL[platform]}
      </span>
    </span>
  );
}

export { PLATFORM_LABEL };
