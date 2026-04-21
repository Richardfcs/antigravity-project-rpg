"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  LoaderCircle,
  Play,
  Plus,
  Swords,
  Trash2
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
import { findActiveMap, listMapStageTokens } from "@/lib/maps/selectors";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import { useMapStore } from "@/stores/map-store";
import type { SessionViewerIdentity } from "@/types/session";

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
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const activeMap = useMemo(() => findActiveMap(maps), [maps]);
  const mapAssets = useMemo(
    () => assets.filter((asset) => tacticalMapKinds.has(asset.kind)),
    [assets]
  );
  const tokenPortraitAssets = useMemo(
    () => assets.filter((asset) => ["token", "portrait", "npc"].includes(asset.kind)),
    [assets]
  );
  const filteredMaps = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return maps;
    }

    return maps.filter((map) => {
      const assetLabel =
        assets.find((asset) => asset.id === map.backgroundAssetId)?.label ?? "";

      return `${map.name} ${assetLabel}`.toLowerCase().includes(normalizedQuery);
    });
  }, [assets, deferredSearchQuery, maps]);
  const displayedMaps = filteredMaps.slice(0, visibleCount);
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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="section-label">Mapas</p>
          <p className="mt-2 text-2xl font-semibold text-white">{maps.length}</p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">campos criados</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Mapa ativo</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {activeMap?.name ?? "nenhum"}
          </p>
            <p className="mt-1 text-xs text-[color:var(--ink-3)]">
              {activeMap?.gridEnabled ? `${activeMap.gridSize}px de grade` : "sem grade"}
            </p>
        </div>
        <div className="stat-card">
          <p className="section-label">Tokens</p>
          <p className="mt-2 text-2xl font-semibold text-white">{mapTokens.length}</p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">em todos os mapas</p>
        </div>
      </div>

      {canManage && (
        <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-amber-100" />
            <h3 className="text-sm font-semibold text-white">Novo mapa</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
            Escolha uma grade tatica ou um mapa comum, habilite grade se quiser e publique o campo de batalha.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px]">
            <input
              value={mapName}
              onChange={(event) => setMapName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="Ponte de Kuroi"
            />

            <select
              value={mapAssetId}
              onChange={(event) => setMapAssetId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
            >
              <option value="">sem fundo tatico</option>
              {mapAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
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
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="64"
              inputMode="numeric"
            />
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {[
              ["Aliado padrao", defaultAllyAssetId, setDefaultAllyAssetId],
              ["Inimigo padrao", defaultEnemyAssetId, setDefaultEnemyAssetId],
              ["Neutro padrao", defaultNeutralAssetId, setDefaultNeutralAssetId]
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="section-label">{label as string}</span>
                <select
                  value={value as string}
                  onChange={(event) =>
                    (setter as (value: string) => void)(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                >
                  <option value="">sem retrato padrao</option>
                  {tokenPortraitAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCreateMap}
            disabled={isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingKey === "create-map" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            criar mapa
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
            <p className="section-label">Biblioteca de mapas</p>
            <p className="mt-1 text-sm text-[color:var(--ink-2)]">
              Busque rapido por nome do campo ou pelo recurso-base.
            </p>
          </div>
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setVisibleCount(8);
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition md:max-w-sm focus:border-amber-300/35"
            placeholder="buscar mapa ou recurso..."
          />
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

          return (
            <article
              key={map.id}
              className={cn(
                "rounded-[20px] border p-4",
                map.isActive
                  ? "border-amber-300/28 bg-amber-300/10"
                  : "border-white/10 bg-white/[0.04]"
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                    <AssetAvatar
                    imageUrl={mapAsset?.secureUrl}
                    label={map.name}
                    kind={mapAsset?.kind}
                    className="h-20 w-28 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-white">{map.name}</p>
                      {map.isActive && (
                        <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                          ativo
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                      {mapAsset
                        ? `${mapAsset.kind === "grid" ? "grade" : "mapa"}: ${mapAsset.label}`
                        : "sem fundo tatico"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                      {map.gridEnabled ? `${map.gridSize}px grid` : "movimento livre"} - {entries.length} tokens
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleActivateMap(map.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                    >
                      {pendingKey === `activate:${map.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                      tornar ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMap(map.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                    >
                      {pendingKey === `delete-map:${map.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      remover mapa
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {entries.length === 0 && (
                  <div className="rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-[color:var(--ink-2)]">
                    Nenhum token neste mapa.
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
              </div>

              {canManage && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                    <select
                      value={mapSelections[map.id] ?? ""}
                      onChange={(event) =>
                        setMapSelections((current) => ({
                          ...current,
                          [map.id]: event.target.value
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
                      onClick={() => handleAddToken(map.id)}
                      disabled={isPending || availableCharacters.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingKey === `add-token:${map.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Swords size={16} />
                      )}
                      adicionar token
                    </button>
                  </div>

                  <div className="grid gap-3 rounded-[18px] border border-white/10 bg-black/18 p-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_180px]">
                    {[
                      ["Aliado", "defaultAllyAssetId"],
                      ["Inimigo", "defaultEnemyAssetId"],
                      ["Neutro", "defaultNeutralAssetId"]
                    ].map(([label, field]) => (
                      <label key={field} className="block">
                        <span className="section-label">{label} padrao</span>
                        <select
                          value={mapDraft[field as keyof typeof mapDraft]}
                          onChange={(event) =>
                            setMapConfigDrafts((current) => ({
                              ...current,
                              [map.id]: {
                                ...mapDraft,
                                [field]: event.target.value
                              }
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                        >
                          <option value="">sem retrato padrao</option>
                          {tokenPortraitAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleSaveMapDefaults(map.id)}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
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
            </article>
          );
        })}

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

