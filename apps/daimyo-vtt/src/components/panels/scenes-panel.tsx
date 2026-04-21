"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  LoaderCircle,
  Mic2,
  Play,
  Plus,
  Trash2,
  UsersRound
} from "lucide-react";

import {
  activateSceneAction,
  addAssetNpcToSceneAction,
  addCharacterToSceneAction,
  createSceneAction,
  moveSceneCastAction,
  removeSceneCastAction,
  spotlightSceneCastAction,
  updateSceneLayoutAction
} from "@/app/actions/scene-actions";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import { AssetAvatar } from "@/components/media/asset-avatar";
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

function layoutModeLabel(mode: SceneLayoutMode) {
  switch (mode) {
    case "line":
      return "linha";
    case "arc":
      return "arco";
    case "grid":
      return "grade";
    case "center":
      return "centro";
    default:
      return mode;
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
  const removeSceneCast = useSceneStore((state) => state.removeSceneCast);
  const setSceneCast = useSceneStore((state) => state.setSceneCast);
  const upsertSceneCast = useSceneStore((state) => state.upsertSceneCast);

  const [sceneName, setSceneName] = useState("");
  const [moodLabel, setMoodLabel] = useState("");
  const [backgroundAssetId, setBackgroundAssetId] = useState("");
  const [layoutMode, setLayoutMode] = useState<SceneLayoutMode>("line");
  const [castSelections, setCastSelections] = useState<Record<string, string>>({});
  const [assetSelections, setAssetSelections] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("name");
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="section-label">Cenas</p>
          <p className="mt-2 text-2xl font-semibold text-white">{orderedScenes.length}</p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">palcos preparados</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Cena ativa</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {activeScene?.name ?? "nenhuma"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">
            {activeScene?.moodLabel || "sem clima definido"}
          </p>
        </div>
        <div className="stat-card">
          <p className="section-label">Elenco total</p>
          <p className="mt-2 text-2xl font-semibold text-white">{sceneCast.length}</p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">slots narrativos</p>
        </div>
      </div>

      {canManage && (
        <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-amber-100" />
            <h3 className="text-sm font-semibold text-white">Nova cena</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
            Aqui entram apenas fundos reais da cena. NPCs e personagens vao para o
            palco na lista logo abaixo.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="block">
              <span className="section-label">Nome</span>
              <input
                value={sceneName}
                onChange={(event) => setSceneName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="Portao Norte de Kamamura"
              />
            </label>

            <label className="block">
              <span className="section-label">Clima</span>
              <input
                value={moodLabel}
                onChange={(event) => setMoodLabel(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="lanternas frias + chuva curta"
              />
            </label>

            <label className="block">
              <span className="section-label">Pintura de cena</span>
              <select
                value={backgroundAssetId}
                onChange={(event) => setBackgroundAssetId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">sem pintura</option>
                {backgroundAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["line", "arc", "grid", "center"] as SceneLayoutMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLayoutMode(mode)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
                  layoutMode === mode
                    ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
                )}
              >
                {layoutModeLabel(mode)}
              </button>
            ))}
          </div>

          {backgroundAssets.length === 0 && (
            <p className="mt-3 text-xs leading-5 text-[color:var(--ink-3)]">
              Ainda nao ha pinturas enviadas nesta sessao. Guarde recursos do tipo
              background ou ambient em Fichas.
            </p>
          )}

          <button
            type="button"
            onClick={handleCreateScene}
            disabled={isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingKey === "create-scene" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            criar cena
          </button>
        </section>
      )}

      {feedback && (
        <div className="rounded-[18px] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          {feedback}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-black/18 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label">Biblioteca de cenas</p>
            <p className="mt-1 text-sm text-[color:var(--ink-2)]">
              Busque por nome, clima ou palco ativo sem percorrer a lista inteira.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:max-w-2xl">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setVisibleCount(8);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="buscar cena ou clima..."
            />
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

          return (
            <article
              key={scene.id}
              className={cn(
                "rounded-[20px] border p-4",
                scene.isActive
                  ? "border-amber-300/28 bg-amber-300/10"
                  : "border-white/10 bg-white/[0.04]"
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="h-20 w-28 shrink-0 rounded-[18px] border border-white/10 bg-cover bg-center"
                    style={
                      background?.secureUrl
                        ? { backgroundImage: `url(${background.secureUrl})` }
                        : undefined
                    }
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-white">{scene.name}</p>
                      {scene.isActive && (
                        <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                          ativa
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                      {scene.moodLabel || "sem clima definido"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                      {background ? `pintura: ${background.label}` : "sem pintura"} - {layoutModeLabel(scene.layoutMode)}
                    </p>
                    <div className="mt-3">
                      <LibraryFlagControls
                        flags={sceneLibraryFlags[scene.id]}
                        canManage={canManage}
                        onToggle={(flag) =>
                          toggleLibraryFlag(sessionCode, "scenes", scene.id, flag)
                        }
                      />
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    {(["line", "arc", "grid", "center"] as SceneLayoutMode[]).map((mode) => (
                      <button
                        key={`${scene.id}:${mode}`}
                        type="button"
                        onClick={() => handleLayoutChange(scene.id, mode)}
                        disabled={isPending}
                        className={cn(
                          "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                          scene.layoutMode === mode
                            ? "border-rose-300/22 bg-rose-300/10 text-rose-100"
                            : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
                        )}
                      >
                        {pendingKey === `layout:${scene.id}:${mode}` ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                            layoutModeLabel(mode)
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleActivateScene(scene.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                    >
                      {pendingKey === `activate:${scene.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                      tornar ativa
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {entries.length === 0 && (
                  <div className="rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-[color:var(--ink-2)]">
                    Nenhum personagem no palco desta cena.
                  </div>
                )}

                {entries.map((entry) => (
                  <div
                    key={entry.entry.id}
                    className={cn(
                      "rounded-[18px] border px-4 py-3",
                      entry.entry.isSpotlighted
                        ? "border-rose-300/22 bg-rose-300/10"
                        : "border-white/10 bg-black/18"
                    )}
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-3">
                        <AssetAvatar
                          imageUrl={entry.asset?.secureUrl}
                          label={entry.character.name}
                          kind={entry.asset?.kind}
                          className="h-12 w-12"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {entry.character.name}
                            </p>
                            {entry.entry.isSpotlighted && (
                              <span className="hud-chip border-rose-300/20 bg-rose-300/10 text-rose-100">
                                <Mic2 size={14} />
                                destaque
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                            slot {entry.entry.slotOrder + 1} - init{" "}
                            {entry.character.initiative >= 0
                              ? `+${entry.character.initiative}`
                              : entry.character.initiative}
                          </p>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSpotlight(scene.id, entry.entry.id)}
                            disabled={isPending}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                          >
                            {pendingKey === `spotlight:${entry.entry.id}` ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              "destaque"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveEntry(entry.entry.id, "up")}
                            disabled={isPending}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                          >
                            {pendingKey === `move:${entry.entry.id}:up` ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <ArrowUp size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveEntry(entry.entry.id, "down")}
                            disabled={isPending}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                          >
                            {pendingKey === `move:${entry.entry.id}:down` ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <ArrowDown size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveEntry(entry.entry.id)}
                            disabled={isPending}
                            className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                          >
                            {pendingKey === `remove:${entry.entry.id}` ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {canManage && (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <div className="rounded-[18px] border border-white/10 bg-black/18 p-4">
                    <div className="flex items-center gap-2 text-white">
                      <UsersRound size={16} className="text-amber-100" />
                      <p className="text-sm font-semibold">Escalar ficha existente</p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                      <select
                        value={castSelections[scene.id] ?? ""}
                        onChange={(event) =>
                          setCastSelections((current) => ({
                            ...current,
                            [scene.id]: event.target.value
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                      >
                        <option value="">escolha uma ficha</option>
                        {availableCharacters.map((character) => (
                          <option key={character.id} value={character.id}>
                            {character.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddCharacter(scene.id)}
                        disabled={isPending || availableCharacters.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
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
                      <select
                        value={assetSelections[scene.id] ?? ""}
                        onChange={(event) =>
                          setAssetSelections((current) => ({
                            ...current,
                            [scene.id]: event.target.value
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-rose-300/35"
                      >
                        <option value="">escolha um retrato guardado</option>
                        {availableNpcAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddAssetNpc(scene.id)}
                        disabled={isPending || availableNpcAssets.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/28 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/45 disabled:cursor-not-allowed disabled:opacity-60"
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
            </article>
          );
        })}

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

