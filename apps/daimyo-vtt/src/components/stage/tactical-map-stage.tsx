"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Compass,
  Flame,
  Eye,
  EyeOff,
  HeartCrack,
  Image as ImageIcon,
  LoaderCircle,
  Minus,
  MoonStar,
  Plus,
  ScanSearch,
  Skull,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  UserRoundSearch,
  Waves,
  X,
  Zap,
  Search,
  ChevronDown,
  LayoutGrid,
  RotateCcw,
  ScrollText,
  Settings2,
  History,
  Users,
  Grid
} from "lucide-react";

import {
  adjustCharacterResourceAction,
  updateCharacterCombatStatusAction,
  updateCharacterResourceAction
} from "@/app/actions/character-actions";
import {
  addAssetNpcToMapAction,
  addTokenToMapAction,
  createAdHocMapTokenAction,
  removeMapTokenAction,
  updateMapTokenAction
} from "@/app/actions/map-actions";
import { TacticalCombatPanel } from "@/components/combat/tactical-combat-panel";
import { CombatLogPanel } from "@/components/combat/combat-log-panel";
import { PlayerTurnOverlay } from "@/components/combat/player-turn-overlay";
import { DefensePromptOverlay } from "@/components/combat/defense-prompt-overlay";
import { CombatNotification } from "@/components/combat/combat-notification";
import { CharacterVisualPicker } from "@/components/ui/character-visual-picker";
import { AssetVisualPicker } from "@/components/ui/asset-visual-picker";
import { DiceRollOverlay } from "@/components/combat/dice-roll-overlay";
import { CharacterSheetModal } from "@/components/panels/character-sheet-modal";
import type {
  TacticalCombatStateView,
  TacticalStageToken
} from "@/lib/maps/selectors";
import { useCharacterStore } from "@/stores/character-store";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/stores/map-store";
import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";
import type {
  CombatDefenseOption,
  CombatDraftAction,
  SessionCombatFlow
} from "@/types/combat";
import type {
  SessionMapRecord,
  TokenFaction,
  TokenStatusPreset
} from "@/types/map";
import type { ExplorerSection } from "@/types/session";

interface TacticalMapStageProps {
  sessionCode: string;
  map: SessionMapRecord | null;
  tokens: TacticalStageToken[];
  combatState?: TacticalCombatStateView;
  combatFlow?: SessionCombatFlow | null;
  backgroundUrl?: string | null;
  backgroundAsset?: SessionAssetRecord | null;
  compact?: boolean;
  viewMode?: "workspace" | "focus";
  viewerParticipantId?: string | null;
  canManageTokens?: boolean;
  canManageCombat?: boolean;
  assetOptions?: SessionAssetRecord[];
  characterOptions?: SessionCharacterRecord[];
  onMoveToken?: (tokenId: string, x: number, y: number) => void;
  onCombatStart?: () => Promise<void> | void;
  onCombatStop?: () => Promise<void> | void;
  onCombatAdvance?: (direction: "next" | "previous") => Promise<void> | void;
  onSelectCombatant?: (tokenId: string) => Promise<void> | void;
  onExecuteCombatAction?: (action: CombatDraftAction) => Promise<void> | void;
  onRespondCombatPrompt?: (input: {
    eventId: string;
    defenseOption: CombatDefenseOption;
    retreat?: boolean;
    acrobatic?: boolean;
    feverish?: boolean;
    manualModifier?: number;
  }) => Promise<void> | void;
  onGmTakeOver?: (tokenId: string) => Promise<void> | void;
  onSkipTurn?: () => Promise<void> | void;
  onAdjustResource?: (tokenId: string, resource: "hp" | "fp", delta: number) => Promise<void> | void;
  onRequestLibrary?: (section: ExplorerSection) => void;
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
  cursed: { label: "amaldiçoado", icon: Sparkles, chip: "border-rose-300/20 bg-rose-300/10 text-rose-100" },
  collapsed: { label: "colapso", icon: HeartCrack, chip: "border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[0_0_8px_rgba(225,29,72,0.2)]" },
  below_zero: { label: "abaixo de 0 PV", icon: ShieldAlert, chip: "border-orange-500/30 bg-orange-500/10 text-orange-300" }
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
  combatState,
  combatFlow = null,
  backgroundUrl,
  backgroundAsset = null,
  compact = false,
  viewMode = "workspace",
  viewerParticipantId,
  canManageTokens = false,
  canManageCombat = false,
  assetOptions = [],
  characterOptions = [],
  onMoveToken,
  onCombatStart,
  onCombatStop,
  onCombatAdvance,
  onSelectCombatant,
  onExecuteCombatAction,
  onRespondCombatPrompt,
  onGmTakeOver,
  onSkipTurn,
  onAdjustResource,
  onRequestLibrary
}: TacticalMapStageProps) {
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const removeMapToken = useMapStore((state) => state.removeMapToken);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const panRef = useRef<{ isPanning: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const zoomAnchorRef = useRef<{ mapX: number; mapY: number; cursorX: number; cursorY: number } | null>(null);
  const touchStateRef = useRef<{ initialDistance: number; initialZoom: number; mapCenterX: number; mapCenterY: number; cursorX: number; cursorY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [tokenMenu, setTokenMenu] = useState<TokenMenuState | null>(null);
  const [isCombatDrawerOpen, setIsCombatDrawerOpen] = useState(false);
  const [isCombatLogOpen, setIsCombatLogOpen] = useState(true);
  const [dismissedPlayerTurnTokenId, setDismissedPlayerTurnTokenId] = useState<string | null>(null);
  const [isTokenDrawerOpen, setIsTokenDrawerOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>("character");
  const [draftPoint, setDraftPoint] = useState({ x: 50, y: 50 });
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedNpcAssetId, setSelectedNpcAssetId] = useState("");
  const [freeTokenLabel, setFreeTokenLabel] = useState("");
  const [freeTokenAssetId, setFreeTokenAssetId] = useState("");
  const [freeTokenFaction, setFreeTokenFaction] = useState<TokenFaction | "">("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const [damagePopups, setDamagePopups] = useState<Array<{ id: string; tokenId: string; delta: number; x: number; y: number }>>([]);
  const [rollPopups, setRollPopups] = useState<Array<{
    id: string;
    tokenId: string;
    value: number;
    dice: [number, number, number];
    isSuccess: boolean;
    isCritical: boolean;
    x: number;
    y: number;
  }>>([]);
  const prevHpsRef = useRef<Record<string, number>>({});
  const lastResolutionIdRef = useRef<string | null>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const chatMessages = useChatStore((state) => state.messages);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingDeltasRef = useRef<Record<string, number>>({});
  const adjustmentTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [isNpcAssetPickerOpen, setIsNpcAssetPickerOpen] = useState(false);
  const [isFreeAssetPickerOpen, setIsFreeAssetPickerOpen] = useState(false);
  const [isTokenMenuAssetPickerOpen, setIsTokenMenuAssetPickerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetCharacter, setSheetCharacter] = useState<SessionCharacterRecord | null>(null);
  const isFocus = viewMode === "focus";
  const worldWidth = backgroundAsset?.width ?? map?.width ?? 1600;
  const worldHeight = backgroundAsset?.height ?? map?.height ?? 900;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    setDismissedPlayerTurnTokenId(null);
  }, [combatState?.activeTokenId]);

  useEffect(() => {
    const nextHps: Record<string, number> = {};
    tokens.forEach((entry) => {
      const hp = entry.character?.sheetProfile?.combat.currentHp ?? 0;
      const prevHp = prevHpsRef.current[entry.token.id];

      if (prevHp !== undefined && hp !== prevHp) {
        const delta = hp - prevHp;
        const id = Math.random().toString(36).substring(2, 9);
        setDamagePopups((prev) => [
          ...prev,
          { id, tokenId: entry.token.id, delta, x: entry.token.x, y: entry.token.y }
        ]);
        setTimeout(() => {
          setDamagePopups((prev) => prev.filter((p) => p.id !== id));
        }, 1600);
      }
      nextHps[entry.token.id] = hp;
    });
    prevHpsRef.current = nextHps;
  }, [tokens]);

  // Detector de Rolagens para Popups de Dados
  useEffect(() => {
    const res = combatFlow?.lastResolution;
    if (!res || res.id === lastResolutionIdRef.current) return;

    lastResolutionIdRef.current = res.id;

    // Dispara popup para o Atacante
    if (res.actorTokenId && res.attackRoll) {
      const actorToken = tokens.find(t => t.token.id === res.actorTokenId)?.token;
      if (actorToken) {
        const popupId = `roll-actor-${res.id}`;
        setRollPopups(prev => [
          ...prev,
          {
            id: popupId,
            tokenId: res.actorTokenId!,
            value: res.attackRoll!.total,
            dice: res.attackRoll!.dice,
            isSuccess: res.attackRoll!.margin >= 0,
            isCritical: res.attackRoll!.critical !== "none",
            x: actorToken.x,
            y: actorToken.y
          }
        ]);
      }
    }

    // Dispara popup para o Defensor (se houve defesa)
    if (res.targetTokenId && res.defenseRoll) {
      const defenderToken = tokens.find(t => t.token.id === res.targetTokenId)?.token;
      if (defenderToken) {
        const popupId = `roll-defender-${res.id}`;
        setRollPopups(prev => [
          ...prev,
          {
            id: popupId,
            tokenId: res.targetTokenId!,
            value: res.defenseRoll!.total,
            dice: res.defenseRoll!.dice,
            isSuccess: res.defenseRoll!.margin >= 0,
            isCritical: res.defenseRoll!.critical !== "none",
            x: defenderToken.x,
            y: defenderToken.y
          }
        ]);
      }
    }
  }, [combatFlow?.lastResolution, tokens]);

  // Detector de Rolagens de Chat (Testes Gerais e Perícias)
  useEffect(() => {
    if (chatMessages.length === 0) return;

    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg.kind !== "roll" || lastMsg.id === lastProcessedMessageIdRef.current) return;

    lastProcessedMessageIdRef.current = lastMsg.id;

    // Regra de Privacidade: Se for privado e não formos o dono/GM, ignoramos a animação no mapa
    const isGM = canManageCombat; // GM ou assistente
    if (lastMsg.isPrivate && !isGM) return;

    const payload = lastMsg.payload as any;
    if (!payload || !payload.dice) return;

    // Tenta encontrar o token: 
    // 1. Pelo tokenId explícito no payload
    // 2. Pelo characterId se o participante for dono de um token
    let targetToken = tokens.find(t => t.token.id === payload.tokenId)?.token;

    if (!targetToken && lastMsg.participantId) {
      // Fallback: Procura um token que o participante controle
      const controlledToken = tokens.find(t =>
        t.token.characterId &&
        t.character?.ownerParticipantId === lastMsg.participantId
      );
      targetToken = controlledToken?.token;
    }

    if (targetToken) {
      const popupId = `roll-chat-${lastMsg.id}`;
      setRollPopups(prev => [
        ...prev,
        {
          id: popupId,
          tokenId: targetToken!.id,
          value: payload.total,
          dice: payload.dice,
          isSuccess: (payload.target ? payload.margin >= 0 : true),
          isCritical: payload.critical !== "none" && payload.critical !== undefined,
          x: targetToken!.x,
          y: targetToken!.y
        }
      ]);
    }
  }, [chatMessages, tokens, canManageCombat]);

  const centerViewport = useCallback(
    (targetZoom?: number) => {
      const viewport = viewportRef.current;

      if (!viewport || !map) {
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
    [map, worldHeight, worldWidth]
  );

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || !map) {
      return;
    }

    const widthRatio = viewport.clientWidth / worldWidth;
    const heightRatio = viewport.clientHeight / worldHeight;
    const nextZoom = clamp(Number(Math.min(widthRatio, heightRatio).toFixed(2)), 0.05, 4.0);

    setZoom(nextZoom);
    window.requestAnimationFrame(() => {
      centerViewport(nextZoom);
    });
  }, [centerViewport, map, worldHeight, worldWidth]);

  useEffect(() => {
    if (!map) {
      return;
    }

    window.requestAnimationFrame(() => {
      fitToViewport();
    });
  }, [fitToViewport, map]);

  useEffect(() => {
    if (!tokenMenu || isFocus) {
      return;
    }

    const handlePointerDown = () => {
      setTokenMenu(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFocus, tokenMenu]);

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

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const viewport = viewportRef.current;
    const previousBodyUserSelect = document.body.style.userSelect;
    const previousBodyCursor = document.body.style.cursor;
    const previousTouchAction = viewport?.style.touchAction ?? "";
    const previousOverflow = viewport?.style.overflow ?? "";

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    if (viewport) {
      viewport.style.touchAction = "none";
      viewport.style.overflow = "hidden";
    }

    return () => {
      document.body.style.userSelect = previousBodyUserSelect;
      document.body.style.cursor = previousBodyCursor;

      if (viewport) {
        viewport.style.touchAction = previousTouchAction;
        viewport.style.overflow = previousOverflow;
      }
    };
  }, [dragState]);

  useLayoutEffect(() => {
    if (zoomAnchorRef.current && viewportRef.current) {
      const { mapX, mapY, cursorX, cursorY } = zoomAnchorRef.current;
      viewportRef.current.scrollLeft = mapX * zoom - cursorX;
      viewportRef.current.scrollTop = mapY * zoom - cursorY;
      zoomAnchorRef.current = null;
    }
  }, [zoom]);

  useEffect(() => {
    const handler = (e: any) => {
      setDismissedPlayerTurnTokenId(null);
    };
    window.addEventListener('daimyo:show-turn-overlay' as any, handler);
    return () => window.removeEventListener('daimyo:show-turn-overlay' as any, handler);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();

        const surface = surfaceRef.current;
        if (!surface) return;

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

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = {
      isPanning: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    };
    setIsPanning(true);
  };

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    if (!panRef.current?.isPanning || !viewportRef.current) return;

    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    viewportRef.current.scrollLeft = panRef.current.scrollLeft - dx;
    viewportRef.current.scrollTop = panRef.current.scrollTop - dy;
  };

  const handleViewportPointerUp = (e: React.PointerEvent) => {
    if (!panRef.current) return;
    panRef.current.isPanning = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsPanning(false);
  };

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
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Falha ao concluir a acao.");
      } finally {
        setPendingKey(null);
      }
    });
  };

  const createTokenMenuState = useCallback(
    (entry: TacticalStageToken, point?: { x: number; y: number }): TokenMenuState => ({
      tokenId: entry.token.id,
      x: point?.x ?? 0,
      y: point?.y ?? 0,
      label: entry.label,
      scale: entry.token.scale,
      assetId: entry.token.assetId ?? "",
      faction: entry.token.faction ?? "",
      statusEffects: entry.token.statusEffects
    }),
    []
  );

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canManageTokens || !map) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

    setSelectedTokenId(null);
    setTokenMenu(null);
    setIsTokenDrawerOpen(false);

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
      if (!isFocus) {
        setTokenMenu(null);
      }
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
      if (!isFocus) {
        setTokenMenu((current) =>
          current && current.tokenId === entry.token.id ? null : current
        );
      }
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
      setIsTokenDrawerOpen(false);
    });
  };

  const handleAdjustTokenResource = (
    tokenId: string,
    resource: "hp" | "fp",
    delta: number
  ) => {
    const key = `${tokenId}:${resource}`;

    // Acumula o delta localmente para o debounce
    if (!pendingDeltasRef.current[key]) {
      pendingDeltasRef.current[key] = 0;
    }
    pendingDeltasRef.current[key] += delta;

    // Limpa timer anterior
    if (adjustmentTimersRef.current[key]) {
      clearTimeout(adjustmentTimersRef.current[key]);
    }

    // Define novo timer para commitar (2 segundos)
    adjustmentTimersRef.current[key] = setTimeout(() => {
      const entry = tokens.find(t => t.token.id === tokenId);
      if (!entry?.character?.id) return;

      const finalDelta = pendingDeltasRef.current[key];
      delete pendingDeltasRef.current[key];
      delete adjustmentTimersRef.current[key];

      if (onAdjustResource) {
        onAdjustResource(tokenId, resource, finalDelta);
        return;
      }

      runAsync(`resource:${entry.character.id}:${resource}:${finalDelta}`, async () => {
        const result = await adjustCharacterResourceAction({
          sessionCode,
          characterId: entry.character!.id,
          resource,
          delta: finalDelta
        });

        if (!result.ok || !result.character) {
          setFeedback(result.message || "Falha ao atualizar o recurso da ficha.");
          return;
        }

        upsertCharacter(result.character);
      });
    }, 2000);
  };

  const handleUpdateTokenResource = (
    tokenId: string,
    resource: "hp" | "fp",
    value: number
  ) => {
    const entry = tokens.find(t => t.token.id === tokenId);
    if (!entry?.character?.id) {
      setFeedback("Este token não possui uma ficha vinculada para atualização de atributos.");
      return;
    }

    runAsync(`resource-set:${entry.character.id}:${resource}:${value}`, async () => {
      const result = await updateCharacterResourceAction({
        sessionCode,
        characterId: entry.character!.id,
        resource,
        value
      });

      if (!result.ok || !result.character) {
        setFeedback(result.message || "Falha ao atualizar o recurso da ficha.");
        return;
      }

      upsertCharacter(result.character);
    });
  };

  const handleToggleTokenStatus = (tokenId: string, status: TokenStatusPreset) => {
    const entry = tokens.find((t) => t.token.id === tokenId);
    if (!entry) return;

    const currentEffects = entry.token.statusEffects ?? [];
    const updatedEffects = currentEffects.includes(status)
      ? currentEffects.filter((s) => s !== status)
      : [...currentEffects, status];

    runAsync(`update-status:${tokenId}:${status}`, async () => {
      const result = await updateMapTokenAction({
        sessionCode,
        tokenId,
        statusEffects: updatedEffects
      });

      if (!result.ok || !result.token) {
        setFeedback(result.message || "Falha ao atualizar status do token.");
        return;
      }

      upsertMapToken(result.token);
    });
  };

  const handleUpdateCombatNumeric = (
    tokenId: string,
    field: "shock" | "bleeding" | "pain" | "fatigue" | "inspiration",
    value: number
  ) => {
    const entry = tokens.find((t) => t.token.id === tokenId);
    if (!entry?.character?.id) {
      setFeedback("Este token nao possui uma ficha vinculada.");
      return;
    }

    runAsync(`combat-status:${entry.character.id}:${field}:${value}`, async () => {
      const result = await updateCharacterCombatStatusAction({
        sessionCode,
        characterId: entry.character!.id,
        patch: {
          kind: "numeric",
          field,
          value
        }
      });

      if (!result.ok || !result.character) {
        setFeedback(result.message || "Falha ao atualizar efeito da ficha.");
        return;
      }

      upsertCharacter(result.character);
    });
  };

  useEffect(() => {
    if (!selectedToken) {
      setTokenMenu(null);
      setIsTokenDrawerOpen(false);
    }
  }, [selectedToken]);

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

  const renderedWidth = Math.round(worldWidth * zoom);
  const renderedHeight = Math.round(worldHeight * zoom);
  const gridPixelSize = Math.max(
    12,
    Math.round((map.gridSize * renderedWidth) / Math.max(worldWidth, 1))
  );
  const combatPanel = combatState ? (
    <TacticalCombatPanel
      tokens={tokens}
      combatState={combatState}
      combatFlow={combatFlow}
      canManageCombat={canManageCombat}
      isPending={isPending}
      pendingKey={pendingKey}
      onClose={() => setIsCombatDrawerOpen(false)}
      onCombatStart={
        onCombatStart
          ? () => {
            runAsync("combat:start", async () => {
              await onCombatStart();
            });
          }
          : undefined
      }
      onCombatStop={
        onCombatStop
          ? () => {
            runAsync("combat:stop", async () => {
              await onCombatStop();
            });
          }
          : undefined
      }
      onCombatAdvance={
        onCombatAdvance
          ? (direction) => {
            runAsync(`combat:advance:${direction}`, async () => {
              await onCombatAdvance(direction);
            });
          }
          : undefined
      }
      onSelectCombatant={
        onSelectCombatant
          ? (tokenId) => {
            runAsync(`combat:select:${tokenId}`, async () => {
              await onSelectCombatant(tokenId);
            });
          }
          : undefined
      }
      onExecuteCombatAction={
        onExecuteCombatAction
          ? (action) => {
            runAsync(`combat:action:${action.actionType}`, async () => {
              await onExecuteCombatAction(action);
            });
          }
          : undefined
      }
      onRespondCombatPrompt={
        onRespondCombatPrompt
          ? (input) => {
            runAsync(`combat:prompt:${input.eventId}`, async () => {
              await onRespondCombatPrompt(input);
            });
          }
          : undefined
      }
      onRemoveToken={(tokenId) => {
        runAsync(`delete-token:${tokenId}`, async () => {
          await handleDeleteToken(tokenId);
        });
      }}
      onSkipTurn={onSkipTurn}
      onAdjustResource={handleAdjustTokenResource}
      onUpdateResource={handleUpdateTokenResource}
      onToggleStatus={handleToggleTokenStatus}
      onUpdateCombatNumeric={handleUpdateCombatNumeric}
      selectedTokenId={selectedTokenId}
      sessionCode={sessionCode}
    />
  ) : null;

  const combatLogPanel = combatFlow ? (
    <CombatLogPanel
      log={[...combatFlow.log].reverse()}
      sessionCode={sessionCode}
      canManage={canManageCombat}
      onClose={() => setIsCombatLogOpen(false)}
    />
  ) : null;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,21,35,0.96),rgba(17,28,44,0.78))]",
        isFocus ? "p-3 md:p-3.5" : "p-3"
      )}
    >
      <div className="shrink-0 flex flex-wrap items-center gap-1.5">
        <span className="hud-chip h-9 px-2.5 border-amber-300/20 bg-amber-300/10 text-amber-100">
          <ScanSearch size={14} className="mr-1" />
          <span className="hidden sm:inline whitespace-nowrap text-[10px]">modo tatico</span>
        </span>
        <span className="hud-chip h-9 px-2.5 border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] text-[10px]">
          {map.name}
        </span>
        {canManageTokens && !isFocus && (
          <button
            type="button"
            onClick={() => setIsCreatorOpen((current) => !current)}
            className="hud-chip h-9 px-2.5 border-amber-300/20 bg-amber-300/10 text-amber-100 text-[10px]"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">novo token</span>
          </button>
        )}
        {canManageTokens && onRequestLibrary && (
          <button
            type="button"
            onClick={() => onRequestLibrary("maps")}
            className="hud-chip h-9 px-2.5 border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-emerald-300/24 hover:bg-emerald-300/10 hover:text-emerald-100 cursor-pointer text-[10px]"
          >
            <Settings2 size={14} />
            <span className="hidden md:inline">gerenciar mapas</span>
          </button>
        )}

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/12 p-0.5">
          <span className="hud-chip h-8 px-2 border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] text-[10px]">
            <Users size={12} className="mr-1" />
            {visibleTokens.length}
          </span>
          <span className="hud-chip h-8 px-2 border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] text-[10px]">
            <Grid size={12} className="mr-1" />
            {map.gridEnabled ? "on" : "off"}
          </span>
        </div>
        {combatState ? (
          <button
            type="button"
            onClick={() => {
              setIsTokenDrawerOpen(false);
              setIsCombatDrawerOpen((current) => !current);
            }}
            className={cn(
              "hud-chip h-9 px-2.5 transition text-[10px]",
              isCombatDrawerOpen
                ? "border-rose-300/22 bg-rose-300/10 text-rose-100"
                : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
            )}
          >
            <Swords size={14} />
            <span className="hidden sm:inline whitespace-nowrap">
              {combatState.enabled
                ? `turno ${combatState.totalTurns === 0 ? 0 : combatState.activeIndex + 1}`
                : "combate"}
            </span>
          </button>
        ) : null}
        {combatFlow ? (
          <button
            type="button"
            onClick={() => setIsCombatLogOpen((current) => !current)}
            className={cn(
              "hud-chip h-9 px-2.5 transition text-[10px]",
              isCombatLogOpen
                ? "border-sky-300/22 bg-sky-300/10 text-sky-100"
                : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
            )}
          >
            <History size={14} />
            <span className="hidden sm:inline whitespace-nowrap">log</span>
          </button>
        ) : null}
        {canManageTokens && isFocus && selectedToken ? (
          <button
            type="button"
            onClick={() => {
              setIsCombatDrawerOpen(false);
              setTokenMenu(createTokenMenuState(selectedToken));
              setIsTokenDrawerOpen((current) => !current);
            }}
            className={cn(
              "hud-chip h-9 px-2.5 transition text-[10px]",
              isTokenDrawerOpen
                ? "border-amber-300/22 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
            )}
          >
            <ShieldAlert size={14} />
            detalhes
          </button>
        ) : null}
        <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/24 p-0.5 shadow-inner">
          <button
            type="button"
            onClick={fitToViewport}
            title="Ajustar ao tamanho da tela"
            className="rail-button h-9 w-9"
          >
            <ScanSearch size={14} />
          </button>
          <button
            type="button"
            onClick={() => centerViewport()}
            title="Centralizar mapa"
            className="rail-button h-9 w-9"
          >
            <Compass size={14} />
          </button>
          <div className="mx-0.5 h-4 w-[1px] bg-white/10" />
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current - 0.2).toFixed(2)), 0.05, 4.0))}
            className="rail-button h-9 w-9"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[36px] text-center text-[10px] font-bold text-[color:var(--ink-2)]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current + 0.2).toFixed(2)), 0.05, 4.0))}
            className="rail-button h-9 w-9"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Overlays de Combate Gamificados */}
      {combatFlow && (
        <>
          {/* Turno do Jogador */}
          {combatFlow.phase === "command" &&
            combatState?.activeTokenId &&
            dismissedPlayerTurnTokenId !== combatState.activeTokenId &&
            (visibleTokens.find(t => t.token.id === combatState.activeTokenId)?.ownerParticipantId === viewerParticipantId || canManageCombat) && (
              <PlayerTurnOverlay
                token={visibleTokens.find(t => t.token.id === combatState.activeTokenId)!}
                combatState={combatState}
                combatFlow={combatFlow}
                onExecute={(action) => onExecuteCombatAction?.(action)}
                onClose={() => setDismissedPlayerTurnTokenId(combatState.activeTokenId ?? null)}
              />
            )}

          {/* Prompt de Defesa */}
          {combatFlow.phase === "awaiting-defense" &&
            combatFlow.pendingPrompt?.participantId === viewerParticipantId && (() => {
              const prompt = combatFlow.pendingPrompt!;
              return (
                <DefensePromptOverlay
                  summary={prompt.payload.summary}
                  options={prompt.payload.options}
                  defenseLevels={prompt.payload.defenseLevels}
                  canRetreat={prompt.payload.canRetreat}
                  canAcrobatic={prompt.payload.canAcrobatic}
                  onResolve={(option, retreat, acrobatic, manualModifier, feverish) => onRespondCombatPrompt?.({
                    eventId: prompt.eventId!,
                    defenseOption: option,
                    retreat,
                    acrobatic,
                    manualModifier,
                    feverish
                  })}
                />
              );
            })()}

          {/* Notificação de Resultado de Combate */}
          {combatFlow.lastResolution && (
            <CombatNotification 
              key={combatFlow.lastResolution.id}
              resolution={combatFlow.lastResolution} 
            />
          )}
        </>
      )}

      {canManageTokens && !isFocus && isCreatorOpen && (
        <div className="shrink-0 grid gap-3 rounded-[22px] border border-amber-300/16 bg-black/24 p-4 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
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
              <>
                <button
                  type="button"
                  onClick={() => setIsCharacterPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                >
                  <UserRoundSearch size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                  <span className={selectedCharacterId ? "text-white" : "text-[color:var(--ink-3)]"}
                  >
                    {selectedCharacterId
                      ? (availableCharacters.find((c) => c.id === selectedCharacterId)?.name ?? "personagem selecionado")
                      : "escolher personagem..."}
                  </span>
                </button>
                <CharacterVisualPicker
                  open={isCharacterPickerOpen}
                  onClose={() => setIsCharacterPickerOpen(false)}
                  onSelect={(id) => setSelectedCharacterId(id)}
                  characters={characterOptions}
                  assets={assetOptions}
                  excludeIds={usedCharacterIds}
                />
              </>
            )}

            {creatorMode === "npc-asset" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsNpcAssetPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                >
                  <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                  <span className={selectedNpcAssetId ? "text-white" : "text-[color:var(--ink-3)]"}
                  >
                    {selectedNpcAssetId
                      ? (tokenAssetOptions.find((a) => a.id === selectedNpcAssetId)?.label ?? "asset selecionado")
                      : "escolher NPC asset..."}
                  </span>
                </button>
                <AssetVisualPicker
                  open={isNpcAssetPickerOpen}
                  onClose={() => setIsNpcAssetPickerOpen(false)}
                  onSelect={(id) => setSelectedNpcAssetId(id)}
                  assets={assetOptions}
                  filterKinds={["token", "portrait", "npc"]}
                  title="Selecionar NPC Asset"
                />
              </>
            )}

            {creatorMode === "ad-hoc" && (
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={freeTokenLabel}
                  onChange={(event) => setFreeTokenLabel(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  placeholder="Sentinela"
                />
                <button
                  type="button"
                  onClick={() => setIsFreeAssetPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                >
                  <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                  <span className={freeTokenAssetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                  >
                    {freeTokenAssetId
                      ? (tokenAssetOptions.find((a) => a.id === freeTokenAssetId)?.label ?? "imagem")
                      : "sem imagem"}
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["", "sem faccao"],
                    ["ally", "aliado"],
                    ["enemy", "inimigo"],
                    ["neutral", "neutro"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFreeTokenFaction(value as TokenFaction | "")}
                      className={cn(
                        "hud-chip transition cursor-pointer",
                        freeTokenFaction === value
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <AssetVisualPicker
                  open={isFreeAssetPickerOpen}
                  onClose={() => setIsFreeAssetPickerOpen(false)}
                  onSelect={(id) => setFreeTokenAssetId(id)}
                  assets={assetOptions}
                  filterKinds={["token", "portrait", "npc"]}
                  title="Selecionar Imagem do Token"
                />
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
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerLeave={handleViewportPointerUp}
        className={cn(
          "scrollbar-thin relative min-h-0 flex-1 overflow-auto rounded-[24px] border border-white/10 bg-black/28",
          isPanning ? "cursor-grabbing" : "cursor-default",
          compact ? "min-h-[320px]" : isFocus ? "min-h-0" : "min-h-[460px]"
        )}
      >
        <div className="flex min-h-full min-w-full p-3 md:p-4">
          <div
            ref={surfaceRef}
            className="relative m-auto shrink-0 overflow-hidden"
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
              const size = clamp(64 * zoom * entry.token.scale, 40, 128);
              const isSelected =
                entry.token.id === selectedTokenId || entry.token.id === tokenMenu?.tokenId;
              const factionStyle = entry.token.faction
                ? factionMeta[entry.token.faction]
                : null;
              const isCombatActive = entry.token.id === combatState?.activeTokenId;

              return (
                <button
                  key={entry.token.id}
                  type="button"
                  draggable={false}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedTokenId(entry.token.id);
                    if (isFocus && canManageTokens) {
                      setTokenMenu(createTokenMenuState(entry));
                      setIsTokenDrawerOpen(true);
                      setIsCombatDrawerOpen(false);
                    } else {
                      setTokenMenu(null);
                      setIsTokenDrawerOpen(false);
                    }
                  }}
                  onContextMenu={(event) => {
                    if (!canManageTokens) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedTokenId(entry.token.id);
                    setTokenMenu(
                      createTokenMenuState(
                        entry,
                        isFocus ? undefined : { x: event.clientX, y: event.clientY }
                      )
                    );
                    setIsTokenDrawerOpen(isFocus);
                    if (isFocus) {
                      setIsCombatDrawerOpen(false);
                    }
                  }}
                  onPointerDown={(event) => {
                    if (!canDrag) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setSelectedTokenId(entry.token.id);
                    setDragState({
                      tokenId: entry.token.id,
                      x: position.x,
                      y: position.y
                    });
                  }}
                  className={cn(
                    "absolute flex -translate-x-1/2 -translate-y-1/2 touch-none select-none flex-col items-center gap-1.5",
                    canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                  )}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: "max-content",
                    maxWidth: `${Math.max(size * 2, 120)}px`
                  }}
                  aria-label={entry.label}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-full border-2 bg-[rgba(7,16,24,0.82)] shadow-[0_10px_30px_rgba(2,6,23,0.55)] transition",
                      isCombatActive &&
                      "border-amber-200 shadow-[0_0_0_5px_rgba(252,211,77,0.2),0_18px_40px_rgba(2,6,23,0.58)]",
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

                  <div className="flex flex-col items-center gap-1">
                    <span className="whitespace-nowrap rounded-lg border border-black/30 bg-black/70 px-1.5 py-0.5 text-[9px] md:text-[8px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                      {entry.label}
                    </span>
                    {entry.token.faction && (
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[8px] md:text-[7px] font-black uppercase tracking-[0.15em] shadow-sm",
                          factionMeta[entry.token.faction].chip
                        )}
                      >
                        {factionMeta[entry.token.faction].label}
                      </span>
                    )}
                  </div>

                  {/* Indicadores de Dano */}
                  {damagePopups
                    .filter((p) => p.tokenId === entry.token.id)
                    .map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "pointer-events-none absolute left-1/2 top-0 z-[100] -translate-x-1/2 font-black italic animate-out fade-out slide-out-to-top-12 duration-1500 fill-mode-forwards",
                          p.delta < 0 ? "text-rose-500 text-2xl drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]" : "text-emerald-400 text-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        )}
                        style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.8)" }}
                      >
                        {p.delta > 0 ? `+${p.delta}` : p.delta}
                      </div>
                    ))}
                </button>
              );
            })}

            {/* Popups de Rolagens de Dados */}
            {rollPopups.map((popup) => (
              <DiceRollOverlay
                key={popup.id}
                id={popup.id}
                tokenId={popup.tokenId}
                value={popup.value}
                dice={popup.dice}
                isSuccess={popup.isSuccess}
                isCritical={popup.isCritical}
                x={popup.x}
                y={popup.y}
                onComplete={(id) => setRollPopups(prev => prev.filter(p => p.id !== id))}
              />
            ))}
          </div>
        </div>
      </div>

      {tokenMenu && selectedToken && canManageTokens && !isFocus ?
        (() => {
        const activeToken = selectedToken;
        const activeMenu = tokenMenu;

        return (
          <div
            className="fixed z-[80] w-[320px] rounded-[22px] border border-white/10 bg-[rgba(5,10,18,0.92)] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl flex flex-col max-h-[85vh]"
            style={{
              left: clamp(activeMenu.x, 24, window.innerWidth - 344),
              top: clamp(activeMenu.y, 24, window.innerHeight - (window.innerHeight * 0.8))
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
              <div>
                <p className="section-label">Token</p>
                <p className="mt-1 text-sm font-semibold text-white">{activeToken.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(activeToken)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                >
                  {activeToken.token.isVisibleToPlayers ? <Eye size={14} /> : <EyeOff size={14} />}
                  {activeToken.token.isVisibleToPlayers ? "visivel" : "oculto"}
                </button>
                <button
                  type="button"
                  onClick={() => setTokenMenu(null)}
                  className="inline-flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              <input
                value={activeMenu.label}
                onChange={(event) =>
                  setTokenMenu((current) =>
                    current ? { ...current, label: event.target.value } : current
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="Nome do token"
              />

              <button
                type="button"
                onClick={() => setIsTokenMenuAssetPickerOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
              >
                <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                <span className={activeMenu.assetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                >
                  {activeMenu.assetId
                    ? (tokenAssetOptions.find((a) => a.id === activeMenu.assetId)?.label ?? "imagem")
                    : "sem imagem"}
                </span>
              </button>
              <AssetVisualPicker
                open={isTokenMenuAssetPickerOpen}
                onClose={() => setIsTokenMenuAssetPickerOpen(false)}
                onSelect={(id) => {
                  setTokenMenu((current) =>
                    current ? { ...current, assetId: id } : current
                  );
                }}
                assets={assetOptions}
                filterKinds={["token", "portrait", "npc"]}
                title="Selecionar Imagem do Token"
              />

              <div className="flex flex-wrap gap-2">
                {[
                  ["", "sem faccao"],
                  ["ally", "aliado"],
                  ["enemy", "inimigo"],
                  ["neutral", "neutro"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setTokenMenu((current) =>
                        current
                          ? { ...current, faction: value as TokenFaction | "" }
                          : current
                      )
                    }
                    className={cn(
                      "hud-chip transition cursor-pointer",
                      activeMenu.faction === value
                        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                  <span>escala</span>
                  <span>{activeMenu.scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={activeMenu.scale}
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
                    {activeMenu.statusEffects.length} ativos
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tokenStatusMeta).map(([status, meta]) => {
                    const enabled = activeMenu.statusEffects.includes(status as TokenStatusPreset);

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

              {activeToken.character && (() => {
                const linkedCharacter = activeToken.character;

                return (
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="section-label">recursos da ficha</span>
                      <span className="text-xs text-[color:var(--ink-3)]">
                        {linkedCharacter.name}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(
                        [
                          ["hp", "PV", `${linkedCharacter.hp}/${linkedCharacter.hpMax}`],
                          ["fp", "PF", `${linkedCharacter.fp}/${linkedCharacter.fpMax}`]
                        ] as const
                      ).map(([resource, label, value]) => (
                        <div
                          key={resource}
                          className="rounded-2xl border border-white/10 bg-black/18 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="section-label">{label}</p>
                              <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                            </div>
                            <div className="flex gap-2">
                              {[-1, 1].map((delta) => (
                                <button
                                  key={`${resource}:${delta}`}
                                  type="button"
                                  onClick={() =>
                                    handleAdjustTokenResource(activeToken.token.id, resource, delta)
                                  }
                                  disabled={isPending}
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                                >
                                  {pendingKey ===
                                    `resource:${linkedCharacter.id}:${resource}:${delta}` ? (
                                    <LoaderCircle size={12} className="animate-spin" />
                                  ) : delta > 0 ? (
                                    `+${delta}`
                                  ) : (
                                    `${delta}`
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetCharacter(linkedCharacter);
                        setIsSheetOpen(true);
                        setTokenMenu(null);
                      }}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 transition-all hover:bg-sky-400/20 active:scale-95"
                    >
                      <ScrollText size={14} />
                      Abrir Ficha Completa
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDeleteToken(activeToken.token.id)}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
              >
                {pendingKey === `delete-token:${activeToken.token.id}` ? (
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
                {pendingKey === `update-token:${activeToken.token.id}` ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                salvar ajustes
              </button>
            </div>
          </div>
        );
      })() : null}

      {tokenMenu && selectedToken && canManageTokens && isFocus && isTokenDrawerOpen ?
        (() => {
        const activeToken = selectedToken;
        const activeMenu = tokenMenu;

        return (
          <div className="pointer-events-none absolute inset-y-3 right-3 z-[31] flex w-[min(380px,calc(100%-1.5rem))] justify-end md:w-[360px]">
            <div className="pointer-events-auto h-full max-h-full w-full overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(5,10,18,0.96)] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-label">Token</p>
                  <p className="mt-1 text-sm font-semibold text-white">{activeToken.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(activeToken)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                  >
                    {activeToken.token.isVisibleToPlayers ? <Eye size={14} /> : <EyeOff size={14} />}
                    {activeToken.token.isVisibleToPlayers ? "visivel" : "oculto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTokenDrawerOpen(false)}
                    className="inline-flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mt-4">
                <input
                  value={activeMenu.label}
                  onChange={(event) =>
                    setTokenMenu((current) =>
                      current ? { ...current, label: event.target.value } : current
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  placeholder="Nome do token"
                />

                <button
                  type="button"
                  onClick={() => setIsTokenMenuAssetPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition hover:border-amber-300/25 cursor-pointer"
                >
                  <ImageIcon size={16} className="shrink-0 text-[color:var(--ink-3)]" />
                  <span className={activeMenu.assetId ? "text-white truncate" : "text-[color:var(--ink-3)]"}
                  >
                    {activeMenu.assetId
                      ? (tokenAssetOptions.find((a) => a.id === activeMenu.assetId)?.label ?? "imagem")
                      : "sem imagem"}
                  </span>
                </button>
                <AssetVisualPicker
                  open={isTokenMenuAssetPickerOpen}
                  onClose={() => setIsTokenMenuAssetPickerOpen(false)}
                  onSelect={(id) => {
                    setTokenMenu((current) =>
                      current ? { ...current, assetId: id } : current
                    );
                  }}
                  assets={assetOptions}
                  filterKinds={["token", "portrait", "npc"]}
                  title="Selecionar Imagem do Token"
                />

                <div className="flex flex-wrap gap-2">
                  {[
                    ["", "sem faccao"],
                    ["ally", "aliado"],
                    ["enemy", "inimigo"],
                    ["neutral", "neutro"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setTokenMenu((current) =>
                          current
                            ? { ...current, faction: value as TokenFaction | "" }
                            : current
                        )
                      }
                      className={cn(
                        "hud-chip transition cursor-pointer",
                        activeMenu.faction === value
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                    <span>escala</span>
                    <span>{activeMenu.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    value={activeMenu.scale}
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
                      {activeMenu.statusEffects.length} ativos
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tokenStatusMeta).map(([status, meta]) => {
                      const enabled = activeMenu.statusEffects.includes(status as TokenStatusPreset);

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

                {activeToken.character && (() => {
                  const linkedCharacter = activeToken.character;

                  return (
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="section-label">recursos da ficha</span>
                        <span className="text-xs text-[color:var(--ink-3)]">
                          {linkedCharacter.name}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {(
                          [
                            ["hp", "PV", `${linkedCharacter.hp}/${linkedCharacter.hpMax}`],
                            ["fp", "PF", `${linkedCharacter.fp}/${linkedCharacter.fpMax}`]
                          ] as const
                        ).map(([resource, label, value]) => (
                          <div
                            key={resource}
                            className="rounded-2xl border border-white/10 bg-black/18 px-3 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="section-label">{label}</p>
                                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                              </div>
                              <div className="flex gap-2">
                                {[-1, 1].map((delta) => (
                                  <button
                                    key={`${resource}:${delta}`}
                                    type="button"
                                    onClick={() =>
                                      handleAdjustTokenResource(activeToken.token.id, resource, delta)
                                    }
                                    disabled={isPending}
                                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                                  >
                                    {pendingKey ===
                                      `resource:${linkedCharacter.id}:${resource}:${delta}` ? (
                                      <LoaderCircle size={12} className="animate-spin" />
                                    ) : delta > 0 ? (
                                      `+${delta}`
                                    ) : (
                                      `${delta}`
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteToken(activeToken.token.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                  >
                    {pendingKey === `delete-token:${activeToken.token.id}` ? (
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
                    {pendingKey === `update-token:${activeToken.token.id}` ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    salvar ajustes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {isCombatDrawerOpen && combatPanel && (
        <div className="pointer-events-none absolute inset-y-3 right-3 z-[30] flex w-[min(360px,calc(100%-1.5rem))] justify-end md:w-[340px]">
          <div className="pointer-events-auto h-full max-h-full w-full overflow-hidden animate-in slide-in-from-right duration-500">
            {combatPanel}
          </div>
        </div>
      )}

      {isCombatLogOpen && combatLogPanel && (
        <div className="pointer-events-none absolute inset-y-3 left-3 z-[30] flex w-[min(360px,calc(100%-1.5rem))] justify-start md:w-[340px]">
          <div className="pointer-events-auto h-full max-h-full w-full overflow-hidden animate-in slide-in-from-left duration-500">
            {combatLogPanel}
          </div>
        </div>
      )}

      {feedback && <p className="text-sm text-amber-100">{feedback}</p>}

      {isSheetOpen && sheetCharacter && (
        <CharacterSheetModal
          sessionCode={sessionCode}
          character={sheetCharacter}
          onClose={() => setIsSheetOpen(false)}
          canManage={canManageTokens}
          tokenId={selectedTokenId}
        />
      )}
    </div>
  );
}




