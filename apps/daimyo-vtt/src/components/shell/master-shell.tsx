"use client";

import { useState, useTransition } from "react";
import {
  AudioLines,
  Expand,
  Ghost,
  Map,
  MapPinned,
  MessagesSquare,
  Minimize2,
  RadioTower,
  ShieldAlert,
  Theater,
  UsersRound
} from "lucide-react";

import {
  setSessionPresentationModeAction,
  setSessionStageModeAction
} from "@/app/actions/session-actions";
import { moveMapTokenAction } from "@/app/actions/map-actions";
import { AudioSyncLayer } from "@/components/audio/audio-sync-layer";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { SessionEffectOverlays } from "@/components/effects/session-effect-overlays";
import { BottomDock } from "@/components/panels/bottom-dock";
import { ChatPanel } from "@/components/panels/chat-panel";
import { ExplorerPanel } from "@/components/panels/explorer-panel";
import { SessionStatusDrawer } from "@/components/panels/session-status-drawer";
import { StagePanel } from "@/components/panels/stage-panel";
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
import { useSessionMaps } from "@/hooks/use-session-maps";
import { useSessionPresence } from "@/hooks/use-session-presence";
import { useSessionScenes } from "@/hooks/use-session-scenes";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { findActiveAtlasMap, listAtlasStagePins } from "@/lib/atlas/selectors";
import { findActiveMap, listMapStageTokens } from "@/lib/maps/selectors";
import { findActiveScene, listSceneCastEntries } from "@/lib/scenes/selectors";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import { useCharacterStore } from "@/stores/character-store";
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
import type { InfraReadiness } from "@/types/infra";
import type { SessionEffectLayerRecord } from "@/types/immersive-event";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";
import type { SessionMessageRecord } from "@/types/message";
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
  viewer: SessionViewerIdentity | null;
}

const masterSections: Array<{
  id: ExplorerSection;
  label: string;
  icon: typeof Theater;
}> = [
  { id: "scenes", label: "Cenas", icon: Theater },
  { id: "maps", label: "Campos", icon: Map },
  { id: "actors", label: "Fichas", icon: UsersRound },
  { id: "atlas", label: "Atlas", icon: MapPinned },
  { id: "effects", label: "Efeitos", icon: Ghost },
  { id: "admin", label: "Dominio", icon: ShieldAlert },
  { id: "audio", label: "Trilhas", icon: AudioLines },
  { id: "chat", label: "Conversa", icon: MessagesSquare }
];

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
  viewer
}: MasterShellProps) {
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
  const activeSection = useUiShellStore((state) => state.activeSection);
  const setActiveSection = useUiShellStore((state) => state.setActiveSection);
  const activeDockTab = useUiShellStore((state) => state.activeDockTab);
  const setActiveDockTab = useUiShellStore((state) => state.setActiveDockTab);

  const storedSnapshot = useSessionStore((state) => state.snapshot);
  const setStageMode = useSessionStore((state) => state.setStageMode);
  const setPresentationMode = useSessionStore((state) => state.setPresentationMode);
  const members = usePresenceStore((state) => state.members);
  const storedAssets = useAssetStore((state) => state.assets);
  const storedCharacters = useCharacterStore((state) => state.characters);
  const storedScenes = useSceneStore((state) => state.scenes);
  const storedSceneCast = useSceneStore((state) => state.sceneCast);
  const storedMaps = useMapStore((state) => state.maps);
  const storedMapTokens = useMapStore((state) => state.mapTokens);
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const storedAtlasMaps = useAtlasStore((state) => state.atlasMaps);
  const storedAtlasPins = useAtlasStore((state) => state.atlasPins);
  const storedAtlasPinCharacters = useAtlasStore((state) => state.atlasPinCharacters);

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
  const onlinePlayers = roster.filter((member) => member.status !== "offline").length;
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
  const activeVenue =
    session.stageMode === "atlas"
      ? activeAtlasMap?.name ?? session.activeScene
      : session.stageMode === "tactical"
        ? activeMap?.name ?? session.activeScene
      : activeScene?.name ?? session.activeScene;

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
      atlasMapIdOverride={
        atlasNavigation?.sourceAtlasMapId === session.activeAtlasMapId
          ? atlasNavigation.targetAtlasMapId
          : null
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
      onStageModeChange={handleStageModeChange}
      onPresentationModeChange={handlePresentationModeChange}
    />
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

  const renderFocusedStage = () => {
    if (session.stageMode === "tactical") {
      return (
        <TacticalMapStage
          key={`${activeMap?.id ?? "empty-map"}:gm-immersive`}
          sessionCode={session.code}
          map={activeMap}
          backgroundUrl={activeMapBackground?.secureUrl ?? null}
          tokens={activeMapTokens}
          viewerParticipantId={viewer?.participantId}
          canManageTokens={viewer?.role === "gm"}
          assetOptions={liveAssets}
          characterOptions={liveCharacters}
          onMoveToken={handleMoveToken}
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(212,168,70,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(196,30,58,0.08),transparent_20%),linear-gradient(180deg,#050505,#0b0907_48%,#120a08)] text-white">
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
        <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="hud-chip border-amber-300/20 bg-amber-300/8 text-amber-100">
                  mestre
                </span>
                <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">
                  sala {session.code}
                </span>
                <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">
                  {onlinePlayers} conectados
                </span>
                <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">
                  palco {activeVenue}
                </span>
              </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-amber-300/20 bg-amber-300/10">
                  <RadioTower size={20} className="text-amber-100" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                      Conselho do Daimyo
                    </h1>
                    <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                      palco dominante, ferramentas sob demanda e sincronizacao viva entre cena, campo e atlas
                    </p>
                  </div>
                </div>
              </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
              <ThemeSettingsButton className="sm:col-span-3 justify-center" />
              <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
                <p className="section-label">Cenas</p>
                <p className="mt-2 text-lg font-semibold text-white">{liveScenes.length}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
                <p className="section-label">Fichas</p>
                <p className="mt-2 text-lg font-semibold text-white">{liveCharacters.length}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
                <p className="section-label">Retratos</p>
                <p className="mt-2 text-lg font-semibold text-white">{liveAssets.length}</p>
              </div>
            </div>
          </div>

          <SectionTabs activeSection={activeSection} onSelect={setActiveSection} />
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

            <div className="mobile-shell-tabs">
              <SectionTabs
                activeSection={activeSection}
                onSelect={(section) => {
                  setActiveSection(section);
                  setMobileSupportPanel("explorer");
                }}
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
                cloudinaryReady={infra.cloudinary}
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

            <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
              <ExplorerPanel
                snapshot={session}
                party={roster}
                participants={participants}
                activeSection={activeSection}
                viewer={viewer}
                cloudinaryReady={infra.cloudinary}
              />

              <BottomDock
                snapshot={session}
                viewer={viewer}
                activeTab={activeDockTab}
                onTabChange={setActiveDockTab}
                showAudio
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

