import { findActiveAudioTrack } from "@/lib/audio/selectors";
import { findActiveAtlasMap } from "@/lib/atlas/selectors";
import { findActiveMap } from "@/lib/maps/selectors";
import { findActiveScene } from "@/lib/scenes/selectors";
import type { SessionAssetRecord } from "@/types/asset";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";
import type {
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";
import type { SessionCharacterRecord } from "@/types/character";
import type { SessionEffectLayerRecord } from "@/types/immersive-event";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";
import type { OnlinePresence } from "@/types/presence";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type {
  PresentationMode,
  SessionShellSnapshot,
  StageMode
} from "@/types/session";

export interface SessionCommandState {
  stageMode: StageMode;
  presentationMode: PresentationMode;
  combatEnabled: boolean;
  combatRound: number;
  combatTurnIndex: number;
  combatActiveTokenId: string | null;
  venueName: string;
  activeSceneName: string | null;
  activeMapName: string | null;
  activeAtlasName: string | null;
  onlinePlayers: number;
  totalPresence: number;
  totalScenes: number;
  totalMaps: number;
  totalCharacters: number;
  totalAssets: number;
  totalEffects: number;
  sceneCastCount: number;
  mapTokenCount: number;
  atlasVisiblePinCount: number;
  atlasHiddenPinCount: number;
  activeTrackTitle: string | null;
  activeTrackPlaylist: string | null;
  globalEffectCount: number;
  targetedEffectCount: number;
}

interface BuildSessionCommandStateOptions {
  snapshot: SessionShellSnapshot;
  party: OnlinePresence[];
  scenes: SessionSceneRecord[];
  sceneCast: SceneCastRecord[];
  maps: SessionMapRecord[];
  mapTokens: MapTokenRecord[];
  atlasMaps: SessionAtlasMapRecord[];
  atlasPins: SessionAtlasPinRecord[];
  assets: SessionAssetRecord[];
  characters: SessionCharacterRecord[];
  tracks: SessionAudioTrackRecord[];
  playback: SessionAudioStateRecord | null;
  effectLayers: SessionEffectLayerRecord[];
}

export function buildSessionCommandState({
  snapshot,
  party,
  scenes,
  sceneCast,
  maps,
  mapTokens,
  atlasMaps,
  atlasPins,
  assets,
  characters,
  tracks,
  playback,
  effectLayers
}: BuildSessionCommandStateOptions): SessionCommandState {
  const activeScene = findActiveScene(scenes, snapshot.activeSceneId);
  const activeMap = findActiveMap(maps, snapshot.activeMapId);
  const activeAtlasMap = findActiveAtlasMap(atlasMaps, snapshot.activeAtlasMapId);
  const activeTrack = findActiveAudioTrack(tracks, playback);
  const activeSceneCastCount = activeScene
    ? sceneCast.filter((entry) => entry.sceneId === activeScene.id).length
    : 0;
  const activeMapTokenCount = activeMap
    ? mapTokens.filter((token) => token.mapId === activeMap.id).length
    : 0;
  const activeAtlasPins = activeAtlasMap
    ? atlasPins.filter((pin) => pin.atlasMapId === activeAtlasMap.id)
    : [];
  const atlasVisiblePinCount = activeAtlasPins.filter(
    (pin) => pin.isVisibleToPlayers || pin.isNameVisibleToPlayers
  ).length;
  const atlasHiddenPinCount = Math.max(0, activeAtlasPins.length - atlasVisiblePinCount);
  const onlinePlayers = party.filter((presence) => presence.status !== "offline").length;
  const venueName =
    snapshot.stageMode === "tactical"
      ? activeMap?.name ?? "Campo tático"
      : snapshot.stageMode === "atlas"
        ? activeAtlasMap?.name ?? "Atlas"
        : activeScene?.name ?? snapshot.activeScene;

  return {
    stageMode: snapshot.stageMode,
    presentationMode: snapshot.presentationMode,
    combatEnabled: snapshot.combatEnabled,
    combatRound: snapshot.combatRound,
    combatTurnIndex: snapshot.combatTurnIndex,
    combatActiveTokenId: snapshot.combatActiveTokenId,
    venueName,
    activeSceneName: activeScene?.name ?? null,
    activeMapName: activeMap?.name ?? null,
    activeAtlasName: activeAtlasMap?.name ?? null,
    onlinePlayers,
    totalPresence: party.length,
    totalScenes: scenes.length,
    totalMaps: maps.length,
    totalCharacters: characters.length,
    totalAssets: assets.length,
    totalEffects: effectLayers.length,
    sceneCastCount: activeSceneCastCount,
    mapTokenCount: activeMapTokenCount,
    atlasVisiblePinCount,
    atlasHiddenPinCount,
    activeTrackTitle: activeTrack?.title ?? null,
    activeTrackPlaylist: activeTrack?.playlistName ?? null,
    globalEffectCount: effectLayers.filter((effect) => effect.targetParticipantId == null)
      .length,
    targetedEffectCount: effectLayers.filter((effect) => effect.targetParticipantId != null)
      .length
  };
}
