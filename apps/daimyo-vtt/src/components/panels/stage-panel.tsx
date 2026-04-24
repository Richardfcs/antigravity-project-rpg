"use client";

import { useMemo, useTransition } from "react";
import {
  Expand,
  Shrink
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
import type { CombatDefenseOption, CombatDraftAction, SessionCombatFlow } from "@/types/combat";
import type { TacticalCombatStateView } from "@/lib/maps/selectors";
import {
  findActiveMap,
  listMapStageTokens
} from "@/lib/maps/selectors";
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
import type { SessionMemoryRecord } from "@/types/session-memory";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type {
  PresentationMode,
  SessionShellSnapshot,
  SessionViewerIdentity,
  StageMode,
  ExplorerSection
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
  memoryEvents?: SessionMemoryRecord[];
  atlasMapIdOverride?: string | null;
  onAtlasMapNavigate?: (atlasMapId: string | null) => void;
  combatState?: TacticalCombatStateView;
  combatFlow?: SessionCombatFlow | null;
  canManageCombat?: boolean;
  onCombatStart?: () => Promise<void> | void;
  onCombatStop?: () => Promise<void> | void;
  onCombatAdvance?: (direction: "next" | "previous") => Promise<void> | void;
  onSelectCombatant?: (tokenId: string) => Promise<void> | void;
  onExecuteCombatAction?: (action: CombatDraftAction) => Promise<void> | void;
  onRespondCombatPrompt?: (input: {
    eventId: string;
    defenseOption: CombatDefenseOption;
    retreat?: boolean;
    acrobatic?: boolean;
  }) => Promise<void> | void;
  onGmTakeOver?: (tokenId: string) => Promise<void> | void;
  onStageModeChange: (mode: StageMode) => void;
  onPresentationModeChange: (mode: PresentationMode) => void;
  onRequestLibrary?: (section: ExplorerSection) => void;
}

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
  memoryEvents = [],
  atlasMapIdOverride,
  onAtlasMapNavigate,
  combatState,
  combatFlow = null,
  canManageCombat,
  onCombatStart,
  onCombatStop,
  onCombatAdvance,
  onSelectCombatant,
  onExecuteCombatAction,
  onRespondCombatPrompt,
  onGmTakeOver,
  onPresentationModeChange,
  onRequestLibrary
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

  const stageChips = useMemo(() => {
    if (snapshot.stageMode === "tactical") {
      return [
        `${activeMapTokens.length} tokens`,
        combatState?.enabled ? `rodada ${combatState.round}` : "combate em espera"
      ];
    }

    if (snapshot.stageMode === "atlas") {
      return [`${activeAtlasPins.length} locais visiveis`];
    }

    return [`${activeEntries.length} em cena`];
  }, [
    activeAtlasPins.length,
    activeEntries.length,
    activeMapTokens.length,
    combatState?.enabled,
    combatState?.round,
    snapshot.stageMode
  ]);

  const stageTitle =
    snapshot.stageMode === "tactical"
      ? activeMap?.name ?? "Campo tatico"
      : snapshot.stageMode === "atlas"
        ? activeAtlasMap?.name ?? "Atlas"
        : activeScene?.name ?? snapshot.activeScene;
  const stageShellHeightClass =
    snapshot.stageMode === "theater"
      ? "xl:h-[calc(100vh-12rem)] xl:min-h-[600px] xl:max-h-[860px]"
      : "xl:h-[calc(100vh-8.5rem)] xl:min-h-[740px]";
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
    <section
      className={cn(
        "flex h-full min-h-0 flex-col gap-1.5 overflow-hidden rounded-[16px] border border-white/10 bg-[var(--bg-panel-strong)] p-1.5 lg:p-2",
        stageShellHeightClass
      )}
    >
      <header className="flex flex-col gap-1 border-b border-white/8 pb-1.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="section-label">Palco</p>
            <h2 className="text-sm font-semibold text-white md:text-base">{stageTitle}</h2>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {snapshot.stageMode === "tactical"
                ? "campo"
                : snapshot.stageMode === "atlas"
                  ? "wiki"
                  : "cena"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {stageChips.map((chip) => (
              <span
                key={chip}
                className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onPresentationModeChange(
              snapshot.presentationMode === "immersive" ? "standard" : "immersive"
            )
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
            snapshot.presentationMode === "immersive"
              ? "border-rose-300/22 bg-rose-300/10 text-rose-100"
              : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
          )}
        >
          {snapshot.presentationMode === "immersive" ? <Shrink size={14} /> : <Expand size={14} />}
          {snapshot.presentationMode === "immersive" ? "sair" : "imersivo"}
        </button>
      </header>

      <div className="min-h-[280px] flex-1 overflow-hidden md:min-h-[340px] xl:min-h-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {snapshot.stageMode === "theater" && (
            <TheaterStage
              sceneName={activeScene?.name ?? snapshot.activeScene}
              moodLabel={activeScene?.moodLabel ?? snapshot.sceneMood}
              layoutMode={activeScene?.layoutMode ?? "line"}
              backgroundUrl={backgroundAsset?.secureUrl ?? null}
              entries={activeEntries}
              viewMode="workspace"
              canManageScenes={viewer?.role === "gm"}
              onRequestLibrary={onRequestLibrary}
            />
          )}

          {snapshot.stageMode === "tactical" && (
            <TacticalMapStage
              key={activeMap?.id ?? "empty-map"}
              sessionCode={snapshot.code}
              map={activeMap}
              backgroundUrl={activeMapBackground?.secureUrl ?? null}
              backgroundAsset={activeMapBackground}
              tokens={activeMapTokens}
              combatState={combatState}
              combatFlow={combatFlow}
              canManageCombat={canManageCombat}
              viewerParticipantId={viewer?.participantId}
              canManageTokens={viewer?.role === "gm"}
              assetOptions={assets}
              characterOptions={characters}
              onMoveToken={handleMoveToken}
              onCombatStart={onCombatStart}
              onCombatStop={onCombatStop}
              onCombatAdvance={onCombatAdvance}
              onSelectCombatant={onSelectCombatant}
              onExecuteCombatAction={onExecuteCombatAction}
              onRespondCombatPrompt={onRespondCombatPrompt}
              onGmTakeOver={onGmTakeOver}
              onRequestLibrary={onRequestLibrary}
              viewMode="workspace"
            />
          )}

          {snapshot.stageMode === "atlas" && (
            <AtlasStage
              key={activeAtlasMap?.id ?? "empty-atlas"}
              sessionCode={snapshot.code}
              atlasMap={activeAtlasMap}
              backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
              backgroundAsset={activeAtlasBackground}
              pins={activeAtlasPins}
              canEdit={viewer?.role === "gm"}
              assetOptions={assets}
              characterOptions={characters}
              pinCharacterLinks={liveAtlasPinCharacters}
              atlasMaps={atlasMaps}
              revealHistory={memoryEvents}
              onOpenSubmap={(atlasMapId) => onAtlasMapNavigate?.(atlasMapId)}
              onResetNavigation={() => onAtlasMapNavigate?.(null)}
              navigatingSubmap={Boolean(atlasMapIdOverride && atlasMapIdOverride !== snapshot.activeAtlasMapId)}
              onRequestLibrary={onRequestLibrary}
              viewMode="workspace"
            />
          )}
        </div>
      </div>
    </section>
  );
}

