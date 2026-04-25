"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  AlignJustify,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  LoaderCircle,
  Mic2,
  Play,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  UserRoundSearch,
  UsersRound
} from "lucide-react";

import {
  activateSceneAction,
  addAssetNpcToSceneAction,
  addCharacterToSceneAction,
  createSceneAction,
  deleteSceneAction,
  moveSceneCastAction,
  removeSceneCastAction,
  spotlightSceneCastAction,
  updateSceneAction,
  updateSceneLayoutAction
} from "@/app/actions/scene-actions";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { CharacterVisualPicker } from "@/components/ui/character-visual-picker";
import { AssetVisualPicker } from "@/components/ui/asset-visual-picker";
import {
  filterLibraryItems,
  filterLibraryItemsByStatus,
  sliceLibraryItems,
  sortLibraryItems
} from "@/lib/library/query";
import {
  findActiveScene,
  listSceneCastEntries,
  sortScenesByOrder
} from "@/lib/scenes/selectors";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import {
  selectLibraryFlags,
  useLibraryOrganizationStore
} from "@/stores/library-organization-store";
import { useSceneStore } from "@/stores/scene-store";
import type { SceneLayoutMode } from "@/types/scene";
import type { SessionViewerIdentity } from "@/types/session";
import type { LibrarySortMode, LibraryStatusFilter } from "@/types/library";

interface ScenesPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

const backgroundKinds = new Set(["background", "ambient"]);
const stageNpcKinds = new Set(["npc", "portrait", "token"]);

function layoutModeInfo(mode: SceneLayoutMode) {
  switch (mode) {
    case "line":
      return { label: "linha", icon: AlignJustify };
    case "arc":
      return { label: "arco", icon: CircleDot };
    case "grid":
      return { label: "grade", icon: LayoutGrid };
    case "center":
      return { label: "centro", icon: Target };
    default:
      return { label: mode, icon: Target };
  }
}

export function ScenesPanel({ sessionCode, viewer }: ScenesPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const characters = useCharacterStore((state) => state.characters);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const scenes = useSceneStore((state) => state.scenes);
  const sceneCast = useSceneStore((state) => state.sceneCast);
  const setScenes = useSceneStore((state) => state.setScenes);
  const upsertScene = useSceneStore((state) => state.upsertScene);
  const removeScene = useSceneStore((state) => state.removeScene);
  const removeSceneCast = useSceneStore((state) => state.removeSceneCast);
  const setSceneCast = useSceneStore((state) => state.setSceneCast);
  const upsertSceneCast = useSceneStore((state) => state.upsertSceneCast);

  const [sceneName, setSceneName] = useState("");
  const [moodLabel, setMoodLabel] = useState("");
  const [backgroundAssetId, setBackgroundAssetId] = useState("");
  const [layoutMode, setLayoutMode] = useState<SceneLayoutMode>("line");
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftMood, setDraftMood] = useState("");
  const [draftAssetId, setDraftAssetId] = useState("");
  const [castSelections, setCastSelections] = useState<Record<string, string>>({});
  const [assetSelections, setAssetSelections] = useState<Record<string, string>>({});
  const [castPickerSceneId, setCastPickerSceneId] = useState<string | null>(null);
  const [assetPickerSceneId, setAssetPickerSceneId] = useState<string | null>(null);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("name");
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const orderedScenes = useMemo(() => sortScenesByOrder(scenes), [scenes]);
  const activeScene = useMemo(() => findActiveScene(orderedScenes), [orderedScenes]);
  const backgroundAssets = useMemo(
    () => assets.filter((asset) => backgroundKinds.has(asset.kind)),
    [assets]
  );
  const npcAssets = useMemo(
    () => assets.filter((asset) => stageNpcKinds.has(asset.kind)),
    [assets]
  );
  const sceneLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "scenes")
  );
  const toggleLibraryFlag = useLibraryOrganizationStore((state) => state.toggleFlag);
  const setLibraryFlag = useLibraryOrganizationStore((state) => state.setFlag);
  const touchLibraryItem = useLibraryOrganizationStore((state) => state.touchItem);
  const filteredScenes = useMemo(() => {
    const searchedScenes = filterLibraryItems(
      orderedScenes,
      deferredSearchQuery,
      (scene) => `${scene.name} ${scene.moodLabel}`
    );
    const scopedScenes = filterLibraryItemsByStatus(
      searchedScenes,
      statusFilter,
      (scene) => sceneLibraryFlags[scene.id]
    );

    return sortLibraryItems(scopedScenes, {
      sortMode,
      getLabel: (scene) => scene.name,
      getFlags: (scene) => sceneLibraryFlags[scene.id]
    });
  }, [deferredSearchQuery, orderedScenes, sceneLibraryFlags, sortMode, statusFilter]);
  const displayedScenes = sliceLibraryItems(filteredScenes, visibleCount);
  const canManage = viewer?.role === "gm";

  const runAsync = (key: string, task: () => Promise<void>) => {
    setPendingKey(key);
    setFeedback(null);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingKey(null);
      }
    });
  };

  const handleCreateScene = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode criar cenas.");
      return;
    }

    if (!sceneName.trim()) {
      setFeedback("Informe o nome da cena.");
      return;
    }

    runAsync("create-scene", async () => {
      const result = await createSceneAction({
        sessionCode,
        name: sceneName.trim(),
        moodLabel: moodLabel.trim(),
        backgroundAssetId: backgroundAssetId || null,
        layoutMode
      });

      if (!result.ok || !result.scene) {
        setFeedback(result.message || "Falha ao criar a cena.");
        return;
      }

      if (result.scene.isActive) {
        setScenes(
          [...orderedScenes, result.scene].map((scene) =>
            scene.id === result.scene?.id
              ? result.scene
              : { ...scene, isActive: false }
          )
        );
      } else {
        upsertScene(result.scene);
      }

      setSceneName("");
      setMoodLabel("");
      setBackgroundAssetId("");
      setLayoutMode("line");
      setIsCreateOpen(false);
      setLibraryFlag(sessionCode, "scenes", result.scene.id, "prepared", true);
      touchLibraryItem(sessionCode, "scenes", result.scene.id);
      setFeedback("Cena criada.");
    });
  };

  const handleLayoutChange = (sceneId: string, nextLayout: SceneLayoutMode) => {
    runAsync(`layout:${sceneId}:${nextLayout}`, async () => {
      const result = await updateSceneLayoutAction({
        sessionCode,
        sceneId,
        layoutMode: nextLayout
      });

      if (!result.ok || !result.scene) {
        setFeedback(result.message || "Falha ao atualizar a formacao da cena.");
        return;
      }

      upsertScene(result.scene);
    });
  };

  const handleActivateScene = (sceneId: string) => {
    runAsync(`activate:${sceneId}`, async () => {
      const result = await activateSceneAction({
        sessionCode,
        sceneId
      });

      if (!result.ok || !result.scene) {
        setFeedback(result.message || "Falha ao ativar a cena.");
        return;
      }

      setScenes(
        orderedScenes.map((scene) =>
          scene.id === result.scene?.id
            ? result.scene
            : { ...scene, isActive: false }
        )
      );
      setExpandedSceneId(sceneId);
      setLibraryFlag(sessionCode, "scenes", sceneId, "usedToday", true);
      touchLibraryItem(sessionCode, "scenes", sceneId);
    });
  };

  const handleAddCharacter = (sceneId: string) => {
    const characterId = castSelections[sceneId];

    if (!characterId) {
      setFeedback("Escolha uma ficha para escalar.");
      return;
    }

    runAsync(`add-character:${sceneId}`, async () => {
      const result = await addCharacterToSceneAction({
        sessionCode,
        sceneId,
        characterId
      });

      if (!result.ok || !result.sceneCast) {
        setFeedback(result.message || "Falha ao adicionar a ficha na cena.");
        return;
      }

      upsertSceneCast(result.sceneCast);
      setCastSelections((current) => ({ ...current, [sceneId]: "" }));
    });
  };

  const handleAddAssetNpc = (sceneId: string) => {
    const assetId = assetSelections[sceneId];

    if (!assetId) {
      setFeedback("Escolha uma figura guardada no arquivo.");
      return;
    }

    runAsync(`add-asset:${sceneId}`, async () => {
      const result = await addAssetNpcToSceneAction({
        sessionCode,
        sceneId,
        assetId
      });

      if (!result.ok || !result.sceneCast) {
        setFeedback(result.message || "Falha ao puxar o NPC para a cena.");
        return;
      }

      if (result.character) {
        upsertCharacter(result.character);
      }

      upsertSceneCast(result.sceneCast);
      setAssetSelections((current) => ({ ...current, [sceneId]: "" }));
    });
  };

  const handleMoveEntry = (sceneCastId: string, direction: "up" | "down") => {
    runAsync(`move:${sceneCastId}:${direction}`, async () => {
      const result = await moveSceneCastAction({
        sessionCode,
        sceneCastId,
        direction
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao reordenar o palco.");
        return;
      }

      if (result.entries?.length) {
        setSceneCast(
          sceneCast.map((entry) => {
            const updated = result.entries?.find((item) => item.id === entry.id);
            return updated ?? entry;
          })
        );
      }
    });
  };

  const handleSpotlight = (sceneId: string, sceneCastId: string) => {
    runAsync(`spotlight:${sceneCastId}`, async () => {
      const result = await spotlightSceneCastAction({
        sessionCode,
        sceneId,
        sceneCastId
      });

      if (!result.ok || !result.sceneCast) {
        setFeedback(result.message || "Falha ao destacar o personagem.");
        return;
      }

      setSceneCast(
        sceneCast.map((entry) =>
          entry.sceneId === sceneId
            ? {
                ...entry,
                isSpotlighted: entry.id === result.sceneCast?.id
              }
            : entry
        )
      );
    });
  };

  const handleRemoveEntry = (sceneCastId: string) => {
    runAsync(`remove:${sceneCastId}`, async () => {
      const result = await removeSceneCastAction({
        sessionCode,
        sceneCastId
      });

      if (!result.ok || !result.sceneCast) {
        setFeedback(result.message || "Falha ao remover o personagem.");
        return;
      }

      removeSceneCast(result.sceneCast.id);
    });
  };

  const handleUpdateScene = (sceneId: string) => {
    runAsync(`update:${sceneId}`, async () => {
      const result = await updateSceneAction({
        sessionCode,
        sceneId,
        name: draftName,
        moodLabel: draftMood,
        backgroundAssetId: draftAssetId || null
      });

      if (result.ok && result.scene) {
        upsertScene(result.scene);
        setEditingSceneId(null);
      }
    });
  };

  const handleDeleteScene = (sceneId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar permanentemente esta cena?")) {
      return;
    }

    runAsync(`delete:${sceneId}`, async () => {
      const result = await deleteSceneAction({
        sessionCode,
        sceneId
      });

      if (result.ok && result.scene) {
        removeScene(result.scene.id);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
          {orderedScenes.length} cenas
        </span>
        <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
          ativa: {activeScene?.name ?? "nenhuma"}
        </span>
        <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
          {sceneCast.length} em cena
        </span>
      </div>

      {canManage && (
        <section className="rounded-[18px] border border-white/10 bg-black/18 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-amber-100" />
              <div>
                <h3 className="text-sm font-semibold text-white">Nova cena</h3>
                <p className="text-xs text-[color:var(--ink-3)]">Crie apenas quando precisar.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
            >
              {isCreateOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isCreateOpen ? "recolher" : "abrir"}
            </button>
          </div>

          {isCreateOpen && (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="block">
                  <span className="section-label">Nome</span>
                  <input
                    value={sceneName}
                    onChange={(event) => setSceneName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/35"
                    placeholder="Portao Norte de Kamamura"
                  />
                </label>

                <label className="block">
                  <span className="section-label">Clima</span>
                  <input
                    value={moodLabel}
                    onChange={(event) => setMoodLabel(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/35"
                    placeholder="lanternas frias + chuva curta"
                  />
                </label>

                <label className="block">
                  <span className="section-label">Pintura</span>
                  <button
                    type="button"
                    onClick={() => setIsBackgroundPickerOpen(true)}
                    className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm transition hover:border-amber-300/25 cursor-pointer"
                  >
                    <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                    <span className={backgroundAssetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                    >
                      {backgroundAssetId
                        ? (backgroundAssets.find((a) => a.id === backgroundAssetId)?.label ?? "pintura")
                        : "sem pintura"}
                    </span>
                  </button>
                  <AssetVisualPicker
                    open={isBackgroundPickerOpen}
                    onClose={() => setIsBackgroundPickerOpen(false)}
                    onSelect={(id) => setBackgroundAssetId(id)}
                    assets={assets}
                    filterKinds={["background", "ambient"]}
                    title="Selecionar Pintura de Cena"
                    cardAspect="landscape"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(["line", "arc", "grid", "center"] as SceneLayoutMode[]).map((mode) => {
                  const info = layoutModeInfo(mode);
                  const Icon = info.icon;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLayoutMode(mode)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition",
                        layoutMode === mode
                          ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
                      )}
                    >
                      <Icon size={12} />
                      {info.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {backgroundAssets.length === 0 ? (
                  <p className="text-xs text-[color:var(--ink-3)]">
                    Ainda nao ha pinturas de cena enviadas.
                  </p>
                ) : (
                  <span className="text-xs text-[color:var(--ink-3)]">
                    Fundo e elenco podem ser ajustados depois.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCreateScene}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingKey === "create-scene" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  criar cena
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {feedback && (
        <div className="rounded-[18px] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          {feedback}
        </div>
      )}

      <section className="flex flex-col space-y-3">
        <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-black/18 p-4 md:flex-row md:items-center">
          <div className="flex-shrink-0">
            <p className="section-label px-1">Biblioteca</p>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setVisibleCount(8);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="buscar cena ou clima..."
            />
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <LibraryFilterPills value={statusFilter} onChange={setStatusFilter} />
              <LibrarySortSelect value={sortMode} onChange={setSortMode} />
            </div>
          </div>
        </div>

        {orderedScenes.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--ink-2)]">
            Nenhuma cena criada ainda.
          </div>
        )}

        {orderedScenes.length > 0 && filteredScenes.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--ink-2)]">
            Nenhuma cena corresponde a essa busca.
          </div>
        )}

        <div className="space-y-3">
        {displayedScenes.map((scene) => {
          const background =
            assets.find((asset) => asset.id === scene.backgroundAssetId) ?? null;
          const entries = listSceneCastEntries(scene.id, sceneCast, characters, assets);
          const availableCharacters = characters.filter(
            (character) => !entries.some((entry) => entry.character.id === character.id)
          );
          const usedAssetIds = new Set(
            entries
              .map((entry) => entry.character.assetId)
              .filter((assetId): assetId is string => Boolean(assetId))
          );
          const availableNpcAssets = npcAssets.filter(
            (asset) => !usedAssetIds.has(asset.id)
          );
          const isExpanded = expandedSceneId === scene.id;

          return (
            <article
              key={scene.id}
              className={cn(
                "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
                scene.isActive
                  ? "border-amber-400/40 bg-amber-400/[0.03] shadow-[0_0_40px_rgba(251,191,36,0.1)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              {/* Background Art Layer */}
              <div className="absolute inset-0 z-0">
                {background?.secureUrl ? (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-opacity duration-700" 
                      style={{ 
                        backgroundImage: `url(${background.secureUrl})`,
                        opacity: scene.isActive ? 0.35 : 0.2
                      }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/40 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-20" />
                )}
              </div>

              <div 
                className="relative z-10 p-4 cursor-pointer"
                onClick={() => setExpandedSceneId((current) => current === scene.id ? null : scene.id)}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border overflow-hidden transition-all",
                        scene.isActive 
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]" 
                          : "border-white/10 bg-white/5 text-white/40"
                      )}>
                        {background?.secureUrl ? (
                          <img src={background.secureUrl} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <ImageIcon size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-lg font-bold tracking-tight text-white">{scene.name}</p>
                          {scene.isActive && (
                            <span className="flex h-5 items-center rounded-full bg-amber-400 px-2 text-[9px] font-black uppercase tracking-widest text-black">
                              No Palco
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
                          <Sparkles size={11} className={cn(scene.isActive ? "text-amber-400" : "text-white/40")} />
                          <span className="truncate italic">{scene.moodLabel || "Clima neutro"}</span>
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                          {layoutModeInfo(scene.layoutMode).label} • {entries.length} personagens
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <div className="flex -space-x-2 overflow-hidden">
                      {entries.slice(0, 4).map((entry) => (
                        <div 
                          key={entry.entry.id}
                          className="h-8 w-8 rounded-full border-2 border-black ring-1 ring-white/10"
                        >
                          <img 
                            src={entry.asset?.secureUrl} 
                            className="h-full w-full rounded-full object-cover" 
                            alt={entry.character.name}
                          />
                        </div>
                      ))}
                      {entries.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white/10 text-[9px] font-bold text-white ring-1 ring-white/10">
                          +{entries.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateScene(scene.id);
                        }}
                        disabled={scene.isActive || isPending}
                        className={cn(
                          "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
                          scene.isActive
                            ? "border-amber-400/20 bg-amber-400/5 text-amber-400/40 cursor-default"
                            : "border-white/10 bg-white/5 text-white hover:border-amber-400/50 hover:bg-amber-400/10"
                        )}
                      >
                        {pendingKey === `activate:${scene.id}` ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : scene.isActive ? (
                          "Ativa"
                        ) : (
                          <>
                            <Play size={12} fill="currentColor" />
                            Encenar
                          </>
                        )}
                      </button>
                      
                      {canManage && (
                        <div className="flex gap-2">
                          {!scene.isActive && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScene(scene.id);
                              }}
                              disabled={isPending}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50"
                              title="Arquivar Cena"
                            >
                              {pendingKey === `delete-scene:${scene.id}` ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingSceneId === scene.id) {
                                setEditingSceneId(null);
                              } else {
                                setDraftName(scene.name);
                                setDraftMood(scene.moodLabel);
                                setDraftAssetId(scene.backgroundAssetId ?? "");
                                setEditingSceneId(scene.id);
                                setExpandedSceneId(scene.id);
                              }
                            }}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl border transition-all",
                              editingSceneId === scene.id
                                ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                                : "border-white/10 bg-white/5 text-white/40 hover:text-white"
                            )}
                          >
                            <Settings2 size={16} />
                          </button>
                        </div>
                      )}

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all group-hover:border-amber-400/30 group-hover:text-amber-300">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div 
                    className="mt-5 space-y-5 rounded-[20px] border border-white/5 bg-black/40 p-4 backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingSceneId === scene.id ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="section-label text-[10px]">Nome da Cena</span>
                            <input
                              value={draftName}
                              onChange={(e) => setDraftName(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
                            />
                          </label>
                          <label className="block">
                            <span className="section-label text-[10px]">Clima / Mood</span>
                            <input
                              value={draftMood}
                              onChange={(e) => setDraftMood(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
                            />
                          </label>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateScene(scene.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-400/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-400/20"
                            >
                              {pendingKey === `update:${scene.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSceneId(null)}
                              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white"
                            >
                              Cancelar
                            </button>
                          </div>

                          {!scene.isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeleteScene(scene.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/20"
                            >
                              {pendingKey === `delete:${scene.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              Apagar
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                      {(["line", "arc", "grid", "center"] as SceneLayoutMode[]).map((mode) => {
                        const info = layoutModeInfo(mode);
                        const Icon = info.icon;
                        return (
                          <button
                            key={`${scene.id}:${mode}`}
                            type="button"
                            onClick={() => handleLayoutChange(scene.id, mode)}
                            disabled={isPending}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition",
                              scene.layoutMode === mode
                                ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                                : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
                            )}
                          >
                            {pendingKey === `layout:${scene.id}:${mode}` ? (
                              <LoaderCircle size={12} className="animate-spin" />
                            ) : (
                              <>
                                <Icon size={12} />
                                {info.label}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {!scene.isActive && canManage && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteScene(scene.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Arquivar Cena
                        </button>
                      </div>
                    )}

                    {entries.length === 0 && (
                      <div className="rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-[color:var(--ink-2)] backdrop-blur-sm">
                        Nenhum personagem no palco desta cena.
                      </div>
                    )}

                    {entries.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {entries.map((entry) => (
                          <div
                            key={entry.entry.id}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-full border pr-4 pl-1.5 py-1.5 transition-all",
                              entry.entry.isSpotlighted
                                ? "border-rose-300/30 bg-rose-300/10"
                                : "border-white/10 bg-black/40 hover:bg-white/5"
                            )}
                          >
                            <AssetAvatar
                              imageUrl={entry.asset?.secureUrl}
                              label={entry.character.name}
                              kind={entry.asset?.kind}
                              className="h-10 w-10 rounded-full"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white max-w-[100px] truncate">
                                {entry.character.name}
                              </span>
                              <span className="text-[10px] text-white/50">
                                init {entry.character.initiative >= 0 ? `+${entry.character.initiative}` : entry.character.initiative}
                              </span>
                            </div>

                            {canManage && (
                              <div className="absolute top-12 left-1/2 -translate-x-1/2 hidden flex-wrap gap-1 rounded-xl border border-white/10 bg-black/95 p-1.5 shadow-xl backdrop-blur-md group-hover:flex z-50 w-max">
                                <button type="button" onClick={() => handleSpotlight(scene.id, entry.entry.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-white" title="Destacar (Spotlight)"><Mic2 size={14}/></button>
                                <button type="button" onClick={() => handleMoveEntry(entry.entry.id, "up")} className="p-1.5 hover:bg-white/10 rounded-lg text-white" title="Mover para Esquerda"><ArrowUp size={14}/></button>
                                <button type="button" onClick={() => handleMoveEntry(entry.entry.id, "down")} className="p-1.5 hover:bg-white/10 rounded-lg text-white" title="Mover para Direita"><ArrowDown size={14}/></button>
                                <button type="button" onClick={() => handleRemoveEntry(entry.entry.id)} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400" title="Remover da Cena"><Trash2 size={14}/></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {canManage && (
                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-[18px] border border-white/10 bg-black/18 p-4">
                        <div className="flex items-center gap-2 text-white">
                          <UsersRound size={16} className="text-amber-100" />
                          <p className="text-sm font-semibold">Escalar ficha existente</p>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                          <button
                            type="button"
                            onClick={() => setCastPickerSceneId(scene.id)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                          >
                            <UserRoundSearch size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                            <span className={castSelections[scene.id] ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                            >
                              {castSelections[scene.id]
                                ? (availableCharacters.find((c) => c.id === castSelections[scene.id])?.name ?? "personagem")
                                : "escolher personagem..."}
                            </span>
                          </button>
                          <CharacterVisualPicker
                            open={castPickerSceneId === scene.id}
                            onClose={() => setCastPickerSceneId(null)}
                            onSelect={(id) => {
                              setCastSelections((current) => ({ ...current, [scene.id]: id }));
                            }}
                            characters={characters}
                            assets={assets}
                            excludeIds={new Set(entries.map((e) => e.character.id))}
                          />

                          <button
                            type="button"
                            onClick={() => handleAddCharacter(scene.id)}
                            disabled={isPending || availableCharacters.length === 0}
                            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-3 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `add-character:${scene.id}` ? (
                              <LoaderCircle size={16} className="animate-spin" />
                            ) : (
                              <Plus size={16} />
                            )}
                            adicionar
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/18 p-4">
                        <div className="flex items-center gap-2 text-white">
                          <ImagePlus size={16} className="text-rose-100" />
                          <p className="text-sm font-semibold">Trazer figura do arquivo</p>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                          <button
                            type="button"
                            onClick={() => setAssetPickerSceneId(scene.id)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-rose-300/25 cursor-pointer"
                          >
                            <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                            <span className={assetSelections[scene.id] ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                            >
                              {assetSelections[scene.id]
                                ? (availableNpcAssets.find((a) => a.id === assetSelections[scene.id])?.label ?? "figura")
                                : "escolher retrato guardado..."}
                            </span>
                          </button>
                          <AssetVisualPicker
                            open={assetPickerSceneId === scene.id}
                            onClose={() => setAssetPickerSceneId(null)}
                            onSelect={(id) => {
                              setAssetSelections((current) => ({ ...current, [scene.id]: id }));
                            }}
                            assets={assets}
                            filterKinds={["npc", "portrait", "token"]}
                            title="Selecionar Figura do Arquivo"
                          />

                          <button
                            type="button"
                            onClick={() => handleAddAssetNpc(scene.id)}
                            disabled={isPending || availableNpcAssets.length === 0}
                            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-rose-300/28 bg-rose-300/10 px-3 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `add-asset:${scene.id}` ? (
                              <LoaderCircle size={16} className="animate-spin" />
                            ) : (
                              <Plus size={16} />
                            )}
                            trazer figura
                          </button>
                        </div>

                        {availableCharacters.length === 0 && availableNpcAssets.length === 0 && (
                          <p className="mt-3 text-xs leading-5 text-[color:var(--ink-3)]">
                            Esta cena ja esta usando todas as fichas e figuras guardadas disponiveis.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            )}
          </div>
        </article>
            );
          })}
        </div>

        {filteredScenes.length > displayedScenes.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 8)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            carregar mais cenas
          </button>
        )}
      </section>
    </div>
  );
}

