"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Grid,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  Map as MapIcon,
  Play,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Swords,
  Trash2,
  UserRoundSearch
} from "lucide-react";

import {
  activateMapAction,
  addTokenToMapAction,
  createMapAction,
  deleteMapAction,
  removeMapTokenAction,
  updateMapAction
} from "@/app/actions/map-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import { AssetVisualPicker } from "@/components/ui/asset-visual-picker";
import { CharacterVisualPicker } from "@/components/ui/character-visual-picker";
import {
  filterLibraryItems,
  filterLibraryItemsByStatus,
  sliceLibraryItems,
  sortLibraryItems
} from "@/lib/library/query";
import { findActiveMap, listMapStageTokens } from "@/lib/maps/selectors";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import {
  selectLibraryFlags,
  useLibraryOrganizationStore
} from "@/stores/library-organization-store";
import { useMapStore } from "@/stores/map-store";
import type { SessionViewerIdentity } from "@/types/session";
import type { LibrarySortMode, LibraryStatusFilter } from "@/types/library";

interface MapsPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

const tacticalMapKinds = new Set(["grid", "map"]);

export function MapsPanel({ sessionCode, viewer }: MapsPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const characters = useCharacterStore((state) => state.characters);
  const maps = useMapStore((state) => state.maps);
  const mapTokens = useMapStore((state) => state.mapTokens);
  const setMaps = useMapStore((state) => state.setMaps);
  const upsertMap = useMapStore((state) => state.upsertMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const removeMapToken = useMapStore((state) => state.removeMapToken);

  const [mapName, setMapName] = useState("");
  const [mapAssetId, setMapAssetId] = useState("");
  const [defaultAllyAssetId, setDefaultAllyAssetId] = useState("");
  const [defaultEnemyAssetId, setDefaultEnemyAssetId] = useState("");
  const [defaultNeutralAssetId, setDefaultNeutralAssetId] = useState("");
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState("64");
  const [mapSelections, setMapSelections] = useState<Record<string, string>>({});
  const [mapConfigDrafts, setMapConfigDrafts] = useState<
    Record<
      string,
      {
        defaultAllyAssetId: string;
        defaultEnemyAssetId: string;
        defaultNeutralAssetId: string;
      }
    >
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("name");
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isMapBgPickerOpen, setIsMapBgPickerOpen] = useState(false);
  const [createDefaultPickerField, setCreateDefaultPickerField] = useState<string | null>(null);
  const [tokenPickerMapId, setTokenPickerMapId] = useState<string | null>(null);
  const [editDefaultPickerKey, setEditDefaultPickerKey] = useState<string | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [draftMapName, setDraftMapName] = useState("");
  const [draftMapAssetId, setDraftMapAssetId] = useState("");
  const [isEditMapBgPickerOpen, setIsEditMapBgPickerOpen] = useState(false);

  const activeMap = useMemo(() => findActiveMap(maps), [maps]);
  const mapAssets = useMemo(
    () => assets.filter((asset) => tacticalMapKinds.has(asset.kind)),
    [assets]
  );
  const tokenPortraitAssets = useMemo(
    () => assets.filter((asset) => ["token", "portrait", "npc"].includes(asset.kind)),
    [assets]
  );
  const mapLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "maps")
  );
  const toggleLibraryFlag = useLibraryOrganizationStore((state) => state.toggleFlag);
  const setLibraryFlag = useLibraryOrganizationStore((state) => state.setFlag);
  const touchLibraryItem = useLibraryOrganizationStore((state) => state.touchItem);
  const filteredMaps = useMemo(() => {
    const searchedMaps = filterLibraryItems(maps, deferredSearchQuery, (map) => {
      const assetLabel =
        assets.find((asset) => asset.id === map.backgroundAssetId)?.label ?? "";

      return `${map.name} ${assetLabel}`;
    });
    const scopedMaps = filterLibraryItemsByStatus(
      searchedMaps,
      statusFilter,
      (map) => mapLibraryFlags[map.id]
    );

    return sortLibraryItems(scopedMaps, {
      sortMode,
      getLabel: (map) => map.name,
      getFlags: (map) => mapLibraryFlags[map.id]
    });
  }, [assets, deferredSearchQuery, mapLibraryFlags, maps, sortMode, statusFilter]);
  const displayedMaps = sliceLibraryItems(filteredMaps, visibleCount);
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

  const handleCreateMap = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode criar mapas.");
      return;
    }

    if (!mapName.trim()) {
      setFeedback("Informe o nome do mapa.");
      return;
    }

    runAsync("create-map", async () => {
      const result = await createMapAction({
        sessionCode,
        name: mapName.trim(),
        backgroundAssetId: mapAssetId || null,
        defaultAllyAssetId: defaultAllyAssetId || null,
        defaultEnemyAssetId: defaultEnemyAssetId || null,
        defaultNeutralAssetId: defaultNeutralAssetId || null,
        gridEnabled,
        gridSize: Number(gridSize) || 64
      });

      if (!result.ok || !result.map) {
        setFeedback(result.message || "Falha ao criar o mapa.");
        return;
      }

      if (result.map.isActive) {
        setMaps(
          [...maps, result.map].map((map) =>
            map.id === result.map?.id ? result.map : { ...map, isActive: false }
          )
        );
      } else {
        upsertMap(result.map);
      }

      setMapName("");
      setMapAssetId("");
      setDefaultAllyAssetId("");
      setDefaultEnemyAssetId("");
      setDefaultNeutralAssetId("");
      setGridEnabled(true);
      setGridSize("64");
      setIsCreateOpen(false);
      setLibraryFlag(sessionCode, "maps", result.map.id, "prepared", true);
      touchLibraryItem(sessionCode, "maps", result.map.id);
      setFeedback("Mapa criado.");
    });
  };

  const handleActivateMap = (mapId: string) => {
    runAsync(`activate:${mapId}`, async () => {
      const result = await activateMapAction({
        sessionCode,
        mapId
      });

      if (!result.ok || !result.map) {
        setFeedback(result.message || "Falha ao ativar o mapa.");
        return;
      }

      setMaps(
        maps.map((map) =>
          map.id === result.map?.id ? result.map : { ...map, isActive: false }
        )
      );
      setExpandedMapId(mapId);
      setLibraryFlag(sessionCode, "maps", mapId, "usedToday", true);
      touchLibraryItem(sessionCode, "maps", mapId);
    });
  };

  const handleUpdateMap = (mapId: string) => {
    runAsync(`update-map:${mapId}`, async () => {
      const result = await updateMapAction({
        sessionCode,
        mapId,
        name: draftMapName.trim(),
        backgroundAssetId: draftMapAssetId || null
      });

      if (!result.ok || !result.map) {
        setFeedback(result.message || "Falha ao atualizar o mapa.");
        return;
      }

      upsertMap(result.map);
      setEditingMapId(null);
      setFeedback("Mapa atualizado.");
    });
  };

  const handleDeleteMap = (mapId: string) => {
    runAsync(`delete-map:${mapId}`, async () => {
      const result = await deleteMapAction({
        sessionCode,
        mapId
      });

      if (!result.ok || !result.map) {
        setFeedback(result.message || "Falha ao remover o mapa.");
        return;
      }

      removeMap(result.map.id);
    });
  };

  const handleSaveMapDefaults = (mapId: string) => {
    const draft = mapConfigDrafts[mapId];
    const map = maps.find((entry) => entry.id === mapId);

    if (!map || !draft) {
      return;
    }

    runAsync(`save-map:${mapId}`, async () => {
      const result = await updateMapAction({
        sessionCode,
        mapId,
        defaultAllyAssetId: draft.defaultAllyAssetId || null,
        defaultEnemyAssetId: draft.defaultEnemyAssetId || null,
        defaultNeutralAssetId: draft.defaultNeutralAssetId || null
      });

      if (!result.ok || !result.map) {
        setFeedback(result.message || "Falha ao salvar os retratos padrao.");
        return;
      }

      upsertMap(result.map);
      setFeedback("Retratos padrao atualizados para este mapa.");
    });
  };

  const handleAddToken = (mapId: string) => {
    const characterId = mapSelections[mapId];

    if (!characterId) {
      setFeedback("Escolha uma ficha para colocar no mapa.");
      return;
    }

    runAsync(`add-token:${mapId}`, async () => {
      const result = await addTokenToMapAction({
        sessionCode,
        mapId,
        characterId
      });

      if (!result.ok || !result.token) {
        setFeedback(result.message || "Falha ao adicionar o token.");
        return;
      }

      upsertMapToken(result.token);
      setMapSelections((current) => ({ ...current, [mapId]: "" }));
    });
  };

  const handleRemoveToken = (tokenId: string) => {
    runAsync(`remove-token:${tokenId}`, async () => {
      const result = await removeMapTokenAction({
        sessionCode,
        tokenId
      });

      if (!result.ok || !result.token) {
        setFeedback(result.message || "Falha ao remover o token.");
        return;
      }

      removeMapToken(result.token.id);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
          {maps.length} campos
        </span>
        <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
          ativo: {activeMap?.name ?? "nenhum"}
        </span>
        <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
          {mapTokens.length} tokens
        </span>
      </div>

      {canManage && (
        <section className="rounded-[18px] border border-white/10 bg-black/18 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-amber-100" />
              <div>
                <h3 className="text-sm font-semibold text-white">Novo mapa</h3>
                <p className="text-xs text-[color:var(--ink-3)]">Campo novo so quando precisar.</p>
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
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px]">
                <input
                  value={mapName}
                  onChange={(event) => setMapName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/35"
                  placeholder="Ponte de Kuroi"
                />

                <button
                  type="button"
                  onClick={() => setIsMapBgPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm transition hover:border-amber-300/25 cursor-pointer"
                >
                  <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                  <span className={mapAssetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                  >
                    {mapAssetId
                      ? (mapAssets.find((a) => a.id === mapAssetId)?.label ?? "fundo")
                      : "sem fundo tatico"}
                  </span>
                </button>
                <AssetVisualPicker
                  open={isMapBgPickerOpen}
                  onClose={() => setIsMapBgPickerOpen(false)}
                  onSelect={(id) => setMapAssetId(id)}
                  assets={assets}
                  filterKinds={["grid", "map"]}
                  title="Selecionar Fundo Tático"
                  cardAspect="landscape"
                />

                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={gridEnabled}
                    onChange={(event) => setGridEnabled(event.target.checked)}
                  />
                  grade
                </label>

                <input
                  value={gridSize}
                  onChange={(event) => setGridSize(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/35"
                  placeholder="64"
                  inputMode="numeric"
                />
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-3">
                {[
                  ["Aliado padrao", "ally", defaultAllyAssetId, setDefaultAllyAssetId],
                  ["Inimigo padrao", "enemy", defaultEnemyAssetId, setDefaultEnemyAssetId],
                  ["Neutro padrao", "neutral", defaultNeutralAssetId, setDefaultNeutralAssetId]
                ].map(([label, fieldKey, value, setter]) => (
                  <div key={fieldKey as string} className="block">
                    <span className="section-label">{label as string}</span>
                    <button
                      type="button"
                      onClick={() => setCreateDefaultPickerField(fieldKey as string)}
                      className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm transition hover:border-amber-300/25 cursor-pointer"
                    >
                      <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                      <span className={(value as string) ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                      >
                        {(value as string)
                          ? (tokenPortraitAssets.find((a) => a.id === (value as string))?.label ?? "retrato")
                          : "sem retrato padrao"}
                      </span>
                    </button>
                    <AssetVisualPicker
                      open={createDefaultPickerField === (fieldKey as string)}
                      onClose={() => setCreateDefaultPickerField(null)}
                      onSelect={(id) => (setter as (value: string) => void)(id)}
                      assets={assets}
                      filterKinds={["token", "portrait", "npc"]}
                      title={`Selecionar ${label as string}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleCreateMap}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingKey === "create-map" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  criar mapa
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

      <section className="flex min-h-0 flex-1 flex-col space-y-3">
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
              placeholder="buscar mapa ou recurso..."
            />
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <LibraryFilterPills value={statusFilter} onChange={setStatusFilter} />
              <LibrarySortSelect value={sortMode} onChange={setSortMode} />
            </div>
          </div>
        </div>

        {maps.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--ink-2)]">
            Nenhum mapa criado ainda.
          </div>
        )}

        {maps.length > 0 && filteredMaps.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--ink-2)]">
            Nenhum mapa corresponde a essa busca.
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {displayedMaps.map((map) => {
          const mapAsset =
            assets.find((asset) => asset.id === map.backgroundAssetId) ?? null;
          const mapDraft = mapConfigDrafts[map.id] ?? {
            defaultAllyAssetId: map.defaultAllyAssetId ?? "",
            defaultEnemyAssetId: map.defaultEnemyAssetId ?? "",
            defaultNeutralAssetId: map.defaultNeutralAssetId ?? ""
          };
          const entries = listMapStageTokens(map.id, mapTokens, characters, assets);
          const availableCharacters = characters.filter(
            (character) =>
              !entries.some((entry) => entry.token.characterId === character.id)
          );
          const isExpanded = expandedMapId === map.id;

          return (
            <article
              key={map.id}
              className={cn(
                "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
                map.isActive
                  ? "border-amber-400/40 bg-amber-400/[0.03] shadow-[0_0_40px_rgba(251,191,36,0.1)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              {/* Background Art Layer */}
              <div className="absolute inset-0 z-0">
                {mapAsset?.secureUrl ? (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-opacity duration-700" 
                      style={{ 
                        backgroundImage: `url(${mapAsset.secureUrl})`,
                        opacity: map.isActive ? 0.35 : 0.2
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
                onClick={() => setExpandedMapId((current) => current === map.id ? null : map.id)}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-20 shrink-0 items-center justify-center rounded-2xl border overflow-hidden transition-all",
                        map.isActive 
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]" 
                          : "border-white/10 bg-white/5 text-white/40"
                      )}>
                        {mapAsset?.secureUrl ? (
                          <img src={mapAsset.secureUrl} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <MapIcon size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-lg font-bold tracking-tight text-white">{map.name}</p>
                          {map.isActive && (
                            <span className="flex h-5 items-center rounded-full bg-amber-400 px-2 text-[9px] font-black uppercase tracking-widest text-black">
                              No Palco
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
                          <Grid size={11} className={cn(map.isActive ? "text-amber-400" : "text-white/40")} />
                          <span className="truncate italic">
                            {map.gridEnabled ? `${map.gridSize}px grid` : "movimento livre"}
                          </span>
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                          {mapAsset?.label || "sem fundo tatico"} • {entries.length} tokens
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <div className="flex -space-x-2 overflow-hidden">
                      {entries.slice(0, 4).map((entry) => (
                        <div 
                          key={entry.token.id}
                          className="h-8 w-8 rounded-full border-2 border-black ring-1 ring-white/10"
                        >
                          <img 
                            src={entry.asset?.secureUrl} 
                            className="h-full w-full rounded-full object-cover" 
                            alt={entry.character?.name || "token"}
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
                          handleActivateMap(map.id);
                        }}
                        disabled={map.isActive || isPending}
                        className={cn(
                          "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
                          map.isActive
                            ? "border-amber-400/20 bg-amber-400/5 text-amber-400/40 cursor-default"
                            : "border-white/10 bg-white/5 text-white hover:border-amber-400/50 hover:bg-amber-400/10"
                        )}
                      >
                        {pendingKey === `activate:${map.id}` ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : map.isActive ? (
                          "Ativo"
                        ) : (
                          <>
                            <Play size={12} fill="currentColor" />
                            Palco
                          </>
                        )}
                      </button>

                      {canManage && (
                        <div className="flex gap-2">
                          {!map.isActive && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMap(map.id);
                              }}
                              disabled={isPending}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50"
                              title="Arquivar Campo"
                            >
                              {pendingKey === `delete-map:${map.id}` ? (
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
                              if (editingMapId === map.id) {
                                setEditingMapId(null);
                              } else {
                                setDraftMapName(map.name);
                                setDraftMapAssetId(map.backgroundAssetId ?? "");
                                setEditingMapId(map.id);
                                setExpandedMapId(map.id);
                              }
                            }}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl border transition-all",
                              editingMapId === map.id
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
              </div>

              {isExpanded && (
                  <div 
                    className="mt-5 space-y-5 rounded-[20px] border border-white/5 bg-black/40 p-4 backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingMapId === map.id ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="section-label text-[10px]">Nome do Mapa</span>
                          <input
                            value={draftMapName}
                            onChange={(e) => setDraftMapName(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
                          />
                        </label>
                        <label className="block">
                          <span className="section-label text-[10px]">Fundo Tático</span>
                          <button
                            type="button"
                            onClick={() => setIsEditMapBgPickerOpen(true)}
                            className="mt-1.5 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm transition hover:border-amber-300/25 cursor-pointer"
                          >
                            <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                            <span className={draftMapAssetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}>
                              {draftMapAssetId
                                ? (mapAssets.find((a) => a.id === draftMapAssetId)?.label ?? "fundo")
                                : "sem fundo tatico"}
                            </span>
                          </button>
                        </label>
                        <AssetVisualPicker
                          open={isEditMapBgPickerOpen}
                          onClose={() => setIsEditMapBgPickerOpen(false)}
                          onSelect={(id) => setDraftMapAssetId(id)}
                          assets={assets}
                          filterKinds={["grid", "map"]}
                          title="Trocar Fundo Tático"
                          cardAspect="landscape"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 mt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateMap(map.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-400/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-400/20"
                          >
                            {pendingKey === `update-map:${map.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMapId(null)}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                        </div>

                        {!map.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMap(map.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/20"
                          >
                            {pendingKey === `delete-map:${map.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Apagar
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {entries.length === 0 && (
                        <div className="rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-[color:var(--ink-2)]">
                          Nenhum token neste mapa.
                        </div>
                      )}

                      {!map.isActive && canManage && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteMap(map.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            Arquivar Campo
                          </button>
                        </div>
                      )}

                      {entries.map((entry) => (
                        <div
                          key={entry.token.id}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-black/18 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <AssetAvatar
                              imageUrl={entry.asset?.secureUrl}
                              label={entry.label}
                              kind={entry.asset?.kind}
                              className="h-12 w-12"
                            />
                            <div>
                              <p className="text-sm font-semibold text-white">{entry.label}</p>
                              <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                                x {entry.token.x.toFixed(1)} - y {entry.token.y.toFixed(1)}
                              </p>
                            </div>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveToken(entry.token.id)}
                              disabled={isPending}
                              className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                            >
                              {pendingKey === `remove-token:${entry.token.id}` ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      ))}

                      {canManage && (
                        <div className="mt-4 space-y-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                            <button
                              type="button"
                          onClick={() => setTokenPickerMapId(map.id)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                        >
                          <UserRoundSearch size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                          <span className={mapSelections[map.id] ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                          >
                            {mapSelections[map.id]
                              ? (availableCharacters.find((c) => c.id === mapSelections[map.id])?.name ?? "personagem")
                              : "escolher personagem..."}
                          </span>
                        </button>
                        <CharacterVisualPicker
                          open={tokenPickerMapId === map.id}
                          onClose={() => setTokenPickerMapId(null)}
                          onSelect={(id) => {
                            setMapSelections((current) => ({ ...current, [map.id]: id }));
                          }}
                          characters={characters}
                          assets={assets}
                          excludeIds={new Set(entries.map((e) => e.token.characterId).filter((id): id is string => Boolean(id)))}
                        />

                        <button
                          type="button"
                          onClick={() => handleAddToken(map.id)}
                          disabled={isPending || availableCharacters.length === 0}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-3 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingKey === `add-token:${map.id}` ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Swords size={16} />
                          )}
                          adicionar token
                        </button>
                      </div>

                      <div className="grid gap-3 rounded-[18px] border border-white/10 bg-black/18 p-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_160px]">
                        {[
                          ["Aliado", "defaultAllyAssetId"],
                          ["Inimigo", "defaultEnemyAssetId"],
                          ["Neutro", "defaultNeutralAssetId"]
                        ].map(([label, field]) => {
                          const pickerKey = `${map.id}:${field}`;
                          const currentValue = mapDraft[field as keyof typeof mapDraft];

                          return (
                            <div key={field} className="block">
                              <span className="section-label">{label} padrao</span>
                              <button
                                type="button"
                                onClick={() => setEditDefaultPickerKey(pickerKey)}
                                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                              >
                                <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                                <span className={currentValue ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                                >
                                  {currentValue
                                    ? (tokenPortraitAssets.find((a) => a.id === currentValue)?.label ?? "retrato")
                                    : "sem retrato padrao"}
                                </span>
                              </button>
                              <AssetVisualPicker
                                open={editDefaultPickerKey === pickerKey}
                                onClose={() => setEditDefaultPickerKey(null)}
                                onSelect={(id) =>
                                  setMapConfigDrafts((current) => ({
                                    ...current,
                                    [map.id]: {
                                      ...mapDraft,
                                      [field]: id
                                    }
                                  }))
                                }
                                assets={assets}
                                filterKinds={["token", "portrait", "npc"]}
                                title={`Selecionar ${label} Padrão`}
                              />
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => handleSaveMapDefaults(map.id)}
                          disabled={isPending}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                        >
                          {pendingKey === `save-map:${map.id}` ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Plus size={16} />
                          )}
                          salvar defaults
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
            </article>
          );
        })}
        </div>

        {filteredMaps.length > displayedMaps.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 8)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            carregar mais mapas
          </button>
        )}
      </section>
    </div>
  );
}

