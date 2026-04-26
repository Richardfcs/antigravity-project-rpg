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

function cloudinaryThumb(url: string | null | undefined, size = 512): string | undefined {
  if (!url) return undefined;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}

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
        <span className="hud-chip border-[color:var(--gold)]/20 bg-[color:var(--mist)] text-[color:var(--text-primary)]">
          {maps.length} campos
        </span>
        <span className="hud-chip border-[color:var(--gold)]/20 bg-[color:var(--mist)] text-[color:var(--text-primary)]">
          ativo: {activeMap?.name ?? "nenhum"}
        </span>
        <span className="hud-chip border-[color:var(--gold)]/20 bg-[color:var(--mist)] text-[color:var(--text-primary)]">
          {mapTokens.length} tokens
        </span>
      </div>

      {canManage && (
        <section className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-[color:var(--gold)]" />
              <div>
                <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Novo mapa</h3>
                <p className="text-xs text-[color:var(--text-muted)]">Campo novo so quando precisar.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--gold)]/30"
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
                  className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                  placeholder="Ponte de Kuroi"
                />

                <button
                  type="button"
                  onClick={() => setIsMapBgPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer text-[color:var(--text-primary)]"
                >
                  <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                  <span className={mapAssetId ? "truncate" : "text-[color:var(--text-muted)]"}
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

                <label className="flex items-center gap-2 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[color:var(--text-primary)]">
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
                  className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
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
                      className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer"
                    >
                      <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                      <span className={(value as string) ? "text-[color:var(--text-primary)] truncate" : "text-[color:var(--text-muted)]"}
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
                  className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--gold)]/28 bg-[color:var(--mist)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--gold)]/45 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_15px_rgba(var(--gold-rgb),0.1)]"
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
        <div className="rounded-[18px] border border-[color:var(--gold)]/18 bg-[color:var(--mist)] px-4 py-3 text-sm text-[color:var(--text-primary)]">
          {feedback}
        </div>
      )}

      <section className="flex min-h-0 flex-1 flex-col space-y-3">
        <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4 md:flex-row md:items-center">
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
              className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
              placeholder="buscar mapa ou recurso..."
            />
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <LibraryFilterPills value={statusFilter} onChange={setStatusFilter} />
              <LibrarySortSelect value={sortMode} onChange={setSortMode} />
            </div>
          </div>
        </div>

        {maps.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-6 text-sm text-[color:var(--text-muted)]">
            Nenhum mapa criado ainda.
          </div>
        )}

        {maps.length > 0 && filteredMaps.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-6 text-sm text-[color:var(--text-muted)]">
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
                  ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] shadow-[0_0_40px_rgba(var(--gold-rgb),0.1)]"
                  : "border-[var(--border-panel)] bg-[var(--bg-card)]/50 hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]"
              )}
            >
              {/* Background Art Layer */}
              <div className="absolute inset-0 z-0">
                {mapAsset?.secureUrl ? (
                  <>
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700" 
                        style={{ 
                          backgroundImage: mapAsset.secureUrl ? `url(${cloudinaryThumb(mapAsset.secureUrl, 800)})` : undefined,
                          opacity: map.isActive ? 0.35 : 0.2
                        }} 
                      />
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-panel)]/90 via-[var(--bg-panel)]/40 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--text-primary)]/5 to-transparent opacity-20" />
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
                          ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.2)]" 
                          : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)]"
                      )}>
                        {mapAsset?.secureUrl ? (
                          <img 
                            src={cloudinaryThumb(mapAsset.secureUrl, 160)} 
                            className="h-full w-full object-cover" 
                            alt="" 
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <MapIcon size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-lg font-bold tracking-tight text-[color:var(--text-primary)]">{map.name}</p>
                          {map.isActive && (
                            <span className="flex h-5 items-center rounded-full bg-[color:var(--gold)] px-2 text-[9px] font-black uppercase tracking-widest text-[color:var(--bg-panel)]">
                              No Palco
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                          <Grid size={11} className={cn(map.isActive ? "text-[color:var(--gold)]" : "text-[color:var(--text-muted)]")} />
                          <span className="truncate italic">
                            {map.gridEnabled ? `${map.gridSize}px grid` : "movimento livre"}
                          </span>
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
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
                          className="h-8 w-8 rounded-full border-2 border-[var(--bg-panel)] ring-1 ring-[var(--border-panel)]"
                        >
                          <img 
                            src={cloudinaryThumb(entry.asset?.secureUrl, 64)} 
                            className="h-full w-full rounded-full object-cover" 
                            alt={entry.character?.name || "token"}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ))}
                      {entries.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-panel)] bg-[var(--bg-card)] text-[9px] font-bold text-[color:var(--text-primary)] ring-1 ring-[var(--border-panel)]">
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
                            ? "border-[color:var(--gold)]/20 bg-[color:var(--mist)] text-[color:var(--gold)]/40 cursor-default"
                            : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-primary)] hover:border-[color:var(--gold)]/50 hover:bg-[color:var(--mist)]"
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
                                ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] text-[color:var(--gold)]"
                                : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                            )}
                          >
                            <Settings2 size={16} />
                          </button>
                        </div>
                      )}

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] transition-all group-hover:border-[color:var(--gold)]/30 group-hover:text-[color:var(--gold)]">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                  <div 
                    className="mt-5 space-y-5 rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-4 backdrop-blur-xl"
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
                            className="mt-1.5 w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--gold)]/40"
                          />
                        </label>
                        <label className="block">
                          <span className="section-label text-[10px]">Fundo Tático</span>
                          <button
                            type="button"
                            onClick={() => setIsEditMapBgPickerOpen(true)}
                            className="mt-1.5 flex w-full items-center gap-3 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-2 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer"
                          >
                            <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                            <span className={draftMapAssetId ? "text-[color:var(--text-primary)] truncate" : "text-[color:var(--text-muted)]"}>
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

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-panel)] mt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateMap(map.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--mist)] border border-[color:var(--gold)]/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[color:var(--gold)] hover:bg-[color:var(--gold)]/20"
                          >
                            {pendingKey === `update-map:${map.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMapId(null)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-panel)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
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
                        <div className="rounded-[16px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-input)]/30 px-4 py-4 text-sm text-[color:var(--text-muted)]">
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

                      <div className="flex flex-wrap gap-2">
                        {entries.map((entry) => (
                          <div 
                              key={entry.token.id}
                              className="group relative flex items-center gap-2 rounded-full border border-[var(--border-panel)] bg-[var(--bg-input)] pr-4 pl-1.5 py-1.5 transition-all hover:bg-[var(--bg-panel)]/40"
                            >
                              <AssetAvatar
                                imageUrl={entry.asset?.secureUrl}
                                label={entry.label}
                                kind={entry.asset?.kind}
                                className="h-10 w-10 rounded-full"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-[color:var(--text-primary)] max-w-[100px] truncate">
                                  {entry.character?.name || "token"}
                                </span>
                                <span className="text-[10px] text-[color:var(--text-muted)]">
                                  {entry.asset?.label || "sem retrato"}
                                </span>
                              </div>

                              {canManage && (
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 hidden flex-wrap gap-1 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-panel)]/95 p-1.5 shadow-xl backdrop-blur-md group-hover:flex z-50 w-max">
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveToken(entry.token.id)} 
                                    className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400" 
                                    title="Remover do Mapa"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                        ))}
                      </div>

                      {canManage && (
                        <>
                          <div className="mt-4 space-y-4">
                            <div className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)]/30 p-4">
                          <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                            <UserRoundSearch size={16} className="text-[color:var(--gold)]" />
                            <p className="text-sm font-semibold">Adicionar token ao mapa</p>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                            <button
                              type="button"
                              onClick={() => setTokenPickerMapId(map.id)}
                              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer text-[color:var(--text-primary)]"
                            >
                              <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                              <span className={mapSelections[map.id] ? "truncate" : "text-[color:var(--text-muted)]"}
                              >
                                {mapSelections[map.id]
                                  ? (availableCharacters.find((c) => c.id === mapSelections[map.id])?.name ?? "personagem")
                                  : "escolher ficha..."}
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
                              excludeIds={new Set(entries.map((e) => e.token.characterId).filter(Boolean) as string[])}
                            />

                            <button
                              type="button"
                              onClick={() => handleAddToken(map.id)}
                              disabled={isPending || availableCharacters.length === 0}
                              className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-[color:var(--gold)]/30 bg-[color:var(--mist)] px-3 py-3 text-sm font-semibold text-[color:var(--gold)] transition hover:border-[color:var(--gold)]/50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {pendingKey === `add-token:${map.id}` ? (
                                <LoaderCircle size={16} className="animate-spin" />
                              ) : (
                                <Plus size={16} />
                              )}
                              colocar
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)]/30 p-4">
                          <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
                            <Settings2 size={16} className="text-[color:var(--gold)]" />
                            <p className="text-sm font-semibold">Retratos padrao (Token)</p>
                          </div>
                          <div className="mt-3 grid gap-3 xl:grid-cols-3">
                            {[
                              ["Aliado", "defaultAllyAssetId"],
                              ["Inimigo", "defaultEnemyAssetId"],
                              ["Neutro", "defaultNeutralAssetId"]
                            ].map(([label, fieldKey]) => (
                              <div key={fieldKey}>
                                <button
                                  type="button"
                                  onClick={() => setEditDefaultPickerKey(`${map.id}:${fieldKey}`)}
                                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-[10px] transition hover:border-[color:var(--gold)]/25 cursor-pointer text-[color:var(--text-primary)]"
                                >
                                  <ImageIcon size={14} className="shrink-0 text-[color:var(--text-muted)]" />
                                  <span className={mapDraft[fieldKey as keyof typeof mapDraft] ? "truncate" : "text-[color:var(--text-muted)]"}
                                  >
                                    {mapDraft[fieldKey as keyof typeof mapDraft]
                                      ? (tokenPortraitAssets.find((a) => a.id === mapDraft[fieldKey as keyof typeof mapDraft])?.label ?? "retrato")
                                      : `${label}`}
                                  </span>
                                </button>
                                <AssetVisualPicker
                                  open={editDefaultPickerKey === `${map.id}:${fieldKey}`}
                                  onClose={() => setEditDefaultPickerKey(null)}
                                  onSelect={(id) => {
                                    setMapConfigDrafts((current) => ({
                                      ...current,
                                      [map.id]: {
                                        ...(current[map.id] ?? mapDraft),
                                        [fieldKey]: id
                                      }
                                    }));
                                  }}
                                  assets={assets}
                                  filterKinds={["token", "portrait", "npc"]}
                                  title={`Selecionar ${label}`}
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveMapDefaults(map.id)}
                            disabled={isPending}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--gold)]/28 bg-[color:var(--mist)] py-2 text-xs font-semibold text-[color:var(--gold)] transition hover:border-[color:var(--gold)]/45 disabled:cursor-not-allowed"
                          >
                            {pendingKey === `save-map:${map.id}` ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                            salvar padroes
                          </button>
                          </div>
                        </div>
                        </>
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
            className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)]/50 px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--gold)]/20"
          >
            carregar mais mapas
          </button>
        )}
      </section>
    </div>
  );
}

