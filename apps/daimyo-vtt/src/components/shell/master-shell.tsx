"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  AudioLines,
  BookOpenText,
  Expand,
  Ghost,
  Map,
  MapPinned,
  MessagesSquare,
  Minimize2,
  ScrollText,
  ShieldAlert,
  Theater,
  UsersRound
} from "lucide-react";

import {
  setSessionCombatStateAction,
  setSessionPresentationModeAction,
  setSessionStageModeAction
} from "@/app/actions/session-actions";
import { moveMapTokenAction } from "@/app/actions/map-actions";
import { AudioSyncLayer } from "@/components/audio/audio-sync-layer";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { SessionEffectOverlays } from "@/components/effects/session-effect-overlays";
import { SessionCommandCenter } from "@/components/panels/session-command-center";
import { StagePanel } from "@/components/panels/stage-panel";
import { StageContextBar } from "@/components/panels/stage-context-bar";
import { AtlasStage } from "@/components/stage/atlas-stage";
import { TacticalMapStage } from "@/components/stage/tactical-map-stage";
import { TheaterStage } from "@/components/stage/theater-stage";
import { ThemeSettingsButton } from "@/components/theme/theme-provider";
import { useSessionAtlas } from "@/hooks/use-session-atlas";
import { useSessionAudio } from "@/hooks/use-session-audio";
import { useMobile } from "@/hooks/use-mobile";
import { useSessionEffects } from "@/hooks/use-session-effects";
import { useSessionAssets } from "@/hooks/use-session-assets";
import { useSessionBootstrap } from "@/hooks/use-session-bootstrap";
import { useSessionChat } from "@/hooks/use-session-chat";
import { useSessionCharacters } from "@/hooks/use-session-characters";
import { useSessionDiagnostics } from "@/hooks/use-session-diagnostics";
import { useSessionMaps } from "@/hooks/use-session-maps";
import { useSessionMemory } from "@/hooks/use-session-memory";
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
import { cn } from "@/lib/utils";
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
import type {
  ExplorerSection,
  PresentationMode,
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

const masterSections: Array<{
  id: ExplorerSection;
  label: string;
  icon: typeof Theater;
}> = [
  { id: "scenes", label: "Cenas", icon: Theater },
  { id: "maps", label: "Campos", icon: Map },
  { id: "codex", label: "Oficina", icon: BookOpenText },
  { id: "notes", label: "Notas", icon: ScrollText },
  { id: "actors", label: "Fichas", icon: UsersRound },
  { id: "atlas", label: "Atlas", icon: MapPinned },
  { id: "effects", label: "Efeitos", icon: Ghost },
  { id: "admin", label: "Dominio", icon: ShieldAlert },
  { id: "audio", label: "Trilhas", icon: AudioLines },
  { id: "chat", label: "Conversa", icon: MessagesSquare }
];

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

function SectionTabs({
  activeSection,
  onSelect,
  mobile = false
}: {
  activeSection: ExplorerSection;
  onSelect: (section: ExplorerSection) => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "grid grid-cols-4 gap-1.5" : "flex flex-wrap gap-2"}>
      {masterSections.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            mobile
              ? "mobile-shell-tab"
              : "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[color:var(--ink-2)] transition hover:border-amber-300/35 hover:bg-amber-300/10 hover:text-white",
            activeSection === item.id &&
              "border-amber-300/35 bg-amber-300/12 text-white"
          )}
        >
          <item.icon size={mobile ? 15 : 16} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

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
  const stagePanelRef = useRef<HTMLDivElement | null>(null);
  const statusDrawerRef = useRef<HTMLDivElement | null>(null);
  const supportPanelRef = useRef<HTMLDivElement | null>(null);
  const [mobileSupportPanel, setMobileSupportPanel] = useState<"explorer" | "dock">(
    "explorer"
  );
  const [atlasNavigation, setAtlasNavigation] = useState<{
    sourceAtlasMapId: string | null;
    targetAtlasMapId: string | null;
  } | null>(null);
  const [isImmersiveChatOpen, setIsImmersiveChatOpen] = useState(false);
  const [isImmersiveMinimized, setIsImmersiveMinimized] = useState(false);
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
    liveSupportOpen,
    setLiveSupportOpen
  } =
    useUiShellStore(
      useShallow((state) => ({
        activeSection: state.activeSection,
        setActiveSection: state.setActiveSection,
        activeDockTab: state.activeDockTab,
        setActiveDockTab: state.setActiveDockTab,
        masterMode: state.masterMode,
        setMasterMode: state.setMasterMode,
        liveSupportOpen: state.liveSupportOpen,
        setLiveSupportOpen: state.setLiveSupportOpen
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
  const storedCharacters = useCharacterStore((state) => state.characters);
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
  const showSupportPanels = masterMode === "prep" || liveSupportOpen;

  const scrollToRef = (targetRef: React.RefObject<HTMLDivElement | null>) => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };

  const scrollToSupportPanel = () => {
    scrollToRef(supportPanelRef);
  };

  const handleSectionSelect = (
    section: ExplorerSection,
    options?: { forceOpen?: boolean }
  ) => {
    setActiveSection(section);
    if (masterMode === "live" || options?.forceOpen) {
      setLiveSupportOpen(true);
    }
    if (isMobile) {
      setMobileSupportPanel("explorer");
    }
    scrollToSupportPanel();
  };

  const handleMasterModeChange = (mode: "prep" | "live") => {
    setMasterMode(mode);

    if (mode === "prep") {
      setLiveSupportOpen(false);
      scrollToSupportPanel();
      return;
    }

    setLiveSupportOpen(false);
    scrollToRef(stagePanelRef);
  };

  const handleJumpToArea = (area: "stage" | "status" | "support") => {
    if (area === "stage") {
      scrollToRef(stagePanelRef);
      return;
    }

    if (area === "status") {
      scrollToRef(statusDrawerRef);
      return;
    }

    if (masterMode === "live") {
      setLiveSupportOpen(true);
    }

    scrollToSupportPanel();
  };

  const renderStagePanel = () => (
    <div ref={stagePanelRef} className="space-y-4">
      <StageContextBar
        stageMode={session.stageMode}
        state={commandState}
        onOpenSection={(section) => handleSectionSelect(section, { forceOpen: true })}
      />

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
        onStageModeChange={handleStageModeChange}
        onPresentationModeChange={handlePresentationModeChange}
      />
    </div>
  );

  const renderStatusDrawer = () => (
    <div ref={statusDrawerRef}>
      <SessionStatusDrawer
        sessionCode={session.code}
        gmName={viewer?.displayName ?? null}
        viewer={viewer}
        participants={participants}
        party={roster}
        characters={liveCharacters}
        assets={liveAssets}
      />
    </div>
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

  const updateCombatState = (
    nextPatch: Partial<
      Pick<
        SessionShellSnapshot,
        "combatEnabled" | "combatRound" | "combatTurnIndex" | "combatActiveTokenId"
      >
    >,
    fallbackMessage: string
  ) => {
    const previousPatch = {
      combatEnabled: session.combatEnabled,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: session.combatActiveTokenId
    };

    patchSnapshot(nextPatch);
    setSessionFeedback(null);

    startTransition(async () => {
      const result = await setSessionCombatStateAction({
        sessionCode: session.code,
        combatEnabled: nextPatch.combatEnabled,
        combatRound: nextPatch.combatRound,
        combatTurnIndex: nextPatch.combatTurnIndex,
        combatActiveTokenId: nextPatch.combatActiveTokenId
      });

      if (!result.ok) {
        patchSnapshot(previousPatch);
        setSessionFeedback(result.message ?? fallbackMessage);
      }
    });
  };

  const handleCombatStart = () => {
    if (tacticalCombatState.turnOrder.length === 0) {
      setSessionFeedback("Adicione pelo menos um token ao campo para iniciar a ordem.");
      return;
    }

    updateCombatState(
      {
        combatEnabled: true,
        combatRound: 1,
        combatTurnIndex: 0,
        combatActiveTokenId: tacticalCombatState.turnOrder[0]?.token.id ?? null
      },
      "Falha ao iniciar a ordem de turno."
    );
  };

  const handleCombatStop = () => {
    updateCombatState(
      {
        combatEnabled: false,
        combatRound: 1,
        combatTurnIndex: 0,
        combatActiveTokenId: null
      },
      "Falha ao encerrar a ordem de turno."
    );
  };

  const handleCombatAdvance = (direction: "next" | "previous") => {
    if (tacticalCombatState.turnOrder.length === 0) {
      setSessionFeedback("Nao ha combatentes ativos neste campo.");
      return;
    }

    const totalTurns = tacticalCombatState.turnOrder.length;
    let nextIndex = tacticalCombatState.activeIndex;
    let nextRound = tacticalCombatState.round;

    if (direction === "next") {
      nextIndex += 1;
      if (nextIndex >= totalTurns) {
        nextIndex = 0;
        nextRound += 1;
      }
    } else {
      nextIndex -= 1;
      if (nextIndex < 0) {
        nextIndex = totalTurns - 1;
        nextRound = Math.max(1, nextRound - 1);
      }
    }

    updateCombatState(
      {
        combatEnabled: true,
        combatRound: nextRound,
        combatTurnIndex: nextIndex,
        combatActiveTokenId: tacticalCombatState.turnOrder[nextIndex]?.token.id ?? null
      },
      "Falha ao avancar a ordem de turno."
    );
  };

  const handleCombatSelect = (tokenId: string) => {
    const targetIndex = tacticalCombatState.turnOrder.findIndex(
      (entry) => entry.token.id === tokenId
    );

    if (targetIndex < 0) {
      return;
    }

    updateCombatState(
      {
        combatEnabled: true,
        combatRound: tacticalCombatState.round,
        combatTurnIndex: targetIndex,
        combatActiveTokenId: tokenId
      },
      "Falha ao destacar o combatente."
    );
  };

  const renderFocusedStage = () => {
    if (session.stageMode === "tactical") {
      return (
        <TacticalMapStage
          key={`${activeMap?.id ?? "empty-map"}:gm-immersive`}
          sessionCode={session.code}
          map={activeMap}
          backgroundUrl={activeMapBackground?.secureUrl ?? null}
          tokens={activeMapTokens}
          combatState={tacticalCombatState}
          canManageCombat={viewer?.role === "gm"}
          viewerParticipantId={viewer?.participantId}
          canManageTokens={viewer?.role === "gm"}
          assetOptions={liveAssets}
          characterOptions={liveCharacters}
          onMoveToken={handleMoveToken}
          onCombatStart={handleCombatStart}
          onCombatStop={handleCombatStop}
          onCombatAdvance={handleCombatAdvance}
          onSelectCombatant={handleCombatSelect}
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

      <main className="mx-auto max-w-[1680px] p-3 lg:p-4">
        <div className="mb-4 space-y-3">
          <SessionCommandCenter
            sessionCode={session.code}
            campaignName={session.campaignName}
            state={commandState}
            librarySummary={librarySummary}
            masterMode={masterMode}
            liveSupportOpen={liveSupportOpen}
            onMasterModeChange={handleMasterModeChange}
            onStageModeChange={handleStageModeChange}
            onOpenSection={(section) => handleSectionSelect(section, { forceOpen: true })}
            onJumpToArea={handleJumpToArea}
            onToggleLiveSupport={setLiveSupportOpen}
            memoryEvents={liveMemoryEvents}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <SectionTabs activeSection={activeSection} onSelect={handleSectionSelect} />
            <ThemeSettingsButton />
          </div>
        </div>

        <div className="mb-4">
          <AuthSessionBridge sessionCode={session.code} role="gm" viewer={viewer} />
        </div>

        {!viewer && (
          <div className="mb-4 rounded-[20px] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-50">
            Este navegador ainda nao esta vinculado como mestre desta sala. Entre pelo lobby ou use sua conta para restaurar o controle.
          </div>
        )}

        {sessionFeedback && (
          <div className="mb-4 rounded-[20px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-50">
            {sessionFeedback}
          </div>
        )}

        {isMobile ? (
          <div className="space-y-4 lg:hidden">
            {shouldRenderInlineStage && renderStagePanel()}
            {renderStatusDrawer()}

            <div ref={supportPanelRef}>
              {showSupportPanels ? (
                <>
                  <div className="mobile-shell-tabs">
                    <SectionTabs
                      activeSection={activeSection}
                      onSelect={handleSectionSelect}
                      mobile
                    />

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileSupportPanel("explorer")}
                        className={cn(
                          "mobile-shell-tab",
                          mobileSupportPanel === "explorer" &&
                            "border-amber-300/35 bg-amber-300/12 text-white"
                        )}
                      >
                        biblioteca
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileSupportPanel("dock")}
                        className={cn(
                          "mobile-shell-tab",
                          mobileSupportPanel === "dock" &&
                            "border-amber-300/35 bg-amber-300/12 text-white"
                        )}
                      >
                        chat e mesa
                      </button>
                    </div>
                  </div>

                  {mobileSupportPanel === "explorer" && (
                    <ExplorerPanel
                      snapshot={session}
                      party={roster}
                      participants={participants}
                      activeSection={activeSection}
                      viewer={viewer}
                      infra={infra}
                    />
                  )}

                  {mobileSupportPanel === "dock" && (
                    <BottomDock
                      snapshot={session}
                      viewer={viewer}
                      activeTab={activeDockTab}
                      onTabChange={setActiveDockTab}
                      showAudio
                    />
                  )}
                </>
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-[color:var(--ink-2)]">
                  Apoio recolhido para manter o foco no palco. Abra uma seção pelo
                  Conselho da sessão quando precisar preparar algo.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden min-h-0 gap-4 lg:grid">
            {shouldRenderInlineStage && renderStagePanel()}
            {renderStatusDrawer()}

            {session.presentationMode === "immersive" && resolvedImmersiveMinimized && (
              <button
                type="button"
                onClick={() => setIsImmersiveMinimized(false)}
                className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-rose-300/22 bg-rose-300/12 px-4 py-3 text-sm font-semibold text-rose-50 shadow-[0_14px_40px_rgba(2,6,23,0.38)] transition hover:border-rose-300/35"
              >
                <Expand size={16} />
                reabrir palco imersivo
              </button>
            )}

            <div ref={supportPanelRef}>
              {showSupportPanels ? (
                <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                  <ExplorerPanel
                    snapshot={session}
                    party={roster}
                    participants={participants}
                    activeSection={activeSection}
                    viewer={viewer}
                    infra={infra}
                  />

                  <BottomDock
                    snapshot={session}
                    viewer={viewer}
                    activeTab={activeDockTab}
                    onTabChange={setActiveDockTab}
                    showAudio
                  />
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5 text-sm leading-6 text-[color:var(--ink-2)]">
                  O modo <strong className="text-white">sessão ao vivo</strong> recolhe
                  a biblioteca e o apoio para o mestre conduzir sem ruído. Use o
                  Conselho da sessão para abrir cenas, campos, trilhas e ajustes sob
                  demanda.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

