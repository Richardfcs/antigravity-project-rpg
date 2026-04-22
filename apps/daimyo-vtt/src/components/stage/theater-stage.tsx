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

function getCardSize(count: number, compact: boolean, isFocus: boolean) {
  if (count >= 12) {
    return compact ? "w-[104px]" : isFocus ? "w-[142px]" : "w-[124px]";
  }

  if (count >= 8) {
    return compact ? "w-[122px]" : isFocus ? "w-[162px]" : "w-[144px]";
  }

  if (count >= 5) {
    return compact ? "w-[146px]" : isFocus ? "w-[190px]" : "w-[172px]";
  }

  return compact ? "w-[176px]" : isFocus ? "w-[226px]" : "w-[208px]";
}

function getArcOffset(index: number, total: number) {
  if (total <= 1) {
    return 0;
  }

  const center = (total - 1) / 2;
  const distance = Math.abs(index - center);
  return Math.round(distance * 20);
}

function buildCardStyle(input: {
  index: number;
  total: number;
  layoutMode: SceneLayoutMode;
  isSpotlight: boolean;
}) {
  const arcOffset = input.layoutMode === "arc" ? getArcOffset(input.index, input.total) : 0;
  const spotlightLift = input.isSpotlight ? -10 : 0;
  const spotlightScale = input.isSpotlight ? 1.045 : 1;

  return {
    transform: `translateY(${spotlightLift}px) scale(${spotlightScale})`,
    marginTop: input.layoutMode === "arc" ? `${arcOffset}px` : undefined
  } satisfies React.CSSProperties;
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
        "group relative flex flex-col items-center transition-all duration-500",
        cardSize
      )}
      style={style}
    >
      {isSpotlight ? (
        <div className="pointer-events-none absolute inset-x-5 top-3 z-0 h-24 rounded-full bg-amber-200/18 blur-[36px]" />
      ) : null}

      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-[28px] border border-white/8 bg-black/30 shadow-[0_24px_80px_rgba(0,0,0,0.34)] transition-all duration-500",
          isSpotlight &&
            "border-amber-200/28 shadow-[0_0_24px_rgba(212,168,70,0.22),0_28px_90px_rgba(0,0,0,0.44)]"
        )}
      >
        <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,transparent_18%,rgba(2,6,23,0.08)_50%,rgba(2,6,23,0.36)_100%)]" />
        {isSpotlight ? (
          <div className="pointer-events-none absolute inset-0 z-20 rounded-[28px] ring-1 ring-amber-200/28" />
        ) : null}

        <AssetAvatar
          imageUrl={entry.asset?.secureUrl}
          label={entry.character.name}
          kind={entry.asset?.kind}
          className={cn(
            "aspect-[4/5] w-full rounded-[28px] object-cover object-top",
            isSpotlight && "brightness-[1.08] saturate-[1.08]"
          )}
        />

        <div className="absolute inset-x-0 bottom-0 z-20 p-3">
          <div className="rounded-[18px] border border-white/10 bg-black/42 px-3 py-2 backdrop-blur-xl">
            <p
              className={cn(
                "truncate text-center font-semibold tracking-[0.01em] text-white",
                compact || isFocus ? "text-sm" : "text-base",
                isSpotlight && "text-amber-50"
              )}
            >
              {entry.character.name}
            </p>
          </div>
        </div>
      </div>
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
  const isFocus = viewMode === "focus";
  const cardSize = getCardSize(entries.length, compact, isFocus);

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden rounded-[30px] bg-black">
      {backgroundUrl ? (
        <>
          <div
            className="absolute inset-0 scale-[1.06] bg-cover bg-center blur-[24px]"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center opacity-58"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
        </>
      ) : null}

      <div className="daimyo-stage-grain absolute inset-0" />
      <div className="daimyo-stage-aura absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.4)_42%,rgba(2,6,23,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,168,70,0.16),transparent_26%),radial-gradient(circle_at_bottom,rgba(196,30,58,0.1),transparent_34%)]" />
      <div className="daimyo-stage-fog absolute inset-x-0 bottom-0 h-[42%]" />

      <div
        className={cn(
          "relative z-10 flex h-full min-h-0 w-full flex-col",
          compact || isFocus ? "px-4 pb-4 pt-4" : "px-5 pb-5 pt-4"
        )}
      >
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="hud-chip border-amber-300/24 bg-amber-300/10 text-amber-100">
              <Sparkles size={14} />
              palco narrativo
            </span>
            <span className="hud-chip border-white/10 bg-black/30 text-[color:var(--ink-2)]">
              {moodLabel || "sem clima definido"}
            </span>
          </div>

          <div className="mt-4 rounded-full border border-white/10 bg-black/34 px-5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="section-label text-center">cena em foco</p>
            <h2 className="mt-2 text-balance text-2xl font-semibold text-white sm:text-[2rem]">
              {sceneName}
            </h2>
          </div>
        </div>

        <div
          className={cn(
            "relative mt-4 flex-1 min-h-0",
            layoutMode === "center" ? "flex items-center" : "flex items-end"
          )}
        >
          {entries.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/20 text-sm text-[color:var(--ink-2)]">
              Nenhum personagem foi escalado para esta cena ainda.
            </div>
          ) : layoutMode === "center" ? (
            <div className="mx-auto flex h-full w-full max-w-[1360px] flex-wrap items-center justify-center gap-4">
              {entries.map((entry, index) => (
                <CastCard
                  key={entry.entry.id}
                  entry={entry}
                  isSpotlight={spotlight?.entry.id === entry.entry.id}
                  cardSize={cardSize}
                  compact={compact}
                  isFocus={isFocus}
                  style={buildCardStyle({
                    index,
                    total: entries.length,
                    layoutMode,
                    isSpotlight: spotlight?.entry.id === entry.entry.id
                  })}
                />
              ))}
            </div>
          ) : layoutMode === "grid" ? (
            <div className="mx-auto flex w-full max-w-[1360px] flex-wrap content-end justify-center gap-4">
              {entries.map((entry, index) => (
                <CastCard
                  key={entry.entry.id}
                  entry={entry}
                  isSpotlight={spotlight?.entry.id === entry.entry.id}
                  cardSize={cardSize}
                  compact={compact}
                  isFocus={isFocus}
                  style={buildCardStyle({
                    index,
                    total: entries.length,
                    layoutMode,
                    isSpotlight: spotlight?.entry.id === entry.entry.id
                  })}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[1420px] flex-wrap items-end justify-center gap-4">
              {entries.map((entry, index) => (
                <CastCard
                  key={entry.entry.id}
                  entry={entry}
                  isSpotlight={spotlight?.entry.id === entry.entry.id}
                  cardSize={cardSize}
                  compact={compact}
                  isFocus={isFocus}
                  style={buildCardStyle({
                    index,
                    total: entries.length,
                    layoutMode,
                    isSpotlight: spotlight?.entry.id === entry.entry.id
                  })}
                />
              ))}
            </div>
          )}
        </div>

        {!backgroundUrl && !isFocus ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--ink-3)]">
            <ImageOff size={14} />
            fundo negro ativo, sem pintura de cena definida
          </div>
        ) : null}
      </div>
    </div>
  );
}
