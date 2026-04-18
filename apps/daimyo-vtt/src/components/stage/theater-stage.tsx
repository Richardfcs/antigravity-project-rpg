import { ImageOff, Sparkles } from "lucide-react";

import { AssetAvatar } from "@/components/media/asset-avatar";
import { findSpotlightEntry, type SceneStageEntry } from "@/lib/scenes/selectors";
import { cn } from "@/lib/utils";
import type { SceneLayoutMode } from "@/types/scene";

interface TheaterStageProps {
  sceneName: string;
  moodLabel: string;
  layoutMode: SceneLayoutMode;
  backgroundUrl?: string | null;
  entries: SceneStageEntry[];
  compact?: boolean;
  viewMode?: "workspace" | "focus";
}

function getCardSize(count: number, compact: boolean) {
  if (count >= 12) {
    return compact ? "w-[90px]" : "w-[100px]";
  }

  if (count >= 8) {
    return compact ? "w-[110px]" : "w-[120px]";
  }

  if (count >= 5) {
    return compact ? "w-[130px]" : "w-[150px]";
  }

  return compact ? "w-[160px]" : "w-[180px]";
}

function getGridCols(count: number) {
  if (count >= 12) {
    return "grid-cols-4 sm:grid-cols-5 xl:grid-cols-6";
  }

  if (count >= 8) {
    return "grid-cols-3 sm:grid-cols-4 xl:grid-cols-5";
  }

  if (count >= 5) {
    return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
  }

  if (count >= 3) {
    return "grid-cols-2 sm:grid-cols-3";
  }

  return "grid-cols-1 sm:grid-cols-2";
}

function getArcOffset(index: number, total: number) {
  if (total <= 1) {
    return 0;
  }

  const center = (total - 1) / 2;
  const distance = Math.abs(index - center);
  return Math.round(distance * 18);
}

function CastCard({
  entry,
  isSpotlight,
  cardSize,
  compact,
  isFocus,
  style
}: {
  entry: SceneStageEntry;
  isSpotlight: boolean;
  cardSize: string;
  compact: boolean;
  isFocus: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <article
      key={entry.entry.id}
      className={cn(
        "group flex flex-col items-center transition-all duration-300",
        cardSize
      )}
      style={style}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl transition-all duration-300",
          isSpotlight &&
            "shadow-[0_0_24px_6px_rgba(251,191,36,0.22),0_0_60px_12px_rgba(251,191,36,0.08)]"
        )}
      >
        {isSpotlight && (
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-amber-300/30" />
        )}
        <AssetAvatar
          imageUrl={entry.asset?.secureUrl}
          label={entry.character.name}
          kind={entry.asset?.kind}
          className={cn(
            "w-full aspect-[3/4] rounded-2xl object-cover",
            isSpotlight && "brightness-110 saturate-[1.1]"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2.5 w-full truncate text-center font-semibold text-white/90 transition-colors",
          compact || isFocus ? "text-sm" : "text-base",
          isSpotlight && "text-amber-50"
        )}
      >
        {entry.character.name}
      </p>
    </article>
  );
}

export function TheaterStage({
  sceneName,
  moodLabel,
  layoutMode,
  backgroundUrl,
  entries,
  compact = false,
  viewMode = "workspace"
}: TheaterStageProps) {
  const spotlight = findSpotlightEntry(entries);
  const cardSize = getCardSize(entries.length, compact);
  const isFocus = viewMode === "focus";

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden rounded-[28px] bg-black">
      {backgroundUrl && (
        <>
          <div
            className="absolute inset-0 scale-110 bg-center bg-cover blur-2xl"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
          <div
            className="absolute inset-0 bg-center bg-cover opacity-50"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.22),rgba(2,6,23,0.78))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,168,70,0.10),transparent_30%),radial-gradient(circle_at_bottom,rgba(196,30,58,0.06),transparent_32%)]" />

      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col",
          compact || isFocus ? "p-4" : "p-5"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
            <Sparkles size={14} />
            palco narrativo
          </span>
          {!isFocus && (
            <>
              <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
                {sceneName}
              </span>
              <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                {moodLabel || "sem clima definido"}
              </span>
            </>
          )}
        </div>

        <div className={cn(
          "mt-4 flex-1 min-h-0 flex flex-col",
          layoutMode === "center" ? "justify-center" : "justify-end"
        )}>
          {entries.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] text-sm text-[color:var(--ink-2)]">
              Nenhum personagem foi escalado para esta cena ainda.
            </div>
          ) : layoutMode === "center" ? (
            <div className="flex h-full w-full flex-wrap items-center justify-center gap-3">
              {entries.map((entry) => (
                <CastCard
                  key={entry.entry.id}
                  entry={entry}
                  isSpotlight={spotlight?.entry.id === entry.entry.id}
                  cardSize={cardSize}
                  compact={compact}
                  isFocus={isFocus}
                />
              ))}
            </div>
          ) : layoutMode === "grid" ? (
            <div
              className={cn(
                "grid w-full content-end justify-items-center gap-3",
                getGridCols(entries.length)
              )}
            >
              {entries.map((entry) => (
                <CastCard
                  key={entry.entry.id}
                  entry={entry}
                  isSpotlight={spotlight?.entry.id === entry.entry.id}
                  cardSize={cardSize}
                  compact={compact}
                  isFocus={isFocus}
                />
              ))}
            </div>
          ) : (
            <div className="flex w-full flex-wrap items-end justify-center gap-3">
              {entries.map((entry, index) => {
                const arcOffset =
                  layoutMode === "arc" ? getArcOffset(index, entries.length) : 0;

                return (
                  <CastCard
                    key={entry.entry.id}
                    entry={entry}
                    isSpotlight={spotlight?.entry.id === entry.entry.id}
                    cardSize={cardSize}
                    compact={compact}
                    isFocus={isFocus}
                    style={
                      layoutMode === "arc"
                        ? { marginTop: `${arcOffset}px` }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {!backgroundUrl && !isFocus && (
          <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--ink-3)]">
            <ImageOff size={14} />
            fundo negro ativo, sem pintura de cena definida
          </div>
        )}
      </div>
    </div>
  );
}
