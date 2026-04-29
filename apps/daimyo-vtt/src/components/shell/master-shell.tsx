"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import {
  MessagesSquare,
  Minimize2,
  Expand,
  X
} from "lucide-react";

import {
  setSessionPresentationModeAction,
  setSessionStageModeAction
} from "@/app/actions/session-actions";
import {
  advanceCombatTurnAction,
  executeCombatActionAction,
  gmTakeOverPlayerTurnAction,
  processStartOfTurnAction,
  respondCombatPromptAction,
  selectCombatantAction,
  skipTurnAction,
  startCombatEncounterAction,
  stopCombatEncounterAction
} from "@/app/actions/combat-actions";
import { adjustCharacterResourceAction } from "@/app/actions/character-actions";
import { moveMapTokenAction } from "@/app/actions/map-actions";
import { AudioSyncLayer } from "@/components/audio/audio-sync-layer";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { AppDrawer } from "@/components/layout/app-drawer";
import { AppTray } from "@/components/layout/app-tray";
import { SessionEffectOverlays } from "@/components/effects/session-effect-overlays";
import { SessionCommandCenter } from "@/components/panels/session-command-center";
import { StagePanel } from "@/components/panels/stage-panel";
import { AtlasStage } from "@/components/stage/atlas-stage";
import { TacticalMapStage } from "@/components/stage/tactical-map-stage";
import { TheaterStage } from "@/components/stage/theater-stage";
import { ThemeSettingsButton } from "@/components/theme/theme-provider";
import { useSessionAtlas } from "@/hooks/use-session-atlas";
import { useSessionAudio } from "@/hooks/use-session-audio";
import { useSessionEffects } from "@/hooks/use-session-effects";
import { useSessionAssets } from "@/hooks/use-session-assets";
import { useSessionBootstrap } from "@/hooks/use-session-bootstrap";
import { useSessionChat } from "@/hooks/use-session-chat";
import { useSessionCharacters } from "@/hooks/use-session-characters";
import { useSessionDiagnostics } from "@/hooks/use-session-diagnostics";
import { useSessionMaps } from "@/hooks/use-session-maps";
import { useSessionMemory } from "@/hooks/use-session-memory";
import { useMobile } from "@/hooks/use-mobile";
import { useSessionNotes } from "@/hooks/use-session-notes";
import { useSessionPresence } from "@/hooks/use-session-presence";
import { useSessionScenes } from "@/hooks/use-session-scenes";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { findActiveAtlasMap, listAtlasStagePins } from "@/lib/atlas/selectors";
import { buildSessionLibrarySummary } from "@/lib/library/summary";
import {
  buildTacticalCombatState,
  findActiveMap,
  listMapStageTokens
} from "@/lib/maps/selectors";
import { findActiveScene, listSceneCastEntries } from "@/lib/scenes/selectors";
import { buildSessionCommandState } from "@/lib/session/command-state";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import { useAudioStore } from "@/stores/audio-store";
import { useCharacterStore } from "@/stores/character-store";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import { useMapStore } from "@/stores/map-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useSceneStore } from "@/stores/scene-store";
import { useSessionStore } from "@/stores/session-store";
import { useSessionMemoryStore } from "@/stores/session-memory-store";
import { useUiShellStore } from "@/stores/ui-shell-store";
import { useLibraryOrganizationStore } from "@/stores/library-organization-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
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
import type { InfraReadiness } from "@/types/infra";
import type { SessionEffectLayerRecord } from "@/types/immersive-event";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";
import type { SessionMessageRecord } from "@/types/message";
import type { SessionMemoryRecord } from "@/types/session-memory";
import type { SessionNoteRecord } from "@/types/note";
import type { OnlinePresence } from "@/types/presence";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type { CombatDefenseOption, CombatDraftAction } from "@/types/combat";
import type {
  ExplorerSection,
  PresentationMode,
  MasterWorkspace,
  SessionParticipantRecord,
  SessionShellSnapshot,
  SessionViewerIdentity,
  StageMode
} from "@/types/session";

interface MasterShellProps {
  snapshot: SessionShellSnapshot;
  infra: InfraReadiness;
  party: OnlinePresence[];
  participants: SessionParticipantRecord[];
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
  effectLayers: SessionEffectLayerRecord[];
  notes: SessionNoteRecord[];
  memoryEvents: SessionMemoryRecord[];
  viewer: SessionViewerIdentity | null;
}

const ExplorerPanel = dynamic(
  () => import("@/components/panels/explorer-panel").then((mod) => mod.ExplorerPanel),
  { ssr: false }
);
const BottomDock = dynamic(
  () => import("@/components/panels/bottom-dock").then((mod) => mod.BottomDock),
  { ssr: false }
);
const SessionStatusDrawer = dynamic(
  () =>
    import("@/components/panels/session-status-drawer").then(
      (mod) => mod.SessionStatusDrawer
    ),
  { ssr: false }
);
const ChatPanel = dynamic(
  () => import("@/components/panels/chat-panel").then((mod) => mod.ChatPanel),
  { ssr: false }
);

export function MasterShell({
  snapshot,
  infra,
  party,
  participants,
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
  effectLayers,
  notes,
  memoryEvents,
  viewer
}: MasterShellProps) {
  const [atlasNavigation, setAtlasNavigation] = useState<{
    sourceAtlasMapId: string | null;
    targetAtlasMapId: string | null;
  } | null>(null);
  const [isImmersiveChatOpen, setIsImmersiveChatOpen] = useState(false);
  const [isImmersiveMinimized, setIsImmersiveMinimized] = useState(false);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isMobile = useMobile();
  const {
    activeSection,
    setActiveSection,
    activeDockTab,
    setActiveDockTab,
    masterMode,
    setMasterMode,
    masterWorkspace,
    setMasterWorkspace,
    masterDrawer,
    setMasterDrawer,
    supportTrayOpen,
    setSupportTrayOpen
  } =
    useUiShellStore(
      useShallow((state) => ({
        activeSection: state.activeSection,
        setActiveSection: state.setActiveSection,
        activeDockTab: state.activeDockTab,
        setActiveDockTab: state.setActiveDockTab,
        masterMode: state.masterMode,
        setMasterMode: state.setMasterMode,
        masterWorkspace: state.masterWorkspace,
        setMasterWorkspace: state.setMasterWorkspace,
        masterDrawer: state.masterDrawer,
        setMasterDrawer: state.setMasterDrawer,
        supportTrayOpen: state.supportTrayOpen,
        setSupportTrayOpen: state.setSupportTrayOpen
      }))
    );
  const libraryCollections = useLibraryOrganizationStore(
    (state) => state.sessions[snapshot.code]
  );

  const { storedSnapshot, patchSnapshot, setStageMode, setPresentationMode } = useSessionStore(
    useShallow((state) => ({
      storedSnapshot: state.snapshot,
      patchSnapshot: state.patchSnapshot,
      setStageMode: state.setStageMode,
      setPresentationMode: state.setPresentationMode
    }))
  );
  const members = usePresenceStore((state) => state.members);
  const storedAssets = useAssetStore((state) => state.assets);
  const { storedTracks, storedPlayback } = useAudioStore(
    useShallow((state) => ({
      storedTracks: state.tracks,
      storedPlayback: state.playback
    }))
  );
  const { storedCharacters, upsertCharacter } = useCharacterStore(
    useShallow((state) => ({
      storedCharacters: state.characters,
      upsertCharacter: state.upsertCharacter
    }))
  );
  const storedEffects = useEffectLayerStore((state) => state.effects);
  const storedMemoryEvents = useSessionMemoryStore((state) => state.events);
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

  useSessionBootstrap({
    snapshot,
    members: party,
    assets,
    characters,
    viewer,
    initialSyncState: infra.lobbyReady && viewer ? "booting" : "idle",
    initialLatencyLabel: infra.lobbyReady && viewer ? "syncing..." : "--"
  });

  useSessionPresence({
    sessionCode: snapshot.code,
    viewer,
    initialMembers: party,
    enabled: infra.lobbyReady
  });

  useSessionSnapshot({
    sessionId: snapshot.sessionId,
    enabled: infra.supabase
  });

  useSessionAssets({
    sessionId: snapshot.sessionId,
    initialAssets: assets,
    enabled: infra.supabase
  });

  useSessionCharacters({
    sessionId: snapshot.sessionId,
    initialCharacters: characters,
    enabled: infra.supabase
  });

  useSessionScenes({
    sessionId: snapshot.sessionId,
    initialScenes: scenes,
    initialSceneCast: sceneCast,
    enabled: infra.supabase
  });

  useSessionMaps({
    sessionId: snapshot.sessionId,
    initialMaps: maps,
    initialMapTokens: mapTokens,
    enabled: infra.supabase
  });

  useSessionAtlas({
    sessionId: snapshot.sessionId,
    initialAtlasMaps: atlasMaps,
    initialAtlasPins: atlasPins,
    initialAtlasPinCharacters: atlasPinCharacters,
    enabled: infra.supabase
  });

  useSessionChat({
    sessionId: snapshot.sessionId,
    initialMessages: messages,
    enabled: infra.supabase
  });

  useSessionAudio({
    sessionId: snapshot.sessionId,
    initialTracks: audioTracks,
    initialPlayback: audioState,
    enabled: infra.supabase
  });

  useSessionEffects({
    sessionId: snapshot.sessionId,
    initialEffects: effectLayers,
    enabled: infra.supabase
  });

  useSessionNotes({
    sessionCode: snapshot.code,
    initialNotes: notes,
    enabled: infra.supabase
  });

  useSessionMemory({
    sessionCode: snapshot.code,
    initialEvents: memoryEvents,
    enabled: infra.supabase && Boolean(viewer)
  });

  useSessionDiagnostics({
    enabled: true,
    syncState: (storedSnapshot ?? snapshot).syncState
  });

  const session = storedSnapshot ?? snapshot;
  const roster = members.length > 0 ? members : party;
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
  const liveTracks = storedTracks.length > 0 ? storedTracks : audioTracks;
  const livePlayback = storedPlayback ?? audioState;
  const liveEffects = storedEffects.length > 0 ? storedEffects : effectLayers;
  const liveMemoryEvents =
    storedMemoryEvents.length > 0 ? storedMemoryEvents : memoryEvents;
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
  const navigatedAtlasMapId =
    atlasNavigation?.sourceAtlasMapId === session.activeAtlasMapId
      ? atlasNavigation?.targetAtlasMapId ?? null
      : session.activeAtlasMapId;
  const displayedAtlasMap = findActiveAtlasMap(
    liveAtlasMaps,
    navigatedAtlasMapId
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
  const activeVenue =
    session.stageMode === "atlas"
      ? activeAtlasMap?.name ?? session.activeScene
      : session.stageMode === "tactical"
        ? activeMap?.name ?? session.activeScene
      : activeScene?.name ?? session.activeScene;
  const commandState = useMemo(
    () =>
      buildSessionCommandState({
        snapshot: session,
        party: roster,
        scenes: liveScenes,
        sceneCast: liveSceneCast,
        maps: liveMaps,
        mapTokens: liveMapTokens,
        atlasMaps: liveAtlasMaps,
        atlasPins: liveAtlasPins,
        assets: liveAssets,
        characters: liveCharacters,
        tracks: liveTracks,
        playback: livePlayback,
        effectLayers: liveEffects
      }),
    [
      liveAssets,
      liveAtlasMaps,
      liveAtlasPins,
      liveCharacters,
      liveEffects,
      liveMapTokens,
      liveMaps,
      livePlayback,
      liveSceneCast,
      liveScenes,
      liveTracks,
      roster,
      session
    ]
  );
  const librarySummary = useMemo(
    () =>
      buildSessionLibrarySummary({
        collections: libraryCollections,
        scenes: liveScenes,
        maps: liveMaps,
        atlasMaps: liveAtlasMaps,
        tracks: liveTracks,
        characters: liveCharacters
      }),
    [libraryCollections, liveAtlasMaps, liveCharacters, liveMaps, liveScenes, liveTracks]
  );

  const handleStageModeChange = (mode: StageMode) => {
    const previousStageMode = session.stageMode;
    setStageMode(mode);
    setMasterWorkspace("stage");
    setMasterDrawer("closed");
    setStatusDrawerOpen(false);
    setIsImmersiveChatOpen(false);
    setSessionFeedback(null);

    startTransition(async () => {
      const result = await setSessionStageModeAction({
        sessionCode: session.code,
        stageMode: mode
      });

      if (!result.ok) {
        setStageMode(previousStageMode);
        setSessionFeedback(
          result.message ?? "Falha ao sincronizar a troca de palco com a mesa."
        );
        return;
      }

      setStageMode(result.stageMode ?? mode);
    });
  };

  const handlePresentationModeChange = (mode: PresentationMode) => {
    const previousPresentationMode = session.presentationMode;
    const previousImmersiveMinimized = isImmersiveMinimized;
    const previousImmersiveChatOpen = isImmersiveChatOpen;

    setPresentationMode(mode);
    setSessionFeedback(null);

    if (mode === "immersive") {
      setIsImmersiveMinimized(false);
    } else {
      setIsImmersiveMinimized(false);
      setIsImmersiveChatOpen(false);
    }

    startTransition(async () => {
      const result = await setSessionPresentationModeAction({
        sessionCode: session.code,
        presentationMode: mode
      });

      if (!result.ok) {
        setPresentationMode(previousPresentationMode);
        setIsImmersiveMinimized(previousImmersiveMinimized);
        setIsImmersiveChatOpen(previousImmersiveChatOpen);
        setSessionFeedback(
          result.message ?? "Falha ao sincronizar o modo de apresentacao."
        );
        return;
      }

      setPresentationMode(result.presentationMode ?? mode);
    });
  };

  const resolvedImmersiveMinimized =
    session.presentationMode === "standard" ? false : isImmersiveMinimized;
  const shouldRenderInlineStage =
    session.presentationMode !== "immersive" || resolvedImmersiveMinimized;
  const libraryWorkspaceActive =
    masterMode === "prep" && masterWorkspace === "library";
  const resolvedDrawerSection = masterDrawer === "closed" ? activeSection : masterDrawer;
  const drawerTitleMap: Record<ExplorerSection, string> = {
    scenes: "Biblioteca",
    maps: "Biblioteca",
    actors: "Biblioteca",
    assets: "Biblioteca",
    codex: "Biblioteca",
    notes: "Biblioteca",
    atlas: "Biblioteca",
    effects: "Biblioteca",
    admin: "Biblioteca",
    audio: "Biblioteca",
    chat: "Biblioteca",
    oracle: "Biblioteca",
    campaign: "Campanha"
  };
  const drawerVisible = statusDrawerOpen || masterDrawer !== "closed";

  const handleSectionSelect = (
    section: ExplorerSection,
    options?: { forceOpen?: boolean }
  ) => {
    setActiveSection(section);
    if (!isMobile && masterMode === "prep") {
      setMasterWorkspace("library");
      setStatusDrawerOpen(false);
      setMasterDrawer("closed");
      return;
    }

    if (options?.forceOpen || masterMode === "prep") {
      setStatusDrawerOpen(false);
      setMasterDrawer(section);
    }
  };

  const handleMasterModeChange = (mode: "prep" | "live") => {
    setMasterMode(mode);

    if (mode === "prep") {
      setStatusDrawerOpen(false);
      setMasterWorkspace(isMobile ? "stage" : "library");
      setMasterDrawer("closed");
      return;
    }

    setMasterWorkspace("stage");
    setMasterDrawer("closed");
    setStatusDrawerOpen(false);
  };

  const handleToggleLibraryWorkspace = () => {
    setStatusDrawerOpen(false);
    setMasterDrawer("closed");

    if (masterWorkspace === "library" && masterMode === "prep") {
      setMasterMode("live");
      setMasterWorkspace("stage");
    } else {
      setMasterMode("prep");
      setMasterWorkspace("library");
    }
  };

  const handleOpenDrawer = (section?: ExplorerSection) => {
    const targetSection = section ?? activeSection;
    setActiveSection(targetSection);

    if (!isMobile && masterMode === "prep") {
      setStatusDrawerOpen(false);
      setMasterDrawer("closed");
      setMasterWorkspace("library");
      return;
    }

    if (isMobile && masterMode === "prep") {
      setStatusDrawerOpen(false);
      setMasterDrawer("closed");
      setMasterWorkspace("library");
      setActiveSection(targetSection);
      return;
    }

    setStatusDrawerOpen(false);
    setMasterDrawer(
      masterDrawer !== "closed" && resolvedDrawerSection === targetSection
        ? "closed"
        : targetSection
    );
  };

  const handleOpenStatus = () => {
    setMasterWorkspace("stage");
    setMasterDrawer("closed");
    setStatusDrawerOpen((current) => !current);
  };
  const handleToggleSupport = () => {
    setSupportTrayOpen(!supportTrayOpen);
  };

  const handleGmTakeOver = async (tokenId: string) => {
    setSessionFeedback(null);
    const result = await gmTakeOverPlayerTurnAction({
      sessionCode: session.code,
      tokenId
    });
    handleCombatResult(result, "Falha ao assumir o turno.");
  };

  const renderStagePanel = () => (
    <StagePanel
      snapshot={session}
      characters={liveCharacters}
      assets={liveAssets}
      scenes={liveScenes}
      sceneCast={liveSceneCast}
      maps={liveMaps}
      mapTokens={liveMapTokens}
      atlasMaps={liveAtlasMaps}
      atlasPins={liveAtlasPins}
      atlasPinCharacters={liveAtlasPinCharacters}
      viewer={viewer}
      memoryEvents={liveMemoryEvents}
      combatState={tacticalCombatState}
      combatFlow={session.combatFlow}
      canManageCombat={viewer?.role === "gm"}
      atlasMapIdOverride={
        navigatedAtlasMapId !== session.activeAtlasMapId ? navigatedAtlasMapId : null
      }
      onAtlasMapNavigate={(atlasMapId) =>
        setAtlasNavigation(
          atlasMapId
            ? {
                sourceAtlasMapId: session.activeAtlasMapId,
                targetAtlasMapId: atlasMapId
              }
            : null
        )
      }
      onCombatStart={handleCombatStart}
      onCombatStop={handleCombatStop}
      onCombatAdvance={handleCombatAdvance}
      onSelectCombatant={handleCombatSelect}
      onExecuteCombatAction={handleExecuteCombatAction}
      onRespondCombatPrompt={handleRespondCombatPrompt}
      onGmTakeOver={handleGmTakeOver}
      onSkipTurn={handleSkipTurn}
      onAdjustResource={handleAdjustResource}
      onStageModeChange={handleStageModeChange}
      onPresentationModeChange={handlePresentationModeChange}
      onRequestLibrary={handleOpenDrawer}
    />
  );

  const renderLibraryWorkspace = () => (
    <section className={cn(
      "surface-panel flex min-w-0 flex-col overflow-hidden",
      isMobile 
        ? "h-[calc(100vh-8rem)] min-h-0 max-h-[calc(100vh-8rem)]" 
        : "h-[calc(100vh-10rem)] min-h-[640px] max-h-[calc(100vh-10rem)]"
    )}>
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-2.5">
        <div className="min-w-0">
          <p className="section-label">Preparacao</p>
          <h2 className="truncate text-base font-semibold text-white">
            Biblioteca e edicao
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
            {drawerTitleMap[activeSection]}
          </span>
          <button
            type="button"
            onClick={() => setMasterWorkspace("stage")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            voltar ao palco
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2.5">
        <ExplorerPanel
          snapshot={session}
          party={roster}
          participants={participants}
          activeSection={activeSection}
          onSectionChange={handleSectionSelect}
          viewer={viewer}
          infra={infra}
          embedded
        />
      </div>
    </section>
  );

  const renderStatusDrawer = () => (
    <SessionStatusDrawer
      sessionCode={session.code}
      gmName={viewer?.displayName ?? null}
      viewer={viewer}
      participants={participants}
      party={roster}
      characters={liveCharacters}
      assets={liveAssets}
      defaultOpen
      embedded
    />
  );


  const handleMoveToken = (tokenId: string, x: number, y: number) => {
    startTransition(async () => {
      const result = await moveMapTokenAction({
        sessionCode: session.code,
        tokenId,
        x,
        y
      });

      if (result.ok && result.token) {
        upsertMapToken(result.token);
      }
    });
  };

  const patchCombatSnapshot = (
    nextSession:
      | Awaited<ReturnType<typeof startCombatEncounterAction>>["session"]
      | undefined
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

  const upsertCombatCharacters = (nextCharacters?: SessionCharacterRecord[]) => {
    nextCharacters?.forEach((character) => {
      upsertCharacter(character);
    });
  };

  const handleCombatResult = (
    result: Awaited<ReturnType<typeof executeCombatActionAction>>,
    fallbackMessage: string
  ) => {
    if (!result.ok) {
      setSessionFeedback(result.message ?? fallbackMessage);
      return;
    }

    patchCombatSnapshot(result.session);
    upsertCombatCharacters(result.characters);
    setSessionFeedback(result.message ?? null);
  };

  const handleCombatStart = async () => {
    if (tacticalCombatState.turnOrder.length === 0) {
      setSessionFeedback("Adicione pelo menos um token ao campo para iniciar a ordem.");
      return;
    }

    setSessionFeedback(null);
    const result = await startCombatEncounterAction({
      sessionCode: session.code
    });
    handleCombatResult(result, "Falha ao iniciar a ordem de turno.");
  };

  const handleCombatStop = async () => {
    setSessionFeedback(null);
    const result = await stopCombatEncounterAction({
      sessionCode: session.code
    });
    handleCombatResult(result, "Falha ao encerrar a ordem de turno.");
  };

  const handleSkipTurn = async () => {
    setSessionFeedback(null);
    const result = await skipTurnAction({
      sessionCode: session.code
    });
    handleCombatResult(result, "Falha ao pular o turno.");
  };

  const handleCombatAdvance = async (direction: "next" | "previous") => {
    if (tacticalCombatState.turnOrder.length === 0) {
      setSessionFeedback("Nao ha combatentes ativos neste campo.");
      return;
    }

    setSessionFeedback(null);
    const result = await advanceCombatTurnAction({
      sessionCode: session.code,
      direction
    });
    
    if (result.ok && result.session?.combatActiveTokenId && direction === "next") {
      // Processar efeitos de inicio de turno automaticamente ao avancar
      await processStartOfTurnAction({
        sessionCode: session.code,
        tokenId: result.session.combatActiveTokenId
      });
    }

    handleCombatResult(result, "Falha ao avancar a ordem de turno.");
  };

  const handleCombatSelect = async (tokenId: string) => {
    const targetIndex = tacticalCombatState.turnOrder.findIndex(
      (entry) => entry.token.id === tokenId
    );

    if (targetIndex < 0) {
      return;
    }

    setSessionFeedback(null);
    const result = await selectCombatantAction({
      sessionCode: session.code,
      tokenId
    });
    handleCombatResult(result, "Falha ao destacar o combatente.");
  };

  const handleAdjustResource = async (
    tokenId: string,
    resource: "hp" | "fp",
    delta: number
  ) => {
    const entry = activeMapTokens.find((t) => t.token.id === tokenId);
    if (!entry?.character?.id) {
      setSessionFeedback("Este token nao possui uma ficha vinculada.");
      return;
    }

    setSessionFeedback(null);
    const result = await adjustCharacterResourceAction({
      sessionCode: session.code,
      characterId: entry.character.id,
      resource,
      delta
    });

    if (!result.ok || !result.character) {
      setSessionFeedback(result.message || "Falha ao atualizar o recurso da ficha.");
      return;
    }

    upsertCharacter(result.character);
  };

  const handleExecuteCombatAction = async (action: CombatDraftAction) => {
    setSessionFeedback(null);
    const result = await executeCombatActionAction({
      sessionCode: session.code,
      action
    });
    handleCombatResult(result, "Falha ao executar a acao de combate.");
  };

  const handleRespondCombatPrompt = async (input: {
    eventId: string;
    defenseOption: CombatDefenseOption;
    retreat?: boolean;
    acrobatic?: boolean;
    feverish?: boolean;
    manualModifier?: number;
  }) => {
    setSessionFeedback(null);
    const result = await respondCombatPromptAction({
      sessionCode: session.code,
      eventId: input.eventId,
      defenseOption: input.defenseOption,
      retreat: input.retreat,
      acrobatic: input.acrobatic,
      feverish: input.feverish,
      manualModifier: input.manualModifier
    });
    handleCombatResult(result, "Falha ao resolver a defesa pendente.");
  };

  const renderFocusedStage = () => {
    if (session.stageMode === "tactical") {
      return (
        <TacticalMapStage
          key={`${activeMap?.id ?? "empty-map"}:gm-immersive`}
          sessionCode={session.code}
          map={activeMap}
          backgroundUrl={activeMapBackground?.secureUrl ?? null}
          backgroundAsset={activeMapBackground}
          tokens={activeMapTokens}
          combatState={tacticalCombatState}
          canManageCombat={viewer?.role === "gm"}
          viewerParticipantId={viewer?.participantId}
          canManageTokens={viewer?.role === "gm"}
          assetOptions={liveAssets}
          characterOptions={liveCharacters}
          onMoveToken={handleMoveToken}
          combatFlow={session.combatFlow}
          onCombatStart={handleCombatStart}
          onCombatStop={handleCombatStop}
          onCombatAdvance={handleCombatAdvance}
          onSelectCombatant={handleCombatSelect}
          onExecuteCombatAction={handleExecuteCombatAction}
          onRespondCombatPrompt={handleRespondCombatPrompt}
          onGmTakeOver={handleGmTakeOver}
          onSkipTurn={handleSkipTurn}
          onAdjustResource={handleAdjustResource}
          viewMode="focus"
        />
      );
    }

    if (session.stageMode === "atlas") {
      return (
        <AtlasStage
          key={`${displayedAtlasMap?.id ?? "empty-atlas"}:gm-immersive`}
          sessionCode={session.code}
          atlasMap={displayedAtlasMap}
          atlasMaps={liveAtlasMaps}
          backgroundUrl={activeAtlasBackground?.secureUrl ?? null}
          backgroundAsset={activeAtlasBackground}
          pins={activeAtlasPins}
          canEdit={viewer?.role === "gm"}
          assetOptions={liveAssets}
          characterOptions={liveCharacters}
          pinCharacterLinks={liveAtlasPinCharacters}
          revealHistory={liveMemoryEvents}
          onOpenSubmap={(atlasMapId) =>
            setAtlasNavigation({
              sourceAtlasMapId: session.activeAtlasMapId,
              targetAtlasMapId: atlasMapId
            })
          }
          onResetNavigation={() => setAtlasNavigation(null)}
          navigatingSubmap={Boolean(
            atlasNavigation?.targetAtlasMapId &&
              atlasNavigation?.sourceAtlasMapId === session.activeAtlasMapId
          )}
          onOpenScene={() => {
            setMasterWorkspace("stage");
            handleStageModeChange("theater");
          }}
          viewMode="focus"
        />
      );
    }

    return (
      <TheaterStage
        sceneName={activeScene?.name ?? session.activeScene}
        moodLabel={activeScene?.moodLabel ?? session.sceneMood}
        layoutMode={activeScene?.layoutMode ?? "line"}
        backgroundUrl={backgroundAsset?.secureUrl ?? null}
        entries={activeEntries}
        viewMode="focus"
      />
    );
  };

  return (
    <div className="daimyo-shell-bg min-h-screen text-white">
      <AudioSyncLayer />
      <SessionEffectOverlays viewerParticipantId={viewer?.participantId} allowPreview />

      {session.presentationMode === "immersive" && !resolvedImmersiveMinimized && (
        <div className="fixed inset-0 z-[90] bg-[rgba(2,6,23,0.88)] p-3 backdrop-blur md:p-4">
          <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
            <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/30 px-4 py-3">
              <div>
                <p className="section-label">Palco imersivo</p>
                <p className="mt-1 text-sm text-[color:var(--ink-2)]">{activeVenue}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ThemeSettingsButton />
                <button
                  type="button"
                  onClick={() => setIsImmersiveChatOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                >
                  <MessagesSquare size={14} />
                  {isImmersiveChatOpen ? "fechar chat" : "abrir chat"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePresentationModeChange("standard")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                >
                  <Expand size={14} />
                  sair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsImmersiveChatOpen(false);
                    setIsImmersiveMinimized(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                >
                  <Minimize2 size={14} />
                  minimizar localmente
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {renderFocusedStage()}

              {isImmersiveChatOpen && (
                <div className="absolute right-4 top-4 z-[95] h-[min(78vh,760px)] w-[min(420px,92vw)]">
                  <ChatPanel sessionCode={session.code} viewer={viewer} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1680px] p-2.5 lg:p-3">
        <div className="space-y-2">
          <SessionCommandCenter
            sessionCode={session.code}
            campaignName={session.campaignName}
            state={commandState}
            librarySummary={librarySummary}
            masterMode={masterMode}
            supportOpen={supportTrayOpen}
            libraryWorkspaceActive={libraryWorkspaceActive}
            onMasterModeChange={handleMasterModeChange}
            onStageModeChange={handleStageModeChange}
            onToggleLibraryWorkspace={handleToggleLibraryWorkspace}
            onOpenDrawer={handleOpenDrawer}
            onOpenStatus={handleOpenStatus}
            onToggleSupport={handleToggleSupport}
          />

          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-[12px] border border-white/10 bg-white/[0.04] px-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <AuthSessionBridge sessionCode={session.code} role="gm" viewer={viewer} />
              {!viewer ? (
                <button
                  type="button"
                  onClick={() => window.location.assign("/")}
                  className="hud-chip border-amber-300/18 bg-amber-300/8 text-amber-100 hover:bg-amber-300/15 transition-colors"
                >
                  mestre nao vinculado · clique para logar
                </button>
              ) : null}
            </div>
            <ThemeSettingsButton />
          </div>

          {sessionFeedback ? (
            <div className="rounded-[16px] border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-50">
              {sessionFeedback}
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-2.5">
              {libraryWorkspaceActive
                ? renderLibraryWorkspace()
                : shouldRenderInlineStage
                  ? renderStagePanel()
                  : null}


              <AppTray
                title="Apoio"
                open={supportTrayOpen}
                onToggle={handleToggleSupport}
              >
                <div className="h-[min(52vh,36rem)] min-h-[320px] max-h-[min(52vh,36rem)] overflow-hidden">
                  <BottomDock
                    snapshot={session}
                    viewer={viewer}
                    activeTab={activeDockTab}
                    onTabChange={setActiveDockTab}
                    showAudio
                    embedded
                  />
                </div>
              </AppTray>
            </div>

            {drawerVisible && !libraryWorkspaceActive ? (
              <div className={cn("min-w-0", !isMobile && "lg:w-[360px] xl:w-[390px]")}>
                <AppDrawer
                  title={
                    statusDrawerOpen
                      ? "Status gerais"
                      : drawerTitleMap[resolvedDrawerSection]
                  }
                  open={drawerVisible}
                  mobileMode="sheet"
                  onClose={
                    statusDrawerOpen
                      ? () => setStatusDrawerOpen(false)
                      : () => setMasterDrawer("closed")
                  }
                  className={cn(!isMobile && "lg:h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-10rem)] lg:w-full")}
                >
                  {statusDrawerOpen ? (
                    renderStatusDrawer()
                  ) : (
                    <ExplorerPanel
                      snapshot={session}
                      party={roster}
                      participants={participants}
                      activeSection={resolvedDrawerSection}
                      onSectionChange={handleSectionSelect}
                      viewer={viewer}
                      infra={infra}
                      embedded
                    />
                  )}
                </AppDrawer>
              </div>
            ) : null}
          </div>

          {session.presentationMode === "immersive" && resolvedImmersiveMinimized ? (
            <button
              type="button"
              onClick={() => setIsImmersiveMinimized(false)}
              className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-rose-300/22 bg-rose-300/12 px-4 py-3 text-sm font-semibold text-rose-50 shadow-[0_14px_40px_rgba(2,6,23,0.38)] transition hover:border-rose-300/35"
            >
              <Expand size={16} />
              reabrir palco imersivo
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

