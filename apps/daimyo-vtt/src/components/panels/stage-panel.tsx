"use client";

import { useMemo, useTransition } from "react";
import {
  Expand,
  Globe,
  PlaySquare,
  Shrink,
  Swords
} from "lucide-react";
import { moveMapTokenAction } from "@/app/actions/map-actions";
import { AtlasStage } from "@/components/stage/atlas-stage";
import { TacticalMapStage } from "@/components/stage/tactical-map-stage";
import { TheaterStage } from "@/components/stage/theater-stage";
import {
  filterAtlasPinsForViewer,
  findActiveAtlasMap,
  listAtlasStagePins
} from "@/lib/atlas/selectors";
import { findActiveMap, listMapStageTokens } from "@/lib/maps/selectors";
import {
  findActiveScene,
  listSceneCastEntries
} from "@/lib/scenes/selectors";
import { useAtlasStore } from "@/stores/atlas-store";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/stores/map-store";
import type { SessionAssetRecord } from "@/types/asset";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";
import type { SessionCharacterRecord } from "@/types/character";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type {
  PresentationMode,
  SessionShellSnapshot,
  SessionViewerIdentity,
  StageMode
} from "@/types/session";

interface StagePanelProps {
  snapshot: SessionShellSnapshot;
  characters: SessionCharacterRecord[];
  assets: SessionAssetRecord[];
  scenes: SessionSceneRecord[];
  sceneCast: SceneCastRecord[];
  maps: SessionMapRecord[];
  mapTokens: MapTokenRecord[];
  atlasMaps: SessionAtlasMapRecord[];
  atlasPins: SessionAtlasPinRecord[];
  atlasPinCharacters: SessionAtlasPinCharacterRecord[];
  viewer: SessionViewerIdentity | null;
  atlasMapIdOverride?: string | null;
  onAtlasMapNavigate?: (atlasMapId: string | null) => void;
  onStageModeChange: (mode: StageMode) => void;
  onPresentationModeChange: (mode: PresentationMode) => void;
}

const stageModes = [
  { id: "theater" as const, label: "Palco", icon: PlaySquare, blurb: "cena narrativa em tempo real" },
  { id: "tactical" as const, label: "Campo", icon: Swords, blurb: "mapa e marcadores sincronizados" },
  { id: "atlas" as const, label: "Atlas", icon: Globe, blurb: "mundo macro com pins interativos" }
];

export function StagePanel({
  snapshot,
  characters,
  assets,
  scenes,
  sceneCast,
  maps,
  mapTokens,
  atlasMaps,
  atlasPins,
  atlasPinCharacters,
  viewer,
  atlasMapIdOverride,
  onAtlasMapNavigate,
  onStageModeChange,
  onPresentationModeChange
}: StagePanelProps) {
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const storedAtlasPinCharacters = useAtlasStore((state) => state.atlasPinCharacters);
  const [, startTransition] = useTransition();

  const activeScene = useMemo(
    () => findActiveScene(scenes, snapshot.activeSceneId),
    [scenes, snapshot.activeSceneId]
  );

  const activeEntries = useMemo(
    () => (activeScene ? listSceneCastEntries(activeScene.id, sceneCast, characters, assets) : []),
    [activeScene, assets, characters, sceneCast]
  );
  const backgroundAsset = activeScene
    ? assets.find((asset) => asset.id === activeScene.backgroundAssetId) ?? null
    : null;

  const activeMap = useMemo(
    () => findActiveMap(maps, snapshot.activeMapId),
    [maps, snapshot.activeMapId]
  );
  const activeMapTokens = useMemo(
    () => (activeMap ? listMapStageTokens(activeMap.id, mapTokens, characters, assets) : []),
    [activeMap, assets, characters, mapTokens]
  );
  const activeMapBackground = activeMap
    ? assets.find((asset) => asset.id === activeMap.backgroundAssetId) ?? null
    : null;

  const activeAtlasMap = useMemo(
    () => findActiveAtlasMap(atlasMaps, atlasMapIdOverride ?? snapshot.activeAtlasMapId),
    [atlasMapIdOverride, atlasMaps, snapshot.activeAtlasMapId]
  );
  const liveAtlasPinCharacters =
    storedAtlasPinCharacters.length > 0 ? storedAtlasPinCharacters : atlasPinCharacters;
  const visibleAtlasPins = filterAtlasPinsForViewer(
    atlasPins,
    viewer?.role === "gm"
  );
  const activeAtlasPins = useMemo(
    () =>
      activeAtlasMap
        ? listAtlasStagePins(
            activeAtlasMap.id,
            visibleAtlasPins,
            assets,
            liveAtlasPinCharacters,
            characters
          )
        : [],
    [activeAtlasMap, assets, visibleAtlasPins, characters, liveAtlasPinCharacters]
  );
  const activeAtlasBackground = activeAtlasMap
    ? assets.find((asset) => asset.id === activeAtlasMap.assetId) ?? null
    : null;


  const stageTitle =
    snapshot.stageMode === "tactical"
      ? activeMap?.name ?? "Campo tatico"
      : snapshot.stageMode === "atlas"
        ? activeAtlasMap?.name ?? "Atlas"
        : activeScene?.name ?? snapshot.activeScene;
  const stageBlurb =
    snapshot.stageMode === "tactical"
      ? "Marcadores claros, criacao no palco e comando direto do mestre."
      : snapshot.stageMode === "atlas"
        ? "Pins criados e reposicionados no proprio mapa macro."
        : "Palco em estilo apresentacao, com destaque, formacao e retratos responsivos.";

  const handleMoveToken = (tokenId: string, x: number, y: number) => {
    startTransition(async () => {
      const result = await moveMapTokenAction({
        sessionCode: snapshot.code,
        tokenId,
        x,
        y
      });

      if (result.ok && result.token) {
        upsertMapToken(result.token);
      }
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)] p-4">
      <header className="flex flex-col gap-4 border-b border-white/8 pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="section-label">Palco central</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{stageTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">{stageBlurb}</p>
        </div>

        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {stageModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onStageModeChange(mode.id)}
                className={cn(
                  "rounded-[18px] border px-4 py-3 text-left transition",
                  snapshot.stageMode === mode.id
                    ? "border-amber-300/35 bg-amber-300/10 text-white"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <mode.icon size={16} />
                  <span className="text-sm font-medium">{mode.label}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[color:var(--ink-3)]">{mode.blurb}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                onPresentationModeChange(
                  snapshot.presentationMode === "immersive" ? "standard" : "immersive"
                )
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                snapshot.presentationMode === "immersive"
                  ? "border-rose-300/22 bg-rose-300/10 text-rose-100"
                  : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
              )}
            >
              {snapshot.presentationMode === "immersive" ? <Shrink size={14} /> : <Expand size={14} />}
              {snapshot.presentationMode === "immersive" ? "sair do imersivo" : "abrir imersivo"}
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-[520px] flex-1">
        <div className="flex h-full min-h-0 flex-col">
          {snapshot.stageMode === "theater" && (
            <TheaterStage
              sceneName={activeScene?.name ?? snapshot.activeScene}
              moodLabel={activeScene?.moodLabel ?? snapshot.sceneMood}
              layoutMode={activeScene?.layoutMode ?? "line"}
              backgroundUrl={backgroundAsset?.secureUrl ?? null}
              entries={activeEntries}
              viewMode="workspace"
            />
          )}

          {snapshot.stageMode === "tactical" && (
            <TacticalMapStage
              key={activeMap?.id ?? "empty-map"}
              sessionCode={snapshot.code}
              map={activeMap}
              backgroundUrl={activeMapBackground?.secureUrl ?? null}
              tokens={activeMapTokens}
              viewerParticipantId={viewer?.participantId}
              canManageTokens={viewer?.role === "gm"}
              assetOptions={assets}
              characterOptions={characters}
              onMoveToken={handleMoveToken}
              viewMode="workspace"
            />
          )}

          {snapshot.stageMode === "atlas" && (
            <AtlasStage
              key={activeAtlasMap?.id ?? "empty-atlas"}
              sessionCode={snapshot.code}
              atlasMap={activeAtlasMap}
              backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
              pins={activeAtlasPins}
              canEdit={viewer?.role === "gm"}
              assetOptions={assets}
              characterOptions={characters}
              pinCharacterLinks={liveAtlasPinCharacters}
              atlasMaps={atlasMaps}
              onOpenSubmap={(atlasMapId) => onAtlasMapNavigate?.(atlasMapId)}
              onResetNavigation={() => onAtlasMapNavigate?.(null)}
              navigatingSubmap={Boolean(atlasMapIdOverride && atlasMapIdOverride !== snapshot.activeAtlasMapId)}
              viewMode="workspace"
            />
          )}
        </div>
      </div>
    </section>
  );
}

