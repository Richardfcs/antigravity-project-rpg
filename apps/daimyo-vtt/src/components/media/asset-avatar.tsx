import { ImageOff } from "lucide-react";

import type { AssetKind } from "@/types/asset";
import { cn } from "@/lib/utils";

interface AssetAvatarProps {
  imageUrl?: string | null;
  label: string;
  kind?: AssetKind | null;
  className?: string;
}

export function AssetAvatar({
  imageUrl,
  label,
  kind,
  className
}: AssetAvatarProps) {
  const fitClass =
    kind === "background" || kind === "map"
      ? "bg-cover bg-center"
      : kind === "token"
        ? "bg-cover bg-[center_18%]"
        : "bg-cover bg-top";

  if (imageUrl) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]",
          fitClass,
          className
        )}
        role="img"
        aria-label={label}
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white",
        className
      )}
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-1">
        <ImageOff size={16} className="text-[color:var(--ink-3)]" />
        <span className="text-xs font-semibold">{label.slice(0, 2).toUpperCase()}</span>
      </div>
    </div>
  );
}
