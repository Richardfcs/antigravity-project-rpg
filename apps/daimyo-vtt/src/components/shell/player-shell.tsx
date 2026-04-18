"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BellRing,
  ChevronRight,
  Expand,
  HeartPulse,
  LoaderCircle,
  Map,
  MoonStar,
  Music4,
  RadioTower,
  Shield,
  Shrink,
  Sparkles,
  Swords,
  Theater
} from "lucide-react";

import { adjustCharacterResourceAction } from "@/app/actions/character-actions";
import { moveMapTokenAction } from "@/app/actions/map-actions";
import { AudioSyncLayer } from "@/components/audio/audio-sync-layer";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { ImmersiveOverlays } from "@/components/effects/immersive-overlays";
import { SessionEffectOverlays } from "@/components/effects/session-effect-overlays";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { BottomDock } from "@/components/panels/bottom-dock";
import { ChatPanel } from "@/components/panels/chat-panel";
import { SessionStatusDrawer } from "@/components/panels/session-status-drawer";
import { AtlasStage } from "@/components/stage/atlas-stage";
import { TacticalMapStage } from "@/components/stage/tactical-map-stage";
import { TheaterStage } from "@/components/stage/theater-stage";
import { ThemeSettingsButton } from "@/components/theme/theme-provider";
import { findActiveAudioTrack } from "@/lib/audio/selectors";
import {
  findActiveAtlasMap,
  listAtlasStagePins
} from "@/lib/atlas/selectors";
import {
  findCharacterByViewer,
  resolveCharacterAsset,
  sortCharactersByInitiative
} from "@/lib/characters/selectors";
import { findActiveMap, listMapStageTokens } from "@/lib/maps/selectors";
import {
  findActiveScene,
  listSceneCastEntries
} from "@/lib/scenes/selectors";
import { usePrivateEvents } from "@/hooks/use-private-events";
import { useSessionAtlas } from "@/hooks/use-session-atlas";
import { useSessionAudio } from "@/hooks/use-session-audio";
import { useSessionAssets } from "@/hooks/use-session-assets";
import { useSessionBootstrap } from "@/hooks/use-session-bootstrap";
import { useSessionChat } from "@/hooks/use-session-chat";
import { useSessionCharacters } from "@/hooks/use-session-characters";
import { useSessionEffects } from "@/hooks/use-session-effects";
import { useSessionMaps } from "@/hooks/use-session-maps";
import { useSessionPresence } from "@/hooks/use-session-presence";
import { useSessionScenes } from "@/hooks/use-session-scenes";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import { useAudioStore } from "@/stores/audio-store";
import { useCharacterStore } from "@/stores/character-store";
import { useImmersiveEventStore } from "@/stores/immersive-event-store";
import { useMapStore } from "@/stores/map-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useSceneStore } from "@/stores/scene-store";
import { useSessionStore } from "@/stores/session-store";
import { useUiShellStore } from "@/stores/ui-shell-store";
import type { SessionAssetRecord } from "@/types/asset";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";
import type {
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";
import type { SessionCharacterRecord } from "@/types/character";
import type { SessionEffectLayerRecord } from "@/types/immersive-event";
import type { SessionPrivateEventRecord } from "@/types/immersive-event";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";
import type { SessionMessageRecord } from "@/types/message";
import type { OnlinePresence } from "@/types/presence";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type {
  PresentationMode,
  SessionParticipantRecord,
  SessionShellSnapshot,
  SessionViewerIdentity,
  StageMode
} from "@/types/session";

interface PlayerShellProps {
  snapshot: SessionShellSnapshot;
  participants: SessionParticipantRecord[];
  party: OnlinePresence[];
  assets: SessionAssetRecord[];
  characters: SessionCharacterRecord[];
  scenes: SessionSceneRecord[];
  sceneCast: SceneCastRecord[];
  maps: SessionMapRecord[];
  mapTokens: MapTokenRecord[];
  atlasMaps: SessionAtlasMapRecord[];
  atlasPins: SessionAtlasPinRecord[];
  atlasPinCharacters: SessionAtlasPinCharacterRecord[];
  messages: SessionMessageRecord[];
  audioTracks: SessionAudioTrackRecord[];
  audioState: SessionAudioStateRecord | null;
  privateEvents: SessionPrivateEventRecord[];
  effectLayers: SessionEffectLayerRecord[];
  viewer: SessionViewerIdentity | null;
}

export function PlayerShell({
  snapshot,
  participants,
  party,
  assets,
  characters,
  scenes,
  sceneCast,
  maps,
  mapTokens,
  atlasMaps,
  atlasPins,
  atlasPinCharacters,
  messages,
  audioTracks,
  audioState,
  privateEvents,
  effectLayers,
  viewer
}: PlayerShellProps) {
  const storedSnapshot = useSessionStore((state) => state.snapshot);
  const members = usePresenceStore((state) => state.members);
  const storedAssets = useAssetStore((state) => state.assets);
  const storedCharacters = useCharacterStore((state) => state.characters);
  const storedScenes = useSceneStore((state) => state.scenes);
  const storedSceneCast = useSceneStore((state) => state.sceneCast);
  const storedMaps = useMapStore((state) => state.maps);
  const storedMapTokens = useMapStore((state) => state.mapTokens);
  const storedAtlasMaps = useAtlasStore((state) => state.atlasMaps);
  const storedAtlasPins = useAtlasStore((state) => state.atlasPins);
  const storedAtlasPinCharacters = useAtlasStore((state) => state.atlasPinCharacters);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const activeDockTab = useUiShellStore((state) => state.activeDockTab);
  const setActiveDockTab = useUiShellStore((state) => state.setActiveDockTab);
  const followMaster = useUiShellStore((state) => state.followMaster);
  const setFollowMaster = useUiShellStore((state) => state.setFollowMaster);
  const pendingPrivateEvents = useImmersiveEventStore((state) => state.events);
  const storedTracks = useAudioStore((state) => state.tracks);
  const storedPlayback = useAudioStore((state) => state.playback);
  const audioUnlockRequired = useAudioStore((state) => state.unlockRequired);
  const audioRuntimeError = useAudioStore((state) => state.runtimeError);
  const requestAudioUnlock = useAudioStore((state) => state.requestUnlock);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [localStageMode, setLocalStageMode] = useState<StageMode>(snapshot.stageMode);
  const [localPresentationMode, setLocalPresentationMode] = useState<PresentationMode>(
    snapshot.presentationMode
  );
  const [atlasNavigation, setAtlasNavigation] = useState<{
    sourceAtlasMapId: string | null;
    targetAtlasMapId: string | null;
  } | null>(null);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);
  const [isImmersiveChatOpen, setIsImmersiveChatOpen] = useState(false);
  const [isImmersiveMinimized, setIsImmersiveMinimized] = useState(false);
  const [lastBroadcastStageMode, setLastBroadcastStageMode] = useState<StageMode>(
    snapshot.stageMode === "tactical" ? "tactical" : "theater"
  );
  const [lastBroadcastPresentationMode, setLastBroadcastPresentationMode] =
    useState<PresentationMode>(
      snapshot.stageMode === "atlas" ? "standard" : snapshot.presentationMode
    );
  const [isPending, startTransition] = useTransition();
  const previousMasterFocus = useRef({
    stageMode: snapshot.stageMode,
    presentationMode: snapshot.presentationMode
  });

  useSessionBootstrap({
    snapshot,
    members: party,
    assets,
    characters,
    viewer,
    initialSyncState: viewer ? "booting" : "idle",
    initialLatencyLabel: viewer ? "syncing..." : "--"
  });

  useSessionPresence({
    sessionCode: snapshot.code,
    viewer,
    initialMembers: party,
    enabled: Boolean(viewer)
  });

  useSessionSnapshot({
    sessionId: snapshot.sessionId,
    enabled: true
  });

  useSessionAssets({
    sessionId: snapshot.sessionId,
    initialAssets: assets,
    enabled: true
  });

  useSessionCharacters({
    sessionId: snapshot.sessionId,
    initialCharacters: characters,
    enabled: true
  });

  useSessionScenes({
    sessionId: snapshot.sessionId,
    initialScenes: scenes,
    initialSceneCast: sceneCast,
    enabled: true
  });

  useSessionMaps({
    sessionId: snapshot.sessionId,
    initialMaps: maps,
    initialMapTokens: mapTokens,
    enabled: true
  });

  useSessionAtlas({
    sessionId: snapshot.sessionId,
    initialAtlasMaps: atlasMaps,
    initialAtlasPins: atlasPins,
    initialAtlasPinCharacters: atlasPinCharacters,
    enabled: true
  });

  useSessionChat({
    sessionId: snapshot.sessionId,
    initialMessages: messages,
    enabled: true
  });

  useSessionAudio({
    sessionId: snapshot.sessionId,
    initialTracks: audioTracks,
    initialPlayback: audioState,
    enabled: true
  });

  usePrivateEvents({
    sessionId: snapshot.sessionId,
    participantId: viewer?.participantId,
    initialEvents: privateEvents,
    enabled: true
  });

  useSessionEffects({
    sessionId: snapshot.sessionId,
    initialEffects: effectLayers,
    enabled: true
  });

  const session = storedSnapshot ?? snapshot;
  const roster = members.length > 0 ? members : party;
  const syncedTracks = storedTracks.length > 0 ? storedTracks : audioTracks;
  const syncedPlayback = storedPlayback ?? audioState;
  const liveAssets = storedAssets.length > 0 ? storedAssets : assets;
  const liveCharacters = storedCharacters.length > 0 ? storedCharacters : characters;
  const liveScenes = storedScenes.length > 0 ? storedScenes : scenes;
  const liveSceneCast = storedSceneCast.length > 0 ? storedSceneCast : sceneCast;
  const liveMaps = storedMaps.length > 0 ? storedMaps : maps;
  const liveMapTokens = storedMapTokens.length > 0 ? storedMapTokens : mapTokens;
  const liveAtlasMaps = storedAtlasMaps.length > 0 ? storedAtlasMaps : atlasMaps;
  const liveAtlasPins = storedAtlasPins.length > 0 ? storedAtlasPins : atlasPins;
  const liveAtlasPinCharacters =
    storedAtlasPinCharacters.length > 0
      ? storedAtlasPinCharacters
      : atlasPinCharacters;
  const orderedCharacters = useMemo(
    () => sortCharactersByInitiative(liveCharacters),
    [liveCharacters]
  );
  const currentCharacter =
    findCharacterByViewer(orderedCharacters, viewer?.participantId) ??
    orderedCharacters.find((character) => character.type === "player") ??
    null;
  const currentAsset = currentCharacter
    ? resolveCharacterAsset(currentCharacter, liveAssets)
    : null;
  const initiativeIndex = currentCharacter
    ? orderedCharacters.findIndex((character) => character.id === currentCharacter.id) + 1
    : null;
  const canControlCurrentCharacter = Boolean(
    viewer &&
      currentCharacter &&
      currentCharacter.ownerParticipantId === viewer.participantId
  );
  const activeScene = findActiveScene(liveScenes, session.activeSceneId);
  const activeEntries = activeScene
    ? listSceneCastEntries(activeScene.id, liveSceneCast, liveCharacters, liveAssets)
    : [];
  const backgroundAsset = activeScene
    ? liveAssets.find((asset) => asset.id === activeScene.backgroundAssetId) ?? null
    : null;
  const activeMap = findActiveMap(liveMaps, session.activeMapId);
  const activeMapTokens = activeMap
    ? listMapStageTokens(activeMap.id, liveMapTokens, liveCharacters, liveAssets)
    : [];
  const activeMapBackground = activeMap
    ? liveAssets.find((asset) => asset.id === activeMap.backgroundAssetId) ?? null
    : null;
  const activeAtlasMap = findActiveAtlasMap(
    liveAtlasMaps,
    session.activeAtlasMapId
  );
  const displayedAtlasMap = findActiveAtlasMap(
    liveAtlasMaps,
    atlasNavigation?.sourceAtlasMapId === session.activeAtlasMapId
      ? atlasNavigation.targetAtlasMapId
      : session.activeAtlasMapId
  );
  const activeAtlasPins = displayedAtlasMap
    ? listAtlasStagePins(
        displayedAtlasMap.id,
        liveAtlasPins,
        liveAssets,
        liveAtlasPinCharacters,
        liveCharacters
      )
    : [];
  const activeAtlasBackground = displayedAtlasMap
    ? liveAssets.find((asset) => asset.id === displayedAtlasMap.assetId) ?? null
    : null;
  const activeTrack = findActiveAudioTrack(syncedTracks, syncedPlayback);
  const broadcastStageMode =
    session.stageMode === "atlas" ? lastBroadcastStageMode : session.stageMode;
  const broadcastPresentationMode =
    session.stageMode === "atlas"
      ? lastBroadcastPresentationMode
      : session.presentationMode;

  useEffect(() => {
    if (session.stageMode === "atlas") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLastBroadcastStageMode(session.stageMode);
      setLastBroadcastPresentationMode(session.presentationMode);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [session.presentationMode, session.stageMode]);

  useEffect(() => {
    const previous = previousMasterFocus.current;
    const masterChanged =
      previous.stageMode !== session.stageMode ||
      previous.presentationMode !== session.presentationMode;

    if (!masterChanged) {
      return;
    }

    const nextNotice =
      session.stageMode === "atlas" && followMaster
        ? "Mestre abriu o Wiki. Use o botao Wiki para acompanhar sem sair do palco transmitido."
        : followMaster
          ? `Mestre abriu ${
              session.stageMode === "theater"
                ? "o teatro"
                : "o mapa tatico"
            }${session.presentationMode === "immersive" ? " em modo imersivo" : ""}.`
          : `Mestre mudou o foco da sessao para ${
          session.stageMode === "theater"
            ? "teatro"
            : session.stageMode === "tactical"
              ? "mapa tatico"
              : "atlas"
          }.`;
    const noticeTimer = window.setTimeout(() => {
      setSyncNotice(nextNotice);
    }, 0);

    previousMasterFocus.current = {
      stageMode: session.stageMode,
      presentationMode: session.presentationMode
    };

    return () => {
      window.clearTimeout(noticeTimer);
    };
  }, [followMaster, session.presentationMode, session.stageMode]);

  useEffect(() => {
    if (!syncNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSyncNotice(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [syncNotice]);

  useEffect(() => {
    if (broadcastPresentationMode !== "standard") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsImmersiveMinimized(false);
      setIsImmersiveChatOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [broadcastPresentationMode]);

  const handleResourceDelta = (resource: "hp" | "fp", delta: number) => {
    if (!viewer || !currentCharacter) {
      setFeedback("Entre na sessao pelo lobby para sincronizar sua ficha.");
      return;
    }

    setFeedback(null);
    setPendingKey(`${resource}:${delta}`);

    startTransition(async () => {
      const result = await adjustCharacterResourceAction({
        sessionCode: session.code,
        characterId: currentCharacter.id,
        resource,
        delta
      });

      if (result.ok && result.character) {
        upsertCharacter(result.character);
      } else if (result.message) {
        setFeedback(result.message);
      }

      setPendingKey(null);
    });
  };

  const handleMoveToken = (tokenId: string, x: number, y: number) => {
    setFeedback(null);

    startTransition(async () => {
      const result = await moveMapTokenAction({
        sessionCode: session.code,
        tokenId,
        x,
        y
      });

      if (result.ok && result.token) {
        upsertMapToken(result.token);
      } else if (result.message) {
        setFeedback(result.message);
      }
    });
  };

  const effectiveStageMode = wikiOpen
    ? "atlas"
    : followMaster
      ? broadcastStageMode
      : localStageMode;
  const effectivePresentationMode = wikiOpen
    ? localPresentationMode
    : followMaster
      ? localPresentationMode === "immersive"
        ? "immersive"
        : broadcastPresentationMode
      : localPresentationMode;
  const resolvedImmersiveMinimized =
    effectivePresentationMode === "standard" ? false : isImmersiveMinimized;

  const heroTitle =
    effectiveStageMode === "tactical"
      ? activeMap?.name ?? "Campo tatico"
      : effectiveStageMode === "atlas"
        ? activeAtlasMap?.name ?? "Atlas"
        : activeScene?.name ?? session.activeScene;
  const heroBlurb =
    effectiveStageMode === "tactical"
      ? "O mapa tatico da sessao acompanha a mesa em tempo real, inclusive quando o mestre troca o campo."
      : effectiveStageMode === "atlas"
        ? "O atlas da campanha esta aberto. Os pins destacam locais, rotas e submapas importantes."
        : "O palco reage ao vivo com destaque de fala, formacao de cards e background sincronizado.";

  const handleFollowMasterToggle = () => {
    const nextValue = !followMaster;

    if (nextValue) {
      setLocalStageMode(broadcastStageMode);
      setLocalPresentationMode(broadcastPresentationMode);
      setIsImmersiveMinimized(false);
      setWikiOpen(false);
      setSyncNotice("Voce voltou a seguir o foco do mestre.");
    } else {
      setSyncNotice("Modo livre ativado. Agora voce pode abrir outro palco localmente.");
    }

    setFollowMaster(nextValue);
  };

  const handleFollowNow = () => {
    setLocalStageMode(broadcastStageMode);
    setLocalPresentationMode(broadcastPresentationMode);
    setIsImmersiveMinimized(false);
    setWikiOpen(false);
    setSyncNotice("Sessao alinhada com o foco atual do mestre.");
  };

  const handleWikiToggle = () => {
    setWikiOpen((current) => {
      const nextValue = !current;

      if (nextValue) {
        setLocalPresentationMode("standard");
        setIsImmersiveMinimized(false);
        setIsImmersiveChatOpen(false);
      }

      return nextValue;
    });
  };

  const renderedStage =
    effectiveStageMode === "tactical" ? (
      <TacticalMapStage
        key={activeMap?.id ?? "empty-map"}
        sessionCode={session.code}
        map={activeMap}
        backgroundUrl={activeMapBackground?.secureUrl ?? null}
        tokens={activeMapTokens}
        viewerParticipantId={viewer?.participantId}
        canManageTokens={false}
        onMoveToken={handleMoveToken}
        viewMode="workspace"
      />
    ) : effectiveStageMode === "atlas" ? (
      <AtlasStage
        key={displayedAtlasMap?.id ?? "empty-atlas"}
        sessionCode={session.code}
        atlasMap={displayedAtlasMap}
        atlasMaps={liveAtlasMaps}
        backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
        pins={activeAtlasPins}
        canEdit={false}
        characterOptions={liveCharacters}
        pinCharacterLinks={liveAtlasPinCharacters}
        onOpenSubmap={(atlasMapId) =>
          setAtlasNavigation({
            sourceAtlasMapId: session.activeAtlasMapId,
            targetAtlasMapId: atlasMapId
          })
        }
        onResetNavigation={() => setAtlasNavigation(null)}
        navigatingSubmap={Boolean(
          atlasNavigation?.targetAtlasMapId &&
            atlasNavigation.sourceAtlasMapId === session.activeAtlasMapId
        )}
        viewMode="workspace"
      />
    ) : (
      <TheaterStage
        sceneName={activeScene?.name ?? session.activeScene}
        moodLabel={activeScene?.moodLabel ?? session.sceneMood}
        layoutMode={activeScene?.layoutMode ?? "line"}
        backgroundUrl={backgroundAsset?.secureUrl ?? null}
        entries={activeEntries}
        viewMode="workspace"
      />
    );

  const renderedImmersiveStage =
    effectiveStageMode === "tactical" ? (
      <TacticalMapStage
        key={`${activeMap?.id ?? "empty-map"}:immersive`}
        sessionCode={session.code}
        map={activeMap}
        backgroundUrl={activeMapBackground?.secureUrl ?? null}
        tokens={activeMapTokens}
        viewerParticipantId={viewer?.participantId}
        canManageTokens={false}
        onMoveToken={handleMoveToken}
        viewMode="focus"
      />
    ) : effectiveStageMode === "atlas" ? (
      <AtlasStage
        key={`${displayedAtlasMap?.id ?? "empty-atlas"}:immersive`}
        sessionCode={session.code}
        atlasMap={displayedAtlasMap}
        atlasMaps={liveAtlasMaps}
        backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
        pins={activeAtlasPins}
        canEdit={false}
        characterOptions={liveCharacters}
        pinCharacterLinks={liveAtlasPinCharacters}
        onOpenSubmap={(atlasMapId) =>
          setAtlasNavigation({
            sourceAtlasMapId: session.activeAtlasMapId,
            targetAtlasMapId: atlasMapId
          })
        }
        onResetNavigation={() => setAtlasNavigation(null)}
        navigatingSubmap={Boolean(
          atlasNavigation?.targetAtlasMapId &&
            atlasNavigation.sourceAtlasMapId === session.activeAtlasMapId
        )}
        viewMode="focus"
      />
    ) : (
      <TheaterStage
        sceneName={activeScene?.name ?? session.activeScene}
        moodLabel={activeScene?.moodLabel ?? session.sceneMood}
        layoutMode={activeScene?.layoutMode ?? "line"}
        backgroundUrl={backgroundAsset?.secureUrl ?? null}
        entries={activeEntries}
        viewMode="focus"
      />
    );

  const showInlineStage =
    effectivePresentationMode !== "immersive" || resolvedImmersiveMinimized;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,168,70,0.09),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(196,30,58,0.08),transparent_22%),linear-gradient(180deg,#050505,#0b0907_48%,#120a08)] px-4 py-5 sm:px-6">
      <AudioSyncLayer />
      <SessionEffectOverlays viewerParticipantId={viewer?.participantId} />
      <ImmersiveOverlays sessionCode={session.code} />
      <div className="mx-auto max-w-6xl">
        <AuthSessionBridge sessionCode={session.code} role="player" viewer={viewer} />
      </div>
      {effectivePresentationMode === "immersive" && !resolvedImmersiveMinimized && (
        <div className="fixed inset-0 z-[85] bg-[rgba(2,6,23,0.88)] p-3 backdrop-blur md:p-4">
          <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
            <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/30 px-4 py-3">
              <div>
                <p className="section-label">Apresentacao imersiva</p>
                <p className="mt-1 text-sm text-[color:var(--ink-2)]">{heroTitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ThemeSettingsButton />
                <button
                  type="button"
                  onClick={() => setIsImmersiveChatOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                >
                  <BellRing size={14} />
                  {isImmersiveChatOpen ? "fechar chat" : "abrir chat"}
                </button>
                <button
                  type="button"
                  onClick={handleWikiToggle}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                >
                  <Sparkles size={14} />
                  {wikiOpen ? "fechar wiki" : "wiki"}
                </button>
                {(!followMaster || localPresentationMode === "immersive") && (
                  <button
                    type="button"
                    onClick={() => setLocalPresentationMode("standard")}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                  >
                    <Expand size={14} />
                    sair
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsImmersiveMinimized(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                >
                  <Shrink size={14} />
                  minimizar
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {renderedImmersiveStage}

              {isImmersiveChatOpen && (
                <div className="absolute right-4 top-4 z-[95] h-[min(78vh,760px)] w-[min(420px,92vw)]">
                  <ChatPanel sessionCode={session.code} viewer={viewer} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="surface-panel-strong overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                <Sparkles size={14} />
                olhar do viajante
              </span>
              <h1 className="mt-3 text-3xl font-semibold text-white">{heroTitle}</h1>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
                {heroBlurb}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ThemeSettingsButton />
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                <p className="section-label">sala</p>
                <p className="mt-1 font-mono text-sm text-white">{session.code}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFollowMasterToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                followMaster
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              }`}
            >
              <RadioTower size={14} />
              {followMaster ? "seguindo o mestre" : "modo livre"}
            </button>

            <button
              type="button"
              onClick={handleWikiToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                wikiOpen
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              }`}
            >
              <Sparkles size={14} />
              {wikiOpen ? "fechar wiki" : "abrir wiki"}
            </button>

            {(
              [
                ["theater", "ultimo teatro", Theater],
                ["tactical", "ultimo mapa", Map]
              ] as const
            ).map(([modeId, label, Icon]) => (
              <button
                key={modeId}
                type="button"
                onClick={() => {
                  setFollowMaster(false);
                  setWikiOpen(false);
                  setLocalStageMode(modeId);
                  setLocalPresentationMode("standard");
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  !wikiOpen && effectiveStageMode === modeId
                    ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsStatusDrawerOpen((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                isStatusDrawerOpen
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              }`}
            >
              <Shield size={14} />
              {isStatusDrawerOpen ? "fechar ficha" : "minha ficha"}
            </button>

            <button
              type="button"
              onClick={() =>
                setLocalPresentationMode((current) =>
                  current === "immersive" ? "standard" : "immersive"
                )
              }
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                localPresentationMode === "immersive" || effectivePresentationMode === "immersive"
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              }`}
            >
              {localPresentationMode === "immersive" || effectivePresentationMode === "immersive" ? (
                <Shrink size={14} />
              ) : (
                <Expand size={14} />
              )}
              tela cheia
            </button>

            {activeTrack && (
              <span className="hud-chip border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <Music4 size={14} />
                tocando {activeTrack.title}
              </span>
            )}
          </div>
        </header>

        {!viewer && (
          <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-50">
            Este navegador ainda nao entrou nesta sala como jogador. Voce consegue
            ver a sessao, mas a edicao da ficha fica bloqueada ate entrar pelo lobby.
          </div>
        )}

        {syncNotice && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
            <span>{syncNotice}</span>
            {!followMaster && (
              <button
                type="button"
                onClick={handleFollowNow}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50 transition hover:border-amber-300/40"
              >
                <ChevronRight size={14} />
                acompanhar agora
              </button>
            )}
          </div>
        )}

        {activeTrack && (audioUnlockRequired || audioRuntimeError) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
            <span>
              {audioRuntimeError ??
                "A trilha esta ativa, mas esta aba precisa liberar o audio para acompanhar a mesa."}
            </span>
            <button
              type="button"
              onClick={requestAudioUnlock}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/28 bg-amber-300/14 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50 transition hover:border-amber-300/45"
            >
              <Music4 size={14} />
              ativar audio
            </button>
          </div>
        )}

        <SessionStatusDrawer
          sessionCode={session.code}
          viewer={viewer}
          participants={participants}
          party={roster}
          characters={liveCharacters}
          assets={liveAssets}
          open={isStatusDrawerOpen}
          onOpenChange={setIsStatusDrawerOpen}
        />

        {showInlineStage && renderedStage}

        {effectivePresentationMode === "immersive" && resolvedImmersiveMinimized && (
          <button
            type="button"
            onClick={() => setIsImmersiveMinimized(false)}
            className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-rose-300/22 bg-rose-300/12 px-4 py-3 text-sm font-semibold text-rose-50 shadow-[0_14px_40px_rgba(2,6,23,0.38)] transition hover:border-rose-300/35"
          >
            <Expand size={16} />
            reabrir palco
          </button>
        )}

        {currentCharacter ? (
          <section className="surface-panel p-5">
            <div className="flex items-start gap-4">
              <AssetAvatar
                imageUrl={currentAsset?.secureUrl}
                label={currentCharacter.name}
                kind={currentAsset?.kind}
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="section-label">Minha ficha</p>
                <h3 className="mt-2 truncate text-2xl font-semibold text-white">
                  {currentCharacter.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">
                    ordem #{initiativeIndex ?? "--"}
                  </span>
                  <span className="hud-chip border-amber-300/20 bg-amber-300/8 text-amber-100">
                    init{" "}
                    {currentCharacter.initiative >= 0
                      ? `+${currentCharacter.initiative}`
                      : currentCharacter.initiative}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "hp" as const,
                  label: "PV",
                  icon: HeartPulse,
                  value: `${currentCharacter.hp}/${currentCharacter.hpMax}`,
                  tone: "border-rose-300/15 bg-rose-300/10 text-rose-100"
                },
                {
                  key: "fp" as const,
                  label: "PF",
                  icon: MoonStar,
                  value: `${currentCharacter.fp}/${currentCharacter.fpMax}`,
                  tone: "border-amber-300/15 bg-amber-300/10 text-amber-100"
                }
              ].map((resource) => (
                <article
                  key={resource.key}
                  className={`rounded-[22px] border p-4 ${resource.tone}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/14">
                      <resource.icon size={18} />
                    </div>
                    <div>
                      <p className="section-label text-current">{resource.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {resource.value}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {[-1, 1].map((delta) => (
                      <button
                        key={`${resource.key}:${delta}`}
                        type="button"
                        onClick={() => handleResourceDelta(resource.key, delta)}
                        disabled={isPending || !canControlCurrentCharacter}
                        className="rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                      >
                        {pendingKey === `${resource.key}:${delta}` ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : delta > 0 ? (
                          `+${delta}`
                        ) : (
                          `${delta}`
                        )}
                      </button>
                    ))}
                  </div>
                </article>
              ))}

              <article className="surface-panel p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-100">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="section-label">Estado</p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {currentCharacter.hp <= 0
                        ? "caido"
                        : currentCharacter.hp <= Math.ceil(currentCharacter.hpMax / 3)
                          ? "ferido"
                          : "pronto"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="surface-panel p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-100">
                    <Swords size={18} />
                  </div>
                  <div>
                    <p className="section-label">Iniciativa</p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {initiativeIndex ? `${initiativeIndex}o na fila` : "aguardando"}
                    </p>
                  </div>
                </div>
              </article>
            </div>

            {feedback && <p className="mt-4 text-sm text-amber-100">{feedback}</p>}
          </section>
        ) : (
          <section className="surface-panel p-5">
            <p className="text-sm leading-6 text-[color:var(--ink-2)]">
              Nenhuma ficha foi vinculada a este navegador ainda. O mestre precisa
              criar uma ficha do tipo player e associa-la ao seu nome na sala.
            </p>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="surface-panel p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-300/10 text-rose-100">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="section-label">
                  {effectiveStageMode === "tactical"
                    ? "Tokens"
                    : effectiveStageMode === "atlas"
                      ? "Pins"
                      : "Elenco"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {effectiveStageMode === "tactical"
                    ? activeMapTokens.length
                    : effectiveStageMode === "atlas"
                      ? activeAtlasPins.length
                      : activeEntries.length}
                </p>
              </div>
            </div>
          </article>

          <article className="surface-panel p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-100">
                <RadioTower size={18} />
              </div>
              <div>
                <p className="section-label">Presenca</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {roster.filter((member) => member.status !== "offline").length}
                </p>
              </div>
            </div>
          </article>

          <article className="surface-panel p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-100">
                <Shield size={18} />
              </div>
              <div>
                <p className="section-label">
                  {effectiveStageMode === "tactical"
                    ? "Mapa"
                    : effectiveStageMode === "atlas"
                      ? "Atlas"
                      : "Cena"}
                </p>
                <p className="mt-1 text-base font-semibold text-white">
                  {effectiveStageMode === "tactical"
                    ? activeMap?.name ?? "sem campo"
                    : effectiveStageMode === "atlas"
                      ? activeAtlasMap?.name ?? "sem atlas"
                      : activeScene?.name ?? "sem palco"}
                </p>
              </div>
            </div>
          </article>

          <article className="surface-panel p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-100">
                <BellRing size={18} />
              </div>
              <div>
                <p className="section-label">Alertas</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {pendingPrivateEvents.length > 0 ? `${pendingPrivateEvents.length} ativos` : "limpo"}
                </p>
              </div>
            </div>
          </article>
        </section>

        <BottomDock
          snapshot={session}
          viewer={viewer}
          activeTab={activeDockTab}
          onTabChange={setActiveDockTab}
          showAudio={false}
        />
      </div>
    </main>
  );
}

