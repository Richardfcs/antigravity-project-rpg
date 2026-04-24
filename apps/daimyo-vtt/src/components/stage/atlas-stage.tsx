"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Compass,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LoaderCircle,
  MapPinned,
  Minus,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
  Settings2
} from "lucide-react";

import {
  createAtlasPinAction,
  deleteAtlasPinAction,
  updateAtlasPinDetailsAction,
  updateAtlasPinPositionAction
} from "@/app/actions/atlas-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { AssetVisualPicker } from "@/components/ui/asset-visual-picker";
import { SessionMemoryFeed } from "@/components/panels/session-memory-feed";
import type { AtlasStagePin } from "@/lib/atlas/selectors";
import { useAtlasStore } from "@/stores/atlas-store";
import { cn } from "@/lib/utils";
import type { SessionAssetRecord } from "@/types/asset";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord
} from "@/types/atlas";
import type { SessionCharacterRecord } from "@/types/character";
import type { SessionMemoryRecord } from "@/types/session-memory";
import type { ExplorerSection } from "@/types/session";

interface AtlasStageProps {
  sessionCode?: string;
  atlasMap: SessionAtlasMapRecord | null;
  atlasMaps?: SessionAtlasMapRecord[];
  backgroundUrl?: string | null;
  backgroundAsset?: SessionAssetRecord | null;
  pins: AtlasStagePin[];
  compact?: boolean;
  viewMode?: "workspace" | "focus";
  canEdit?: boolean;
  assetOptions?: SessionAssetRecord[];
  characterOptions?: SessionCharacterRecord[];
  pinCharacterLinks?: SessionAtlasPinCharacterRecord[];
  revealHistory?: SessionMemoryRecord[];
  onOpenSubmap?: (atlasMapId: string) => void;
  onResetNavigation?: () => void;
  navigatingSubmap?: boolean;
  onRequestLibrary?: (section: ExplorerSection) => void;
}

interface DragState {
  pinId: string;
  x: number;
  y: number;
}

interface EditorState {
  mode: "create" | "edit";
  pinId?: string;
  x: number;
  y: number;
  title: string;
  description: string;
  isVisibleToPlayers: boolean;
  isNameVisibleToPlayers: boolean;
  isQuestMarked: boolean;
  imageAssetId: string;
  submapAssetId: string;
  characterIds: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AtlasStage({
  sessionCode,
  atlasMap,
  atlasMaps = [],
  backgroundUrl,
  backgroundAsset = null,
  pins,
  compact = false,
  viewMode = "workspace",
  canEdit = false,
  assetOptions = [],
  characterOptions = [],
  pinCharacterLinks = [],
  revealHistory = [],
  onOpenSubmap,
  onResetNavigation,
  navigatingSubmap = false,
  onRequestLibrary
}: AtlasStageProps) {
  const upsertAtlasPin = useAtlasStore((state) => state.upsertAtlasPin);
  const removeAtlasPin = useAtlasStore((state) => state.removeAtlasPin);
  const replaceAtlasPinCharacters = useAtlasStore(
    (state) => state.replaceAtlasPinCharacters
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const panRef = useRef<{ isPanning: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const zoomAnchorRef = useRef<{ mapX: number; mapY: number; cursorX: number; cursorY: number } | null>(null);
  const touchStateRef = useRef<{ initialDistance: number; initialZoom: number; mapCenterX: number; mapCenterY: number; cursorX: number; cursorY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isFocusDrawerOpen, setIsFocusDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isSubmapPickerOpen, setIsSubmapPickerOpen] = useState(false);
  const isFocus = viewMode === "focus";
  const worldWidth = backgroundAsset?.width ?? 1600;
  const worldHeight = backgroundAsset?.height ?? 960;

  const centerViewport = useCallback(
    (targetZoom?: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const resolvedZoom = targetZoom ?? zoomRef.current;
      const scaledWidth = worldWidth * resolvedZoom;
      const scaledHeight = worldHeight * resolvedZoom;

      viewport.scrollTo({
        left: Math.max(0, (scaledWidth - viewport.clientWidth) / 2),
        top: Math.max(0, (scaledHeight - viewport.clientHeight) / 2)
      });
    },
    [worldHeight, worldWidth]
  );

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const widthRatio = viewport.clientWidth / worldWidth;
    const heightRatio = viewport.clientHeight / worldHeight;
    const nextZoom = clamp(Number(Math.min(widthRatio, heightRatio).toFixed(2)), 0.05, 4.0);

    setZoom(nextZoom);
    window.requestAnimationFrame(() => {
      centerViewport(nextZoom);
    });
  }, [centerViewport, worldHeight, worldWidth]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useLayoutEffect(() => {
    if (zoomAnchorRef.current && viewportRef.current) {
      const { mapX, mapY, cursorX, cursorY } = zoomAnchorRef.current;
      viewportRef.current.scrollLeft = mapX * zoom - cursorX;
      viewportRef.current.scrollTop = mapY * zoom - cursorY;
      zoomAnchorRef.current = null;
    }
  }, [zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        
        const currentZoom = zoomRef.current;
        const zoomDelta = -e.deltaY * 0.002;
        const nextZoom = clamp(Number((currentZoom + zoomDelta).toFixed(3)), 0.05, 4.0);
        
        if (nextZoom === currentZoom) return;
        
        const rect = viewport.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const mapX = (viewport.scrollLeft + cursorX) / currentZoom;
        const mapY = (viewport.scrollTop + cursorY) / currentZoom;
        
        zoomAnchorRef.current = { mapX, mapY, cursorX, cursorY };
        setZoom(nextZoom);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        const rect = viewport.getBoundingClientRect();
        const cursorX = centerX - rect.left;
        const cursorY = centerY - rect.top;
        const mapX = (viewport.scrollLeft + cursorX) / zoomRef.current;
        const mapY = (viewport.scrollTop + cursorY) / zoomRef.current;

        touchStateRef.current = {
          initialDistance: distance,
          initialZoom: zoomRef.current,
          mapCenterX: mapX,
          mapCenterY: mapY,
          cursorX,
          cursorY
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const scale = distance / touchStateRef.current.initialDistance;
        const nextZoom = clamp(Number((touchStateRef.current.initialZoom * scale).toFixed(3)), 0.05, 4.0);
        
        if (nextZoom !== zoomRef.current) {
          zoomAnchorRef.current = {
            mapX: touchStateRef.current.mapCenterX,
            mapY: touchStateRef.current.mapCenterY,
            cursorX: touchStateRef.current.cursorX,
            cursorY: touchStateRef.current.cursorY
          };
          setZoom(nextZoom);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStateRef.current = null;
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.pointerType === "touch") {
      panRef.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: viewportRef.current?.scrollLeft ?? 0,
        scrollTop: viewportRef.current?.scrollTop ?? 0
      };
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
      }
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current?.isPanning && viewportRef.current) {
      if (e.pointerType !== "touch" || !touchStateRef.current) {
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        viewportRef.current.scrollLeft = panRef.current.scrollLeft - dx;
        viewportRef.current.scrollTop = panRef.current.scrollTop - dy;
      }
    }
  };

  const handleViewportPointerUp = () => {
    if (panRef.current) {
      panRef.current = null;
      setIsPanning(false);
    }
  };

  useEffect(() => {
    window.requestAnimationFrame(() => {
      fitToViewport();
    });
  }, [atlasMap?.id, fitToViewport]);

  useEffect(() => {
    if (!dragState || !atlasMap || !canEdit || !sessionCode) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left + viewport.scrollLeft) / (worldWidth * zoom)) * 100, 0, 100);
      const y = clamp(((event.clientY - rect.top + viewport.scrollTop) / (worldHeight * zoom)) * 100, 0, 100);

      setDragState((current) =>
        current ? { ...current, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) } : null
      );
    };

    const handlePointerUp = () => {
      const current = dragState;
      setDragState(null);

      if (!current) {
        return;
      }

      setPendingKey(`move-pin:${current.pinId}`);
      setFeedback(null);
      startTransition(async () => {
        const result = await updateAtlasPinPositionAction({
          sessionCode,
          pinId: current.pinId,
          x: current.x,
          y: current.y
        });

        if (!result.ok || !result.pin) {
          setFeedback(result.message || "Falha ao mover o pin.");
        } else {
          upsertAtlasPin(result.pin);
        }

        setPendingKey(null);
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    atlasMap,
    canEdit,
    dragState,
    sessionCode,
    startTransition,
    upsertAtlasPin,
    worldHeight,
    worldWidth,
    zoom
  ]);

  const imageAssetOptions = useMemo(
    () => assetOptions.filter((asset) => asset.kind === "background"),
    [assetOptions]
  );
  const submapAssetOptions = useMemo(
    () => assetOptions.filter((asset) => asset.kind === "map"),
    [assetOptions]
  );

  const effectiveSelectedPinId =
    selectedPinId && pins.some((pin) => pin.pin.id === selectedPinId)
      ? selectedPinId
      : isFocus
        ? null
        : pins[0]?.pin.id ?? null;
  const selectedPin =
    pins.find((pin) => pin.pin.id === effectiveSelectedPinId) ?? null;

  const renderedPins = useMemo(() => {
    const positionById = new Map<string, { x: number; y: number }>();

    for (const pin of pins) {
      positionById.set(pin.pin.id, { x: pin.pin.x, y: pin.pin.y });
    }

    if (dragState) {
      positionById.set(dragState.pinId, { x: dragState.x, y: dragState.y });
    }

    return pins.map((pin) => ({
      ...pin,
      x: positionById.get(pin.pin.id)?.x ?? pin.pin.x,
      y: positionById.get(pin.pin.id)?.y ?? pin.pin.y
    }));
  }, [dragState, pins]);

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isFocus) {
      setSelectedPinId(null);
      setEditor(null);
      setIsFocusDrawerOpen(false);
    }

    if (!canEdit || !editMode) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

    setSelectedPinId(null);
    setEditor({
      mode: "create",
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      title: "",
      description: "",
      isVisibleToPlayers: false,
      isNameVisibleToPlayers: false,
      isQuestMarked: false,
      imageAssetId: "",
      submapAssetId: "",
      characterIds: []
    });
    setIsFocusDrawerOpen(true);
  };

  const handleSelectPin = (entry: AtlasStagePin) => {
    setSelectedPinId(entry.pin.id);
    if (isFocus) {
      setIsFocusDrawerOpen(true);
    }

    if (canEdit && editMode) {
      setEditor({
        mode: "edit",
        pinId: entry.pin.id,
        x: entry.pin.x,
        y: entry.pin.y,
        title: entry.pin.title,
        description: entry.pin.description,
        isVisibleToPlayers: entry.pin.isVisibleToPlayers,
        isNameVisibleToPlayers: entry.pin.isNameVisibleToPlayers,
        isQuestMarked: entry.pin.isQuestMarked,
        imageAssetId: entry.pin.imageAssetId ?? "",
        submapAssetId: entry.pin.submapAssetId ?? "",
        characterIds: (pinCharacterLinks ?? [])
          .filter((link) => link.pinId === entry.pin.id)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((link) => link.characterId)
      });
    }
  };

  const openSelectedPinEditor = () => {
    if (!selectedPin || !canEdit) {
      return;
    }

    setEditMode(true);
    setIsFocusDrawerOpen(true);
    setEditor({
      mode: "edit",
      pinId: selectedPin.pin.id,
      x: selectedPin.pin.x,
      y: selectedPin.pin.y,
      title: selectedPin.pin.title,
      description: selectedPin.pin.description,
      isVisibleToPlayers: selectedPin.pin.isVisibleToPlayers,
      isNameVisibleToPlayers: selectedPin.pin.isNameVisibleToPlayers,
      isQuestMarked: selectedPin.pin.isQuestMarked,
      imageAssetId: selectedPin.pin.imageAssetId ?? "",
      submapAssetId: selectedPin.pin.submapAssetId ?? "",
      characterIds: selectedPin.linkedCharacters.map((character) => character.id)
    });
  };

  const handleSaveEditor = () => {
    if (!sessionCode || !atlasMap || !editor) {
      return;
    }

    setPendingKey(editor.mode === "create" ? "create-pin" : `save-pin:${editor.pinId}`);
    setFeedback(null);
    startTransition(async () => {
      if (editor.mode === "create") {
        const result = await createAtlasPinAction({
          sessionCode,
          atlasMapId: atlasMap.id,
          title: editor.title,
          description: editor.description,
          isVisibleToPlayers: editor.isVisibleToPlayers,
          isNameVisibleToPlayers: editor.isNameVisibleToPlayers,
          isQuestMarked: editor.isQuestMarked,
          x: editor.x,
          y: editor.y,
          imageAssetId: editor.imageAssetId || null,
          submapAssetId: editor.submapAssetId || null,
          characterIds: editor.characterIds
        });

        if (!result.ok || !result.pin) {
          setFeedback(result.message || "Falha ao criar o pin.");
        } else {
          upsertAtlasPin(result.pin);
          replaceAtlasPinCharacters(result.pin.id, result.pinCharacters ?? []);
          setEditor(null);
          setSelectedPinId(result.pin.id);
          if (isFocus) {
            setIsFocusDrawerOpen(true);
          }
        }
      } else if (editor.pinId) {
        const result = await updateAtlasPinDetailsAction({
          sessionCode,
          pinId: editor.pinId,
          title: editor.title,
          description: editor.description,
          isVisibleToPlayers: editor.isVisibleToPlayers,
          isNameVisibleToPlayers: editor.isNameVisibleToPlayers,
          isQuestMarked: editor.isQuestMarked,
          imageAssetId: editor.imageAssetId || null,
          submapAssetId: editor.submapAssetId || null,
          characterIds: editor.characterIds
        });

        if (!result.ok || !result.pin) {
          setFeedback(result.message || "Falha ao atualizar o pin.");
        } else {
          upsertAtlasPin(result.pin);
          replaceAtlasPinCharacters(result.pin.id, result.pinCharacters ?? []);
        }
      }

      setPendingKey(null);
    });
  };

  const handleQuickPinReveal = (pinId: string, patch: {
    isVisibleToPlayers?: boolean;
    isNameVisibleToPlayers?: boolean;
    isQuestMarked?: boolean;
  }) => {
    if (!sessionCode || !canEdit) {
      return;
    }

    setPendingKey(`reveal-pin:${pinId}`);
    setFeedback(null);
    startTransition(async () => {
      const result = await updateAtlasPinDetailsAction({
        sessionCode,
        pinId,
        ...patch
      });

      if (!result.ok || !result.pin) {
        setFeedback(result.message || "Falha ao atualizar a revelacao do local.");
      } else {
        upsertAtlasPin(result.pin);
        replaceAtlasPinCharacters(result.pin.id, result.pinCharacters ?? []);
      }

      setPendingKey(null);
    });
  };

  const handleDeletePin = (pinId: string) => {
    if (!sessionCode) {
      return;
    }

    setPendingKey(`delete-pin:${pinId}`);
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteAtlasPinAction({
        sessionCode,
        pinId
      });

      if (!result.ok || !result.pin) {
        setFeedback(result.message || "Falha ao remover o pin.");
      } else {
        removeAtlasPin(result.pin.id);
        setEditor(null);
        setSelectedPinId(null);
        setIsFocusDrawerOpen(false);
      }

      setPendingKey(null);
    });
  };

  const revealHistoryEntries = useMemo(() => {
    if (!canEdit || !atlasMap) {
      return [];
    }

    return revealHistory.filter((event) => {
      if (event.category !== "atlas") {
        return false;
      }

      if (selectedPin) {
        return event.atlasPinId === selectedPin.pin.id;
      }

      return event.atlasMapId === atlasMap.id;
    });
  }, [atlasMap, canEdit, revealHistory, selectedPin]);

  if (!atlasMap) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/22 px-6 text-center">
        <MapPinned size={24} className="text-[color:var(--ink-3)]" />
        <h3 className="mt-4 text-xl font-semibold text-white">Nenhum atlas ativo</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ink-2)]">
          Crie um atlas, escolha um mapa-base e ative o modo atlas para navegar pela campanha.
        </p>
      </div>
    );
  }

  const renderedWidth = Math.round(worldWidth * zoom);
  const renderedHeight = Math.round(worldHeight * zoom);
  const canSeeSelectedPinName = Boolean(
    selectedPin &&
      (canEdit ||
        selectedPin.pin.isVisibleToPlayers ||
        selectedPin.pin.isNameVisibleToPlayers)
  );
  const canSeeSelectedPinDetails = Boolean(
    selectedPin && (canEdit || selectedPin.pin.isVisibleToPlayers)
  );
  const canOpenFocusDrawer = Boolean(editor || selectedPin);
  const detailPanel = (
    <div className="stat-card max-h-full overflow-auto">
      <p className="section-label">{editor ? "Editor do pin" : "Local em foco"}</p>

      {editor ? (
        <div className="mt-3 space-y-3">
          <input
            value={editor.title}
            onChange={(event) =>
              setEditor((current) =>
                current ? { ...current, title: event.target.value } : current
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
            placeholder="Portao Norte"
          />
          <textarea
            value={editor.description}
            onChange={(event) =>
              setEditor((current) =>
                current ? { ...current, description: event.target.value } : current
              )
            }
            rows={4}
            className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
            placeholder="Descricao curta do local."
          />
          <div className="grid gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={editor.isNameVisibleToPlayers}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? {
                          ...current,
                          isNameVisibleToPlayers: event.target.checked
                        }
                      : current
                  )
                }
              />
              revelar apenas o nome aos jogadores
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={editor.isVisibleToPlayers}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? {
                          ...current,
                          isVisibleToPlayers: event.target.checked,
                          isNameVisibleToPlayers:
                            event.target.checked || current.isNameVisibleToPlayers
                        }
                      : current
                  )
                }
              />
              mostrar detalhes, pintura e descricao
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={editor.isQuestMarked}
                onChange={(event) =>
                  setEditor((current) =>
                    current
                      ? {
                          ...current,
                          isQuestMarked: event.target.checked,
                          isNameVisibleToPlayers:
                            event.target.checked || current.isNameVisibleToPlayers
                        }
                      : current
                  )
                }
              />
              marcar como pista ou objetivo em destaque
            </label>
          </div>
          <button
            type="button"
            onClick={() => setIsImagePickerOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
          >
            <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
            <span className={editor.imageAssetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
            >
              {editor.imageAssetId
                ? (imageAssetOptions.find((a) => a.id === editor.imageAssetId)?.label ?? "pintura do local")
                : "sem pintura do local"}
            </span>
          </button>
          <AssetVisualPicker
            open={isImagePickerOpen}
            onClose={() => setIsImagePickerOpen(false)}
            onSelect={(id) =>
              setEditor((current) =>
                current ? { ...current, imageAssetId: id } : current
              )
            }
            assets={assetOptions ?? []}
            filterKinds={["background", "ambient"]}
            title="Selecionar Pintura do Local"
            cardAspect="landscape"
          />

          <button
            type="button"
            onClick={() => setIsSubmapPickerOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
          >
            <MapPinned size={16} className="shrink-0 text-[color:var(--ink-3)]" />
            <span className={editor.submapAssetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
            >
              {editor.submapAssetId
                ? (submapAssetOptions.find((a) => a.id === editor.submapAssetId)?.label ?? "submapa")
                : "sem submapa vinculado"}
            </span>
          </button>
          <AssetVisualPicker
            open={isSubmapPickerOpen}
            onClose={() => setIsSubmapPickerOpen(false)}
            onSelect={(id) =>
              setEditor((current) =>
                current ? { ...current, submapAssetId: id } : current
              )
            }
            assets={assetOptions ?? []}
            filterKinds={["map"]}
            title="Selecionar Submapa"
            cardAspect="landscape"
          />

          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="section-label">Personagens relacionados</p>
            <p className="mt-2 text-xs text-[color:var(--ink-3)]">
              Nenhum, um ou vários personagens podem ser ligados a este local.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {characterOptions.length === 0 && (
                <p className="text-sm text-[color:var(--ink-3)]">
                  Nenhuma ficha disponivel na sessao.
                </p>
              )}
              {characterOptions.map((character) => {
                const checked = editor.characterIds.includes(character.id);
                return (
                  <label
                    key={character.id}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/18 px-3 py-2 text-sm text-white"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                characterIds: event.target.checked
                                  ? [...current.characterIds, character.id]
                                  : current.characterIds.filter((entry) => entry !== character.id)
                              }
                            : current
                        )
                      }
                    />
                    <span className="truncate">{character.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-[color:var(--ink-3)]">
            x {editor.x.toFixed(1)} - y {editor.y.toFixed(1)}
          </p>
          <div className="flex flex-wrap justify-between gap-2">
            {editor.mode === "edit" && editor.pinId && (
              <button
                type="button"
                onClick={() => handleDeletePin(editor.pinId!)}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
              >
                {pendingKey === `delete-pin:${editor.pinId}` ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                excluir
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveEditor}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
            >
              {pendingKey === "create-pin" || pendingKey === `save-pin:${editor.pinId}` ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              salvar
            </button>
          </div>
        </div>
      ) : selectedPin ? (
        <div className="mt-3 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {canSeeSelectedPinName ? selectedPin.pin.title : "Local oculto"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              {canSeeSelectedPinDetails
                ? selectedPin.pin.description || "Sem descricao registrada para este local."
                : "O mestre ainda nao revelou os detalhes deste local."}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openSelectedPinEditor}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/35"
              >
                <Sparkles size={15} />
                editar pin
              </button>
              <button
                type="button"
                onClick={() => handleDeletePin(selectedPin.pin.id)}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
              >
                {pendingKey === `delete-pin:${selectedPin.pin.id}` ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                excluir
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPinReveal(selectedPin.pin.id, {
                    isNameVisibleToPlayers: !selectedPin.pin.isNameVisibleToPlayers
                  })
                }
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
              >
                <ScrollText size={15} />
                {selectedPin.pin.isNameVisibleToPlayers ? "ocultar nome" : "revelar nome"}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPinReveal(selectedPin.pin.id, {
                    isVisibleToPlayers: !selectedPin.pin.isVisibleToPlayers,
                    isNameVisibleToPlayers:
                      !selectedPin.pin.isVisibleToPlayers || selectedPin.pin.isNameVisibleToPlayers
                  })
                }
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
              >
                {selectedPin.pin.isVisibleToPlayers ? <EyeOff size={15} /> : <Eye size={15} />}
                {selectedPin.pin.isVisibleToPlayers ? "ocultar detalhes" : "mostrar local"}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPinReveal(selectedPin.pin.id, {
                    isQuestMarked: !selectedPin.pin.isQuestMarked,
                    isNameVisibleToPlayers:
                      !selectedPin.pin.isQuestMarked || selectedPin.pin.isNameVisibleToPlayers
                  })
                }
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60",
                  selectedPin.pin.isQuestMarked
                    ? "border-amber-300/28 bg-amber-300/10 text-amber-50"
                    : "border-white/10 bg-white/[0.04] text-white hover:border-white/20"
                )}
              >
                <Sparkles size={15} />
                {selectedPin.pin.isQuestMarked ? "remover pista" : "marcar pista"}
              </button>
            </div>
          )}
          {!canEdit && selectedPin.pin.isQuestMarked && !canSeeSelectedPinDetails && (
            <div className="rounded-[18px] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-50 animate-pulse">
              Uma pista sobre este local acaba de ser revelada.
            </div>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2 text-xs text-[color:var(--ink-3)]">
              <span className={cn("hud-chip", selectedPin.pin.isNameVisibleToPlayers ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]")}>
                nome {selectedPin.pin.isNameVisibleToPlayers ? "revelado" : "oculto"}
              </span>
              <span className={cn("hud-chip", selectedPin.pin.isVisibleToPlayers ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]")}>
                detalhes {selectedPin.pin.isVisibleToPlayers ? "visiveis" : "ocultos"}
              </span>
              {selectedPin.pin.isQuestMarked && (
                <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100 animate-pulse">
                  pista ativa
                </span>
              )}
            </div>
          )}
          {canEdit && (
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm font-semibold text-white">Historico de revelacao</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--ink-2)]">
                O que ja foi mostrado, ocultado ou marcado neste ponto do atlas.
              </p>
              <div className="mt-3">
                <SessionMemoryFeed
                  events={revealHistoryEntries}
                  emptyLabel="Nenhum rastro de revelacao foi registrado aqui ainda."
                  compact
                  limit={4}
                />
              </div>
            </div>
          )}
          {canSeeSelectedPinDetails && selectedPin.imageAsset?.secureUrl && (
            <div
              className="h-40 rounded-[20px] border border-white/10 bg-center bg-cover"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.16), rgba(2,6,23,0.52)), url(${selectedPin.imageAsset.secureUrl})`
              }}
            />
          )}
          {canSeeSelectedPinDetails && selectedPin.submapAsset && (
            <div className="rounded-[18px] border border-amber-300/18 bg-amber-300/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Submapa vinculado</p>
              <p className="mt-1 text-xs text-[color:var(--ink-2)]">
                {selectedPin.submapAsset.label}
              </p>
              <button
                type="button"
                onClick={() => {
                  const linkedAtlasMap = atlasMaps.find(
                    (entry) =>
                      entry.assetId === selectedPin.pin.submapAssetId &&
                      entry.id !== atlasMap?.id
                  );

                  if (linkedAtlasMap) {
                    onOpenSubmap?.(linkedAtlasMap.id);
                  } else {
                    setFeedback(
                      "Este submapa ainda nao possui um atlas proprio criado para navegacao."
                    );
                  }
                }}
                className="mt-3 block w-full"
              >
                <div
                  className="h-36 rounded-[18px] border border-white/10 bg-center bg-contain bg-no-repeat transition hover:border-amber-300/35"
                  style={{ backgroundImage: `url(${selectedPin.submapAsset.secureUrl})` }}
                />
              </button>
              <p className="mt-2 text-xs text-[color:var(--ink-2)]">
                toque no preview para abrir a wiki deste mapa vinculado
              </p>
            </div>
          )}
          {canSeeSelectedPinDetails && selectedPin.linkedCharacters.length > 0 && (
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm font-semibold text-white">Figuras e personagens ligados</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selectedPin.linkedCharacters.map((character, index) => (
                  <div
                    key={character.id}
                    className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/18 p-3"
                  >
                    <AssetAvatar
                      imageUrl={selectedPin.linkedCharacterAssets[index]?.secureUrl}
                      label={character.name}
                      kind={selectedPin.linkedCharacterAssets[index]?.kind}
                      className="h-16 w-12 shrink-0 rounded-[14px]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {character.name}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                        {character.type === "npc" ? "figura" : "protagonista"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-[color:var(--ink-2)]">
          Nenhum pin cadastrado neste atlas ainda.
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,21,35,0.96),rgba(17,28,44,0.78))]",
        isFocus ? "p-3 md:p-3.5" : "p-3"
      )}
    >
      <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
              <Compass size={14} />
              modo atlas
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {atlasMap.name}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditMode((current) => !current);
                  setEditor(null);
                }}
                className={cn(
                  "hud-chip",
                  editMode
                    ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]"
                )}
              >
                <Sparkles size={14} />
                {editMode ? "editando" : "editar atlas"}
              </button>
            )}
            {canEdit && onRequestLibrary && (
              <button
                type="button"
                onClick={() => onRequestLibrary("atlas")}
                className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-amber-300/24 hover:bg-amber-300/10 hover:text-amber-100 cursor-pointer"
              >
                <Settings2 size={14} />
                gerenciar atlas
              </button>
            )}
            {navigatingSubmap && onResetNavigation && (
              <button
                type="button"
                onClick={onResetNavigation}
                className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]"
              >
                <Compass size={14} />
                voltar ao atlas ativo
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-2 py-1.5">
          {isFocus && canOpenFocusDrawer ? (
            <button
              type="button"
              onClick={() => setIsFocusDrawerOpen((current) => !current)}
              className={cn(
                "rail-button h-9 px-3 text-xs font-semibold uppercase tracking-[0.16em]",
                isFocusDrawerOpen && "border-amber-300/22 bg-amber-300/10 text-amber-100"
              )}
            >
              <ScrollText size={14} />
              {editor ? "editor" : "detalhes"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={fitToViewport}
            className="rail-button h-9 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            fit
          </button>
          <button
            type="button"
            onClick={() => centerViewport()}
            className="rail-button h-9 px-3 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            centro
          </button>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current - 0.2).toFixed(2)), 0.6, 2.2))}
            className="rail-button h-9 w-9"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[52px] text-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-2)]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current + 0.2).toFixed(2)), 0.6, 2.2))}
            className="rail-button h-9 w-9"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          isFocus ? "relative" : "grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]"
        )}
      >
        <div
          ref={viewportRef}
          className={cn(
            "scrollbar-thin relative overflow-auto rounded-[24px] border border-white/10 bg-black/28",
            isPanning ? "cursor-grabbing" : "cursor-default",
            compact ? "h-[320px] md:h-[400px]" : "h-full min-h-0"
          )}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerLeave={handleViewportPointerUp}
        >
          <div className="flex min-h-full min-w-full p-3 md:p-4">
            <div
              ref={surfaceRef}
              className="relative m-auto shrink-0 overflow-hidden"
              style={{ width: `${renderedWidth}px`, height: `${renderedHeight}px` }}
              onClick={handleSurfaceClick}
            >
              <div
                className={cn("absolute inset-0", backgroundUrl ? "bg-center bg-no-repeat" : "")}
                style={{
                  backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
                  backgroundSize: backgroundUrl ? "contain" : undefined,
                  backgroundColor: backgroundUrl ? undefined : "#020617"
                }}
              />

              {renderedPins.map((entry) => {
                const isSelected = entry.pin.id === effectiveSelectedPinId;

                return (
                  <button
                    key={entry.pin.id}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleSelectPin(entry);
                    }}
                    onPointerDown={(event) => {
                      if (!canEdit || !editMode) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      handleSelectPin(entry);
                      setDragState({ pinId: entry.pin.id, x: entry.x, y: entry.y });
                    }}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_10px_24px_rgba(2,6,23,0.45)] transition",
                        canEdit && !entry.pin.isVisibleToPlayers && !entry.pin.isNameVisibleToPlayers
                          ? "border-white/12 border-dashed bg-black/40 text-[color:var(--ink-3)]"
                          : isSelected
                            ? "border-amber-300/40 bg-amber-300/16 text-amber-50"
                            : "border-white/14 bg-black/55 text-white hover:border-amber-300/25",
                        entry.pin.isQuestMarked && "animate-pulse"
                      )}
                    >
                      <MapPinned size={18} />
                    </div>
                    {(canEdit ||
                      entry.pin.isVisibleToPlayers ||
                      entry.pin.isNameVisibleToPlayers) && (
                      <div className="mt-2 min-w-[96px] rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-white shadow-[0_8px_18px_rgba(2,6,23,0.35)]">
                        <span className="block truncate">{entry.pin.title}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isFocus ? (
          canOpenFocusDrawer && isFocusDrawerOpen && (
            <div className="pointer-events-none absolute inset-y-3 right-3 z-[20] flex w-[min(380px,calc(100%-1.5rem))] justify-end md:w-[360px]">
              <div className="pointer-events-auto relative h-full max-h-full w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsFocusDrawerOpen(false)}
                  className="absolute right-3 top-3 z-[2] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[rgba(5,10,18,0.82)] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
                >
                  <EyeOff size={14} />
                </button>
                {detailPanel}
              </div>
            </div>
          )
        ) : (
          <aside className="min-h-0 space-y-4 overflow-hidden">
            {detailPanel}
            {feedback && <p className="text-sm text-amber-100">{feedback}</p>}
          </aside>
        )}
      </div>

      {isFocus && feedback && <p className="text-sm text-amber-100">{feedback}</p>}
    </div>
  );
}



