import { ImageOff } from "lucide-react";

import type { AssetKind } from "@/types/asset";
import { cn } from "@/lib/utils";

interface AssetAvatarProps {
  imageUrl?: string | null;
  label: string;
  kind?: AssetKind | null;
  className?: string;
}

function cloudinaryThumb(url: string | null | undefined, size = 128): string | undefined {
  if (!url) return undefined;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}

export function AssetAvatar({
  imageUrl,
  label,
  kind,
  className
}: AssetAvatarProps) {
  if (imageUrl) {
    const objectFitClass =
      kind === "background" || kind === "map"
        ? "object-cover object-center"
        : kind === "token"
          ? "object-cover object-[center_18%]"
          : "object-cover object-top";

    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]",
          className
        )}
      >
        <img
          src={cloudinaryThumb(imageUrl, 128)}
          alt={label}
          loading="lazy"
          decoding="async"
          className={cn("h-full w-full", objectFitClass)}
        />
      </div>
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
