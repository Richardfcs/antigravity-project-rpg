"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BellRing,
  ChevronRight,
  Expand,
  Map,
  Music4,
  RadioTower,
  ScrollText,
  Shield,
  Shrink,
  Sparkles
} from "lucide-react";

import { playerExecuteManeuverAction } from "@/app/actions/combat-actions";
import { moveMapTokenAction } from "@/app/actions/map-actions";
import { AudioSyncLayer } from "@/components/audio/audio-sync-layer";
import { PlayerCombatPromptOverlay } from "@/components/combat/player-combat-prompt-overlay";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { ImmersiveOverlays } from "@/components/effects/immersive-overlays";
import { SessionEffectOverlays } from "@/components/effects/session-effect-overlays";
import { AppDrawer } from "@/components/layout/app-drawer";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { AppTray } from "@/components/layout/app-tray";
import { AtlasStage } from "@/components/stage/atlas-stage";
import { TacticalMapStage } from "@/components/stage/tactical-map-stage";
import { TheaterStage } from "@/components/stage/theater-stage";
import { ThemeSettingsButton } from "@/components/theme/theme-provider";
import { findActiveAudioTrack } from "@/lib/audio/selectors";
import {
  filterAtlasPinsForViewer,
  findActiveAtlasMap,
  listAtlasStagePins
} from "@/lib/atlas/selectors";
import {
  findCharacterByViewer,
  sortCharactersByInitiative
} from "@/lib/characters/selectors";
import {
  buildTacticalCombatState,
  findActiveMap,
  listMapStageTokens
} from "@/lib/maps/selectors";
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
import { useSessionMemory } from "@/hooks/use-session-memory";
import { useSessionNotes } from "@/hooks/use-session-notes";
import { useSessionPresence } from "@/hooks/use-session-presence";
import { useSessionScenes } from "@/hooks/use-session-scenes";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { useMobile } from "@/hooks/use-mobile";
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
import { useShallow } from "zustand/react/shallow";
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
import type { SessionMemoryRecord } from "@/types/session-memory";
import type { SessionNoteRecord } from "@/types/note";
import type { OnlinePresence } from "@/types/presence";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type { CombatDraftAction } from "@/types/combat";
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
  notes: SessionNoteRecord[];
  memoryEvents: SessionMemoryRecord[];
  viewer: SessionViewerIdentity | null;
}

const BottomDock = dynamic(
  () => import("@/components/panels/bottom-dock").then((mod) => mod.BottomDock),
  { ssr: false }
);
const ChatPanel = dynamic(
  () => import("@/components/panels/chat-panel").then((mod) => mod.ChatPanel),
  { ssr: false }
);
const SessionStatusDrawer = dynamic(
  () =>
    import("@/components/panels/session-status-drawer").then(
      (mod) => mod.SessionStatusDrawer
    ),
  { ssr: false }
);

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
  notes,
  memoryEvents,
  viewer
}: PlayerShellProps) {
  const storedSnapshot = useSessionStore((state) => state.snapshot);
  const patchSnapshot = useSessionStore((state) => state.patchSnapshot);
  const members = usePresenceStore((state) => state.members);
  const storedAssets = useAssetStore((state) => state.assets);
  const { storedCharacters, upsertCharacter } = useCharacterStore(
    useShallow((state) => ({
      storedCharacters: state.characters,
      upsertCharacter: state.upsertCharacter
    }))
  );
  const { storedScenes, storedSceneCast } = useSceneStore(
    useShallow((state) => ({
      storedScenes: state.scenes,
      storedSceneCast: state.sceneCast
    }))
  );
  const { storedMaps, storedMapTokens, upsertMapToken } = useMapStore(
    useShallow((state) => ({
      storedMaps: state.maps,
      storedMapTokens: state.mapTokens,
      upsertMapToken: state.upsertMapToken
    }))
  );
  const { storedAtlasMaps, storedAtlasPins, storedAtlasPinCharacters } = useAtlasStore(
    useShallow((state) => ({
      storedAtlasMaps: state.atlasMaps,
      storedAtlasPins: state.atlasPins,
      storedAtlasPinCharacters: state.atlasPinCharacters
    }))
  );
  const {
    activeDockTab,
    setActiveDockTab,
    followMaster,
    setFollowMaster,
    playerBottomTab,
    setPlayerBottomTab,
    playerOverlay,
    setPlayerOverlay
  } =
    useUiShellStore(
      useShallow((state) => ({
        activeDockTab: state.activeDockTab,
        setActiveDockTab: state.setActiveDockTab,
        followMaster: state.followMaster,
        setFollowMaster: state.setFollowMaster,
        playerBottomTab: state.playerBottomTab,
        setPlayerBottomTab: state.setPlayerBottomTab,
        playerOverlay: state.playerOverlay,
        setPlayerOverlay: state.setPlayerOverlay
      }))
    );
  const pendingPrivateEvents = useImmersiveEventStore((state) => state.events);
  const {
    storedTracks,
    storedPlayback,
    audioUnlockRequired,
    audioRuntimeError,
    requestAudioUnlock
  } = useAudioStore(
    useShallow((state) => ({
      storedTracks: state.tracks,
      storedPlayback: state.playback,
      audioUnlockRequired: state.unlockRequired,
      audioRuntimeError: state.runtimeError,
      requestAudioUnlock: state.requestUnlock
    }))
  );

  const [feedback, setFeedback] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [localStageMode, setLocalStageMode] = useState<StageMode>(snapshot.stageMode);
  const [localPresentationMode, setLocalPresentationMode] = useState<PresentationMode>(
    snapshot.presentationMode
  );
  const [atlasNavigation, setAtlasNavigation] = useState<{
    sourceAtlasMapId: string | null;
    targetAtlasMapId: string | null;
  } | null>(null);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [isImmersiveChatOpen, setIsImmersiveChatOpen] = useState(false);
  const [isImmersiveMinimized, setIsImmersiveMinimized] = useState(false);
  const [lastBroadcastStageMode, setLastBroadcastStageMode] = useState<StageMode>(
    snapshot.stageMode === "tactical" ? "tactical" : "theater"
  );
  const [lastBroadcastPresentationMode, setLastBroadcastPresentationMode] =
    useState<PresentationMode>(
      snapshot.stageMode === "atlas" ? "standard" : snapshot.presentationMode
    );
  const [, startTransition] = useTransition();
  const isMobile = useMobile();
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

  useSessionNotes({
    sessionCode: snapshot.code,
    initialNotes: notes,
    enabled: true
  });

  useSessionMemory({
    sessionCode: snapshot.code,
    initialEvents: memoryEvents,
    enabled: Boolean(viewer)
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
  const activeScene = findActiveScene(liveScenes, session.activeSceneId);
  const activeEntries = activeScene
    ? listSceneCastEntries(activeScene.id, liveSceneCast, liveCharacters, liveAssets)
    : [];
  const backgroundAsset = activeScene
    ? liveAssets.find((asset) => asset.id === activeScene.backgroundAssetId) ?? null
    : null;
  const activeMap = findActiveMap(liveMaps, session.activeMapId);
  const activeMapTokens = useMemo(
    () =>
      activeMap
        ? listMapStageTokens(activeMap.id, liveMapTokens, liveCharacters, liveAssets)
        : [],
    [activeMap, liveAssets, liveCharacters, liveMapTokens]
  );
  const tacticalCombatState = useMemo(
    () =>
      buildTacticalCombatState({
        enabled: session.combatEnabled,
        round: session.combatRound,
        turnIndex: session.combatTurnIndex,
        activeTokenId: session.combatActiveTokenId,
        entries: activeMapTokens
      }),
    [
      activeMapTokens,
      session.combatActiveTokenId,
      session.combatEnabled,
      session.combatRound,
      session.combatTurnIndex
    ]
  );
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
  const playerVisibleAtlasPins = filterAtlasPinsForViewer(liveAtlasPins, false);
  const activeAtlasPins = displayedAtlasMap
    ? listAtlasStagePins(
        displayedAtlasMap.id,
        playerVisibleAtlasPins,
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

  const patchCombatSnapshot = (
    nextSession: Awaited<ReturnType<typeof playerExecuteManeuverAction>>["session"]
  ) => {
    if (!nextSession) {
      return;
    }

    patchSnapshot({
      combatEnabled: nextSession.combatEnabled,
      combatRound: nextSession.combatRound,
      combatTurnIndex: nextSession.combatTurnIndex,
      combatActiveTokenId: nextSession.combatActiveTokenId,
      combatFlow: nextSession.combatFlow
    });
  };

  const handleExecuteCombatAction = (action: CombatDraftAction) => {
    setFeedback(null);

    startTransition(async () => {
      const result = await playerExecuteManeuverAction({
        sessionCode: session.code,
        action
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Falha ao executar a manobra.");
        return;
      }

      patchCombatSnapshot(result.session);
      result.characters?.forEach((character) => upsertCharacter(character));
      setSyncNotice(result.message ?? "Manobra enviada para a mesa.");
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

  const handleFollowMasterToggle = () => {
    const nextValue = !followMaster;

    if (nextValue) {
      setLocalStageMode(broadcastStageMode);
      setLocalPresentationMode(broadcastPresentationMode);
      setIsImmersiveMinimized(false);
      setWikiOpen(false);
      setPlayerBottomTab("stage");
      setPlayerOverlay("none");
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
    setPlayerBottomTab("stage");
    setPlayerOverlay("none");
    setSyncNotice("Sessao alinhada com o foco atual do mestre.");
  };

  const handleWikiToggle = () => {
    setWikiOpen((current) => {
      const nextValue = !current;

      if (nextValue) {
        setPlayerBottomTab("wiki");
        setLocalPresentationMode("standard");
        setIsImmersiveMinimized(false);
        setIsImmersiveChatOpen(false);
        setPlayerOverlay("none");
      } else {
        setPlayerBottomTab("stage");
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
        backgroundAsset={activeMapBackground}
        tokens={activeMapTokens}
        combatState={tacticalCombatState}
        combatFlow={session.combatFlow}
        viewerParticipantId={viewer?.participantId}
        canManageTokens={false}
        onMoveToken={handleMoveToken}
        onExecuteCombatAction={handleExecuteCombatAction}
        viewMode="workspace"
      />
    ) : effectiveStageMode === "atlas" ? (
      <AtlasStage
        key={displayedAtlasMap?.id ?? "empty-atlas"}
        sessionCode={session.code}
        atlasMap={displayedAtlasMap}
        atlasMaps={liveAtlasMaps}
        backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
        backgroundAsset={activeAtlasBackground}
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
        backgroundAsset={activeMapBackground}
        tokens={activeMapTokens}
        combatState={tacticalCombatState}
        combatFlow={session.combatFlow}
        viewerParticipantId={viewer?.participantId}
        canManageTokens={false}
        onMoveToken={handleMoveToken}
        onExecuteCombatAction={handleExecuteCombatAction}
        viewMode="focus"
      />
    ) : effectiveStageMode === "atlas" ? (
      <AtlasStage
        key={`${displayedAtlasMap?.id ?? "empty-atlas"}:immersive`}
        sessionCode={session.code}
        atlasMap={displayedAtlasMap}
        atlasMaps={liveAtlasMaps}
        backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
        backgroundAsset={activeAtlasBackground}
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
  const supportTrayOpen = !isMobile || playerBottomTab !== "stage";

  const handlePlayerViewJump = (
    target: "stage" | "wiki" | "sheet" | "chat" | "notes"
  ) => {
    if (target === "wiki") {
      setPlayerBottomTab("wiki");
      setPlayerOverlay("none");
      setWikiOpen(true);
      setLocalPresentationMode("standard");
      setIsImmersiveMinimized(false);
      setIsImmersiveChatOpen(false);
      return;
    }

    if (target === "sheet") {
      setPlayerBottomTab("sheet");
      setPlayerOverlay("sheet");
      return;
    }

    if (target === "chat") {
      setPlayerBottomTab("chat");
      setPlayerOverlay("none");
      setActiveDockTab("chat");
      return;
    }

    if (target === "notes") {
      setPlayerBottomTab("notes");
      setPlayerOverlay("none");
      setActiveDockTab("notes");
      return;
    }

    setPlayerBottomTab("stage");
    setPlayerOverlay("none");
    setWikiOpen(false);
  };

  return (
    <main className="daimyo-shell-bg min-h-screen px-3 py-3 sm:px-4">
      <AudioSyncLayer />
      <SessionEffectOverlays viewerParticipantId={viewer?.participantId} />
      <ImmersiveOverlays sessionCode={session.code} />
      <PlayerCombatPromptOverlay
        sessionCode={session.code}
        events={pendingPrivateEvents}
        heroName={currentCharacter?.name ?? null}
      />
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
      <div className="mx-auto flex max-w-6xl flex-col gap-3 pb-20 lg:pb-3">
        <AppTopBar
          title={heroTitle}
          eyebrow={
            <>
              <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
                sala {session.code}
              </span>
              <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
                {followMaster ? "seguindo o mestre" : "modo livre"}
              </span>
              {activeTrack ? (
                <span className="hud-chip border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                  <Music4 size={12} />
                  {activeTrack.title}
                </span>
              ) : null}
            </>
          }
          actions={<ThemeSettingsButton />}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["stage", "palco", Sparkles],
                ["wiki", "wiki", Map],
                ["sheet", "ficha", Shield],
                ["chat", "conversa", BellRing],
                ["notes", "caderno", ScrollText]
              ] as const
            ).map(([target, label, Icon]) => (
              <button
                key={target}
                type="button"
                onClick={() => handlePlayerViewJump(target)}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                  (target === "stage" && !wikiOpen && playerOverlay === "none") ||
                  (target === "wiki" && wikiOpen) ||
                  (target === "sheet" && playerOverlay === "sheet") ||
                  (target === "chat" && activeDockTab === "chat" && playerBottomTab === "chat") ||
                  (target === "notes" && activeDockTab === "notes" && playerBottomTab === "notes")
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleFollowMasterToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                followMaster
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              }`}
            >
              <RadioTower size={14} />
              {followMaster ? "seguir" : "livre"}
            </button>

            <button
              type="button"
              onClick={() =>
                setLocalPresentationMode((current) =>
                  current === "immersive" ? "standard" : "immersive"
                )
              }
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
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
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {currentCharacter ? (
              <>
                <span className="hud-chip border-rose-300/15 bg-rose-300/10 text-rose-100">
                  {currentCharacter.hp}/{currentCharacter.hpMax} PV
                </span>
                <span className="hud-chip border-amber-300/15 bg-amber-300/10 text-amber-100">
                  {currentCharacter.fp}/{currentCharacter.fpMax} PF
                </span>
              </>
            ) : null}
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {effectiveStageMode === "tactical"
                ? `${activeMapTokens.length} tokens`
                : effectiveStageMode === "atlas"
                  ? `${activeAtlasPins.length} pins`
                  : `${activeEntries.length} em cena`}
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {roster.filter((member) => member.status !== "offline").length} online
            </span>
            {pendingPrivateEvents.length > 0 ? (
              <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
                {pendingPrivateEvents.length} alertas
              </span>
            ) : null}
          </div>
        </AppTopBar>

        {!viewer ? (
          <div className="rounded-[16px] border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-xs text-amber-50">
            Entre pelo lobby para vincular sua ficha a esta mesa.
          </div>
        ) : null}

        {syncNotice ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-amber-300/18 bg-amber-300/10 px-3 py-2 text-xs text-amber-50">
            <span>{syncNotice}</span>
            {!followMaster ? (
              <button
                type="button"
                onClick={handleFollowNow}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:border-amber-300/40"
              >
                <ChevronRight size={14} />
                acompanhar
              </button>
            ) : null}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-[16px] border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-50">
            {feedback}
          </div>
        ) : null}

        {activeTrack && (audioUnlockRequired || audioRuntimeError) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-50">
            <span>
              {audioRuntimeError ??
                "A trilha esta ativa, mas esta aba ainda precisa liberar o audio."}
            </span>
            <button
              type="button"
              onClick={requestAudioUnlock}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/28 bg-amber-300/14 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:border-amber-300/45"
            >
              <Music4 size={14} />
              ativar audio
            </button>
          </div>
        ) : null}

        {showInlineStage ? renderedStage : null}

        <AppDrawer
          title={currentCharacter?.name ?? "Minha ficha"}
          open={playerOverlay === "sheet"}
          onClose={() => setPlayerOverlay("none")}
          className="lg:fixed lg:right-4 lg:top-4 lg:bottom-4 lg:z-[70] lg:w-[360px]"
        >
          <SessionStatusDrawer
            sessionCode={session.code}
            viewer={viewer}
            participants={participants}
            party={roster}
            characters={liveCharacters}
            assets={liveAssets}
            defaultOpen
            embedded
          />
        </AppDrawer>

        <AppTray
          title="Apoio"
          open={supportTrayOpen}
          onToggle={() => setPlayerBottomTab(!supportTrayOpen ? "chat" : "stage")}
        >
          <div className="h-[min(38vh,25rem)] min-h-[220px] max-h-[min(38vh,25rem)] overflow-hidden">
            <BottomDock
              snapshot={session}
              viewer={viewer}
              activeTab={activeDockTab}
              onTabChange={setActiveDockTab}
              showAudio={false}
              embedded
            />
          </div>
        </AppTray>

        {effectivePresentationMode === "immersive" && resolvedImmersiveMinimized ? (
          <button
            type="button"
            onClick={() => setIsImmersiveMinimized(false)}
            className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-rose-300/22 bg-rose-300/12 px-4 py-3 text-sm font-semibold text-rose-50 shadow-[0_14px_40px_rgba(2,6,23,0.38)] transition hover:border-rose-300/35"
          >
            <Expand size={16} />
            reabrir palco
          </button>
        ) : null}
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-[65] flex items-center justify-between gap-2 rounded-[18px] border border-white/10 bg-[rgba(6,10,18,0.92)] px-2 py-2 shadow-[0_16px_40px_rgba(2,6,23,0.36)] backdrop-blur lg:hidden">
        {(
          [
            ["stage", "palco", Sparkles],
            ["wiki", "wiki", Map],
            ["sheet", "ficha", Shield],
            ["chat", "chat", BellRing],
            ["notes", "notas", ScrollText]
          ] as const
        ).map(([target, label, Icon]) => {
          const active =
            (target === "stage" && playerBottomTab === "stage" && !wikiOpen) ||
            (target === "wiki" && wikiOpen) ||
            (target === "sheet" && playerOverlay === "sheet") ||
            (target === "chat" && playerBottomTab === "chat") ||
            (target === "notes" && playerBottomTab === "notes");

          return (
            <button
              key={target}
              type="button"
              onClick={() => handlePlayerViewJump(target)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                active
                  ? "bg-amber-300/10 text-amber-100"
                  : "text-[color:var(--ink-2)] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon size={15} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

