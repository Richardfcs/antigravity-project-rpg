"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Compass,
  Flame,
  Eye,
  EyeOff,
  Grid2X2,
  HeartCrack,
  LoaderCircle,
  Minus,
  MoonStar,
  Move,
  Plus,
  ScanSearch,
  Skull,
  ShieldAlert,
  Sparkles,
  Trash2,
  Waves,
  Zap
} from "lucide-react";

import {
  addAssetNpcToMapAction,
  addTokenToMapAction,
  createAdHocMapTokenAction,
  removeMapTokenAction,
  updateMapTokenAction
} from "@/app/actions/map-actions";
import type { TacticalStageToken } from "@/lib/maps/selectors";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/stores/map-store";
import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";
import type {
  SessionMapRecord,
  TokenFaction,
  TokenStatusPreset
} from "@/types/map";

interface TacticalMapStageProps {
  sessionCode: string;
  map: SessionMapRecord | null;
  tokens: TacticalStageToken[];
  backgroundUrl?: string | null;
  compact?: boolean;
  viewMode?: "workspace" | "focus";
  viewerParticipantId?: string | null;
  canManageTokens?: boolean;
  assetOptions?: SessionAssetRecord[];
  characterOptions?: SessionCharacterRecord[];
  onMoveToken?: (tokenId: string, x: number, y: number) => void;
}

interface DragState {
  tokenId: string;
  x: number;
  y: number;
}

interface TokenMenuState {
  tokenId: string;
  x: number;
  y: number;
  label: string;
  scale: number;
  assetId: string;
  faction: TokenFaction | "";
  statusEffects: TokenStatusPreset[];
}

type CreatorMode = "character" | "npc-asset" | "ad-hoc";

const factionMeta: Record<TokenFaction, { label: string; ring: string; chip: string }> = {
  ally: {
    label: "aliado",
    ring: "border-sky-300/65 shadow-[0_0_0_4px_rgba(56,189,248,0.16),0_14px_36px_rgba(2,6,23,0.55)]",
    chip: "border-sky-300/20 bg-sky-300/10 text-sky-100"
  },
  enemy: {
    label: "inimigo",
    ring: "border-rose-300/70 shadow-[0_0_0_4px_rgba(251,113,133,0.16),0_14px_36px_rgba(2,6,23,0.55)]",
    chip: "border-rose-300/20 bg-rose-300/10 text-rose-100"
  },
  neutral: {
    label: "neutro",
    ring: "border-amber-300/70 shadow-[0_0_0_4px_rgba(252,211,77,0.14),0_14px_36px_rgba(2,6,23,0.55)]",
    chip: "border-amber-300/20 bg-amber-300/10 text-amber-100"
  }
};

const tokenStatusMeta: Record<
  TokenStatusPreset,
  { label: string; icon: typeof Skull; chip: string }
> = {
  dead: { label: "morto", icon: Skull, chip: "border-rose-300/20 bg-rose-300/10 text-rose-100" },
  poisoned: { label: "envenenado", icon: Waves, chip: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" },
  sleeping: { label: "dormindo", icon: MoonStar, chip: "border-indigo-300/20 bg-indigo-300/10 text-indigo-100" },
  wounded: { label: "machucado", icon: HeartCrack, chip: "border-orange-300/20 bg-orange-300/10 text-orange-100" },
  stunned: { label: "atordoado", icon: Zap, chip: "border-violet-300/20 bg-violet-300/10 text-violet-100" },
  hidden: { label: "oculto", icon: EyeOff, chip: "border-slate-300/20 bg-slate-300/10 text-slate-100" },
  burning: { label: "em chamas", icon: Flame, chip: "border-red-300/20 bg-red-300/10 text-red-100" },
  cursed: { label: "amaldiçoado", icon: Sparkles, chip: "border-rose-300/20 bg-rose-300/10 text-rose-100" }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapPercent(value: number, mapUnits: number, gridSize: number) {
  if (mapUnits <= 0 || gridSize <= 0) {
    return value;
  }

  const cellPercent = (gridSize / mapUnits) * 100;

  if (cellPercent <= 0) {
    return value;
  }

  return Number((Math.round(value / cellPercent) * cellPercent).toFixed(3));
}

export function TacticalMapStage({
  sessionCode,
  map,
  tokens,
  backgroundUrl,
  compact = false,
  viewMode = "workspace",
  viewerParticipantId,
  canManageTokens = false,
  assetOptions = [],
  characterOptions = [],
  onMoveToken
}: TacticalMapStageProps) {
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const removeMapToken = useMapStore((state) => state.removeMapToken);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [tokenMenu, setTokenMenu] = useState<TokenMenuState | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>("character");
  const [draftPoint, setDraftPoint] = useState({ x: 50, y: 50 });
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedNpcAssetId, setSelectedNpcAssetId] = useState("");
  const [freeTokenLabel, setFreeTokenLabel] = useState("");
  const [freeTokenAssetId, setFreeTokenAssetId] = useState("");
  const [freeTokenFaction, setFreeTokenFaction] = useState<TokenFaction | "">("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFocus = viewMode === "focus";

  const centerViewport = useCallback(
    (targetZoom = zoom) => {
      const viewport = viewportRef.current;

      if (!viewport || !map) {
        return;
      }

      const scaledWidth = map.width * targetZoom;
      const scaledHeight = map.height * targetZoom;

      viewport.scrollTo({
        left: Math.max(0, (scaledWidth - viewport.clientWidth) / 2),
        top: Math.max(0, (scaledHeight - viewport.clientHeight) / 2)
      });
    },
    [map, zoom]
  );

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || !map) {
      return;
    }

    const widthRatio = viewport.clientWidth / map.width;
    const heightRatio = viewport.clientHeight / map.height;
    const nextZoom = clamp(Number(Math.min(widthRatio, heightRatio).toFixed(2)), 0.6, 2.4);

    setZoom(nextZoom);
    window.requestAnimationFrame(() => {
      centerViewport(nextZoom);
    });
  }, [centerViewport, map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    window.requestAnimationFrame(() => {
      fitToViewport();
    });
  }, [fitToViewport, map]);

  useEffect(() => {
    if (!tokenMenu) {
      return;
    }

    const handlePointerDown = () => {
      setTokenMenu(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [tokenMenu]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const surface = surfaceRef.current;

      if (!surface) {
        return;
      }

      const rect = surface.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

      setDragState((current) =>
        current ? { ...current, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) } : null
      );
    };

    const handlePointerUp = () => {
      const current = dragState;
      setDragState(null);

      if (!current || !map || !onMoveToken) {
        return;
      }

      const nextX = map.gridEnabled
        ? snapPercent(current.x, map.width, map.gridSize)
        : current.x;
      const nextY = map.gridEnabled
        ? snapPercent(current.y, map.height, map.gridSize)
        : current.y;

      onMoveToken(current.tokenId, nextX, nextY);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, map, onMoveToken]);

  const tokenAssetOptions = useMemo(
    () => assetOptions.filter((asset) => ["token", "portrait", "npc"].includes(asset.kind)),
    [assetOptions]
  );

  const visibleTokens = useMemo(
    () =>
      canManageTokens
        ? tokens
        : tokens.filter((entry) => entry.token.isVisibleToPlayers),
    [canManageTokens, tokens]
  );

  const usedCharacterIds = useMemo(
    () =>
      new Set(
        tokens
          .map((entry) => entry.token.characterId)
          .filter((characterId): characterId is string => Boolean(characterId))
      ),
    [tokens]
  );

  const availableCharacters = useMemo(
    () => characterOptions.filter((character) => !usedCharacterIds.has(character.id)),
    [characterOptions, usedCharacterIds]
  );

  const tokenPositions = useMemo(() => {
    const positionById = new Map<string, { x: number; y: number }>();

    for (const token of visibleTokens) {
      positionById.set(token.token.id, { x: token.token.x, y: token.token.y });
    }

    if (dragState) {
      positionById.set(dragState.tokenId, { x: dragState.x, y: dragState.y });
    }

    return positionById;
  }, [dragState, visibleTokens]);

  const selectedToken =
    visibleTokens.find((entry) => entry.token.id === selectedTokenId) ??
    visibleTokens.find((entry) => entry.token.id === tokenMenu?.tokenId) ??
    null;

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

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canManageTokens || !map) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

    setSelectedTokenId(null);
    setTokenMenu(null);

    if (isCreatorOpen) {
      setDraftPoint({
        x: map.gridEnabled ? snapPercent(x, map.width, map.gridSize) : Number(x.toFixed(3)),
        y: map.gridEnabled ? snapPercent(y, map.height, map.gridSize) : Number(y.toFixed(3))
      });
    }
  };

  const handleCreateFromStage = () => {
    if (!map || !canManageTokens) {
      return;
    }

    if (creatorMode === "character") {
      if (!selectedCharacterId) {
        setFeedback("Escolha uma ficha para posicionar.");
        return;
      }

      runAsync("create-character-token", async () => {
        const result = await addTokenToMapAction({
          sessionCode,
          mapId: map.id,
          characterId: selectedCharacterId,
          x: draftPoint.x,
          y: draftPoint.y
        });

        if (!result.ok) {
          setFeedback(result.message || "Falha ao adicionar a ficha ao mapa.");
          return;
        }

        if (result.token) {
          upsertMapToken(result.token);
        }
        setSelectedCharacterId("");
        setIsCreatorOpen(false);
      });

      return;
    }

    if (creatorMode === "npc-asset") {
      if (!selectedNpcAssetId) {
        setFeedback("Escolha um asset NPC para posicionar.");
        return;
      }

      runAsync("create-npc-token", async () => {
        const result = await addAssetNpcToMapAction({
          sessionCode,
          mapId: map.id,
          assetId: selectedNpcAssetId,
          x: draftPoint.x,
          y: draftPoint.y
        });

        if (!result.ok) {
          setFeedback(result.message || "Falha ao puxar o NPC para o mapa.");
          return;
        }

        if (result.token) {
          upsertMapToken(result.token);
        }
        setSelectedNpcAssetId("");
        setIsCreatorOpen(false);
      });

      return;
    }

    if (!freeTokenLabel.trim()) {
      setFeedback("Dê um nome curto para o token livre.");
      return;
    }

    runAsync("create-free-token", async () => {
      const result = await createAdHocMapTokenAction({
        sessionCode,
        mapId: map.id,
        label: freeTokenLabel.trim(),
        assetId: freeTokenAssetId || null,
        faction: freeTokenFaction || null,
        x: draftPoint.x,
        y: draftPoint.y
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao criar o token livre.");
        return;
      }

      if (result.token) {
        upsertMapToken(result.token);
      }
      setFreeTokenLabel("");
      setFreeTokenAssetId("");
      setFreeTokenFaction("");
      setIsCreatorOpen(false);
    });
  };

  const handleSaveTokenMenu = () => {
    if (!tokenMenu) {
      return;
    }

    runAsync(`update-token:${tokenMenu.tokenId}`, async () => {
      const result = await updateMapTokenAction({
        sessionCode,
        tokenId: tokenMenu.tokenId,
        label: tokenMenu.label,
        assetId: tokenMenu.assetId || null,
        faction: tokenMenu.faction || null,
        statusEffects: tokenMenu.statusEffects,
        scale: tokenMenu.scale
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao atualizar o token.");
        return;
      }

      if (result.token) {
        upsertMapToken(result.token);
      }
      setTokenMenu(null);
    });
  };

  const handleToggleVisibility = (entry: TacticalStageToken) => {
    runAsync(`visibility:${entry.token.id}`, async () => {
      const result = await updateMapTokenAction({
        sessionCode,
        tokenId: entry.token.id,
        isVisibleToPlayers: !entry.token.isVisibleToPlayers
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao atualizar a visibilidade do token.");
        return;
      }

      if (result.token) {
        upsertMapToken(result.token);
      }
      setTokenMenu((current) =>
        current && current.tokenId === entry.token.id ? null : current
      );
    });
  };

  const handleDeleteToken = (tokenId: string) => {
    runAsync(`delete-token:${tokenId}`, async () => {
      const result = await removeMapTokenAction({
        sessionCode,
        tokenId
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao remover o token.");
        return;
      }

      if (result.token) {
        removeMapToken(result.token.id);
      }
      setTokenMenu(null);
      setSelectedTokenId((current) => (current === tokenId ? null : current));
    });
  };

  if (!map) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/22 px-6 text-center">
        <ShieldAlert size={24} className="text-[color:var(--ink-3)]" />
        <h3 className="mt-4 text-xl font-semibold text-white">Nenhum mapa ativo</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ink-2)]">
          Crie um mapa na aba Mapas, escolha um fundo e ative o campo para abrir o
          modo tatico da sessao.
        </p>
      </div>
    );
  }

  const renderedWidth = Math.round(map.width * zoom);
  const renderedHeight = Math.round(map.height * zoom);
  const gridPixelSize = Math.max(12, Math.round(map.gridSize * zoom));

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,21,35,0.96),rgba(17,28,44,0.78))]",
        isFocus ? "p-3 md:p-4" : "p-4"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
              <ScanSearch size={14} />
              modo tatico
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {map.name}
            </span>
            {canManageTokens && (
              <button
                type="button"
                onClick={() => setIsCreatorOpen((current) => !current)}
                className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100"
              >
                <Plus size={14} />
                novo token
              </button>
            )}
          </div>
          {!isFocus && (
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              Mestre ve todos os tokens com contexto de edicao. Jogadores enxergam apenas o que esta publico.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
            {visibleTokens.length} tokens
          </span>
          <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
            {map.gridEnabled ? `${map.gridSize}px grid` : "grid off"}
          </span>
          <button
            type="button"
            onClick={fitToViewport}
            className="rail-button h-9 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            <ScanSearch size={14} />
            fit
          </button>
          <button
            type="button"
            onClick={() => centerViewport()}
            className="rail-button h-9 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            <Compass size={14} />
            centro
          </button>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setZoom((current) => clamp(Number((current - 0.2).toFixed(2)), 0.6, 2.4))}
              className="rail-button h-9 w-9"
            >
              <Minus size={14} />
            </button>
            <span className="min-w-[52px] text-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-2)]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((current) => clamp(Number((current + 0.2).toFixed(2)), 0.6, 2.4))}
              className="rail-button h-9 w-9"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {canManageTokens && isCreatorOpen && (
        <div className="grid gap-3 rounded-[22px] border border-amber-300/16 bg-black/24 p-4 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <p className="section-label">Criador rapido</p>
            {[
              ["character", "Ficha"],
              ["npc-asset", "NPC asset"],
              ["ad-hoc", "Token livre"]
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCreatorMode(id as CreatorMode)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-sm font-medium transition",
                  creatorMode === id
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-50"
                    : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-[color:var(--ink-2)]">
              Clique no mapa para escolher a posicao do novo token. Ponto atual: x {draftPoint.x.toFixed(1)} - y {draftPoint.y.toFixed(1)}.
            </p>

            {creatorMode === "character" && (
              <select
                value={selectedCharacterId}
                onChange={(event) => setSelectedCharacterId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">escolha uma ficha</option>
                {availableCharacters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            )}

            {creatorMode === "npc-asset" && (
              <select
                value={selectedNpcAssetId}
                onChange={(event) => setSelectedNpcAssetId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">escolha um asset</option>
                {tokenAssetOptions.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>
            )}

            {creatorMode === "ad-hoc" && (
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={freeTokenLabel}
                  onChange={(event) => setFreeTokenLabel(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  placeholder="Sentinela"
                />
                <select
                  value={freeTokenAssetId}
                  onChange={(event) => setFreeTokenAssetId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                >
                  <option value="">sem imagem</option>
                  {tokenAssetOptions.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label}
                    </option>
                    ))}
                  </select>
                <select
                  value={freeTokenFaction}
                  onChange={(event) =>
                    setFreeTokenFaction(event.target.value as TokenFaction | "")
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                >
                  <option value="">sem faccao</option>
                  <option value="ally">aliado</option>
                  <option value="enemy">inimigo</option>
                  <option value="neutral">neutro</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={handleCreateFromStage}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingKey?.startsWith("create-") ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              criar no palco
            </button>
          </div>
        </div>
      )}

      <div
        ref={viewportRef}
        className={cn(
          "scrollbar-thin relative min-h-0 flex-1 overflow-auto rounded-[24px] border border-white/10 bg-black/28",
          compact ? "min-h-[320px]" : isFocus ? "min-h-0" : "min-h-[360px]"
        )}
      >
        <div
          ref={surfaceRef}
          className="relative overflow-hidden"
          style={{
            width: `${renderedWidth}px`,
            height: `${renderedHeight}px`
          }}
          onClick={handleSurfaceClick}
        >
          <div
            className={cn(
              "absolute inset-0",
              backgroundUrl ? "bg-center bg-no-repeat" : "ghost-grid"
            )}
            style={{
              backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
              backgroundSize: "contain"
            }}
          />

          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top, rgba(110,231,249,0.08), transparent 24%), radial-gradient(circle at bottom right, rgba(245,158,11,0.08), transparent 22%)"
            }}
          />

          {map.gridEnabled && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                backgroundSize: `${gridPixelSize}px ${gridPixelSize}px`
              }}
            />
          )}

          {canManageTokens && isCreatorOpen && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${draftPoint.x}%`, top: `${draftPoint.y}%` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/16 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.28)]">
                <Plus size={16} />
              </div>
            </div>
          )}

          {visibleTokens.map((entry) => {
            const position = tokenPositions.get(entry.token.id) ?? {
              x: entry.token.x,
              y: entry.token.y
            };
            const isOwnToken =
              entry.ownerParticipantId != null &&
              entry.ownerParticipantId === viewerParticipantId;
            const canDrag = canManageTokens || isOwnToken;
            const size = clamp(56 * zoom * entry.token.scale, 34, 110);
            const isSelected =
              entry.token.id === selectedTokenId || entry.token.id === tokenMenu?.tokenId;
            const factionStyle = entry.token.faction
              ? factionMeta[entry.token.faction]
              : null;

            return (
              <button
                key={entry.token.id}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedTokenId(entry.token.id);
                  setTokenMenu(null);
                }}
                onContextMenu={(event) => {
                  if (!canManageTokens) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedTokenId(entry.token.id);
                  setTokenMenu({
                    tokenId: entry.token.id,
                    x: event.clientX,
                    y: event.clientY,
                    label: entry.label,
                    scale: entry.token.scale,
                    assetId: entry.token.assetId ?? "",
                    faction: entry.token.faction ?? "",
                    statusEffects: entry.token.statusEffects
                  });
                }}
                onPointerDown={(event) => {
                  if (!canDrag) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedTokenId(entry.token.id);
                  setDragState({
                    tokenId: entry.token.id,
                    x: position.x,
                    y: position.y
                  });
                }}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1",
                  canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                )}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: `${size + 16}px`
                }}
                aria-label={entry.label}
              >
                <div
                  className={cn(
                    "relative overflow-hidden rounded-full border-2 bg-[rgba(7,16,24,0.82)] shadow-[0_10px_30px_rgba(2,6,23,0.55)] transition",
                    isSelected
                      ? "border-amber-300/55 shadow-[0_0_0_4px_rgba(245,158,11,0.16),0_14px_36px_rgba(2,6,23,0.55)]"
                      : factionStyle
                        ? factionStyle.ring
                        : canDrag
                          ? "border-amber-300/35 hover:border-cyan-200/55"
                          : "border-white/20",
                    canManageTokens && !entry.token.isVisibleToPlayers && "opacity-55"
                  )}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`
                  }}
                >
                  {entry.asset?.secureUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-no-repeat"
                      style={{
                        backgroundImage: `url(${entry.asset.secureUrl})`,
                        backgroundPosition: "center 14%"
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">
                      {entry.label.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {entry.token.statusEffects.length > 0 && (
                    <div className="absolute right-1 top-1 flex max-w-[70%] flex-wrap justify-end gap-1">
                      {entry.token.statusEffects.map((status) => {
                        const meta = tokenStatusMeta[status];

                        return (
                          <span
                            key={`${entry.token.id}:${status}`}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border bg-black/70",
                              meta.chip
                            )}
                            title={meta.label}
                          >
                            <meta.icon size={10} />
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {canManageTokens && !entry.token.isVisibleToPlayers && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-center bg-black/46 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-50">
                      oculto
                    </div>
                  )}
                </div>

                <span className="rounded-full border border-black/30 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  {entry.label}
                </span>
                {entry.token.faction && (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      factionMeta[entry.token.faction].chip
                    )}
                  >
                    {factionMeta[entry.token.faction].label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tokenMenu && selectedToken && canManageTokens && (
          <div
            className="fixed z-[80] w-[320px] rounded-[22px] border border-white/10 bg-[rgba(5,10,18,0.96)] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur"
            style={{
              left: clamp(tokenMenu.x, 24, window.innerWidth - 344),
              top: clamp(tokenMenu.y, 24, window.innerHeight - 360)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">Token</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedToken.label}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleVisibility(selectedToken)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
              >
                {selectedToken.token.isVisibleToPlayers ? <Eye size={14} /> : <EyeOff size={14} />}
                {selectedToken.token.isVisibleToPlayers ? "visivel" : "oculto"}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={tokenMenu.label}
                onChange={(event) =>
                  setTokenMenu((current) =>
                    current ? { ...current, label: event.target.value } : current
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="Nome do token"
              />

              <select
                value={tokenMenu.assetId}
                onChange={(event) =>
                  setTokenMenu((current) =>
                    current ? { ...current, assetId: event.target.value } : current
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">sem imagem</option>
                {tokenAssetOptions.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>

              <select
                value={tokenMenu.faction}
                onChange={(event) =>
                  setTokenMenu((current) =>
                    current
                      ? {
                          ...current,
                          faction: event.target.value as TokenFaction | ""
                        }
                      : current
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">sem faccao</option>
                <option value="ally">aliado</option>
                <option value="enemy">inimigo</option>
                <option value="neutral">neutro</option>
              </select>

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                  <span>escala</span>
                  <span>{tokenMenu.scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={tokenMenu.scale}
                  onChange={(event) =>
                    setTokenMenu((current) =>
                      current
                        ? { ...current, scale: Number(event.target.value) }
                        : current
                    )
                  }
                  className="w-full"
                />
              </label>

              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="section-label">status</span>
                  <span className="text-xs text-[color:var(--ink-3)]">
                    {tokenMenu.statusEffects.length} ativos
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tokenStatusMeta).map(([status, meta]) => {
                    const enabled = tokenMenu.statusEffects.includes(status as TokenStatusPreset);

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setTokenMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  statusEffects: enabled
                                    ? current.statusEffects.filter((entry) => entry !== status)
                                    : [...current.statusEffects, status as TokenStatusPreset]
                                }
                              : current
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                          enabled
                            ? meta.chip
                            : "border-white/10 bg-black/18 text-[color:var(--ink-2)] hover:border-white/20"
                        )}
                      >
                        <meta.icon size={12} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDeleteToken(selectedToken.token.id)}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
              >
                {pendingKey === `delete-token:${selectedToken.token.id}` ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                excluir
              </button>

              <button
                type="button"
                onClick={handleSaveTokenMenu}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
              >
                {pendingKey === `update-token:${selectedToken.token.id}` ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                salvar ajustes
              </button>
            </div>
          </div>
        )}
      </div>

      {!isFocus && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Move size={15} className="text-amber-100" />
              <p className="text-sm font-medium">Navegacao</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-3)]">
              Role ou arraste a viewport para explorar o campo quando estiver ampliado.
            </p>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Grid2X2 size={15} className="text-amber-100" />
              <p className="text-sm font-medium">Grid</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-3)]">
              {map.gridEnabled
                ? `As posicoes usam grade de ${map.gridSize}px.`
                : "Movimentacao livre, sem encaixe em grade."}
            </p>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <ShieldAlert size={15} className="text-amber-100" />
              <p className="text-sm font-medium">Permissao</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-3)]">
              {canManageTokens
                ? "Mestre ve tokens ocultos, cria novos no palco e edita tudo por clique direito."
                : "Jogadores movem apenas o token vinculado a propria ficha e nao veem controles do mestre."}
            </p>
          </div>
        </div>
      )}

      {feedback && <p className="text-sm text-amber-100">{feedback}</p>}
    </div>
  );
}


