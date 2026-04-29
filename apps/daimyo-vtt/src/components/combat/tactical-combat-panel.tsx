"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  X,
  Zap,
  Eye,
  Brain,
  Timer,
  Footprints,
  Ban,
  LoaderCircle,
  HeartPulse,
  SkipForward,
  Power
} from "lucide-react";
import { HealthBar } from "@/components/combat/health-bar";
import { CombatTurnQueue } from "@/components/combat/combat-turn-queue";
import { CombatantStatusCard } from "@/components/combat/combatant-status-card";
import { suggestNpcManeuver } from "@/lib/combat/ai";
import { getStylesAction } from "@/app/actions/character-actions";
import { cn } from "@/lib/utils";
import type {
  TacticalCombatStateView,
  TacticalStageToken
} from "@/lib/maps/selectors";
import type { TokenStatusPreset } from "@/types/map";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
  CombatActionType,
  CombatDefenseOption,
  CombatDraftAction,
  CombatHitLocationId,
  CharacterTechniqueRecord,
  FeintType,
  SessionCombatFlow,
  TacticalRollMode
} from "@/types/combat";

interface PromptResponseInput {
  eventId: string;
  defenseOption: CombatDefenseOption;
  retreat?: boolean;
  acrobatic?: boolean;
  feverish?: boolean;
}

interface TacticalCombatPanelProps {
  tokens: TacticalStageToken[];
  combatState: TacticalCombatStateView;
  combatFlow: SessionCombatFlow | null;
  canManageCombat: boolean;
  onClose: () => void;
  onCombatStart?: () => void;
  onCombatStop?: () => void;
  onCombatAdvance?: (direction: "next" | "previous") => void;
  onSelectCombatant?: (tokenId: string) => void;
  onExecuteCombatAction?: (action: CombatDraftAction) => void;
  onRespondCombatPrompt?: (input: PromptResponseInput) => void;
  onGmTakeOver?: (tokenId: string) => void;
  onSkipTurn?: () => void;
  onRemoveToken?: (tokenId: string) => void;
  onAdjustResource?: (tokenId: string, resource: "hp" | "fp", delta: number) => void;
  onUpdateResource?: (tokenId: string, resource: "hp" | "fp", value: number) => void;
  selectedTokenId?: string | null;
  sessionCode: string;
  isPending?: boolean;
  pendingKey?: string | null;
  onToggleStatus?: (tokenId: string, status: TokenStatusPreset) => void;
  onUpdateCombatNumeric?: (
    tokenId: string,
    field: "shock" | "bleeding" | "pain" | "fatigue" | "inspiration",
    value: number
  ) => void;
}

const actionMeta: Array<{
  id: CombatActionType;
  label: string;
  requiresTarget: boolean;
  level: number;
  description?: string;
}> = [
  { id: "move", label: "mover", requiresTarget: false, level: 1 },
  { id: "attack", label: "ataque", requiresTarget: true, level: 1 },
  { id: "ranged-attack", label: "distancia", requiresTarget: true, level: 1 },
  { id: "all-out-attack", label: "ataque total", requiresTarget: true, level: 1 },
  { id: "feint", label: "finta", requiresTarget: true, level: 3 },
  { id: "feint-beat", label: "finta (batida)", requiresTarget: true, level: 3 },
  { id: "feint-mental", label: "finta (mental)", requiresTarget: true, level: 3 },
  { id: "aim", label: "mirar", requiresTarget: true, level: 1 },
  { id: "evaluate", label: "avaliar", requiresTarget: true, level: 1 },
  { id: "all-out-defense", label: "defesa total", requiresTarget: false, level: 1 },
  { id: "ready", label: "preparar", requiresTarget: false, level: 1 },
  { id: "concentrate", label: "concentrar", requiresTarget: false, level: 1 },
  { id: "wait", label: "esperar", requiresTarget: false, level: 1 },
  { id: "quick-contest", label: "disputa rapida", requiresTarget: true, level: 2 },
  { id: "regular-contest", label: "disputa regular", requiresTarget: true, level: 2 },
  { id: "do-nothing", label: "fazer nada", requiresTarget: false, level: 1 },
  { id: "swap-technique", label: "trocar tecnica", requiresTarget: false, level: 1 },
  { id: "iai-strike", label: "iaijutsu", requiresTarget: true, level: 3 },
  { id: "clash-simple", label: "clash simples", requiresTarget: true, level: 1 }
];

const hitLocationOptions: Array<{ value: CombatHitLocationId; label: string }> = [
  { value: "torso", label: "torso" },
  { value: "vitals", label: "vitais" },
  { value: "face", label: "rosto" },
  { value: "neck", label: "pescoco" },
  { value: "skull", label: "cranio" },
  { value: "arm", label: "braco" },
  { value: "hand", label: "mao" },
  { value: "leg", label: "perna" },
  { value: "foot", label: "pe" },
  { value: "eye", label: "olho" },
  { value: "chink", label: "fenda" }
];

function readNumber(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ToggleChip({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
        active
          ? "border-[color:var(--accent)]/24 bg-[color:var(--accent)]/12 text-[color:var(--accent)]"
          : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-2)] hover:border-[color:var(--ink-3)] hover:text-[color:var(--ink-1)]"
      )}
    >
      {children}
    </button>
  );
}

const isAttackManeuver = (type: CombatActionType) =>
  type === "attack" || type === "ranged-attack" || type === "all-out-attack" || type === "iai-strike" || type === "clash-simple";

const isRangedManeuver = (type: CombatActionType) =>
  type === "ranged-attack" || type === "aim";

export function TacticalCombatPanel({
  tokens,
  combatState,
  combatFlow,
  canManageCombat,
  onClose,
  onCombatStart,
  onCombatStop,
  onCombatAdvance,
  onSelectCombatant,
  onExecuteCombatAction,
  onRespondCombatPrompt,
  onGmTakeOver,
  onSkipTurn,
  onRemoveToken,
  onAdjustResource,
  onUpdateResource,
  onToggleStatus,
  onUpdateCombatNumeric,
  selectedTokenId,
  sessionCode,
  isPending = false,
  pendingKey = null
}: TacticalCombatPanelProps) {
  const activeEntry = combatState.activeEntry ?? null;
  const actorProfile = activeEntry?.character?.sheetProfile ?? null;
  const [actionType, setActionType] = useState<CombatActionType>("attack");
  const [targetTokenId, setTargetTokenId] = useState<string | null>(null);
  const [weaponId, setWeaponId] = useState<string | null>(null);
  const [weaponModeId, setWeaponModeId] = useState<string | null>(null);
  const [techniqueId, setTechniqueId] = useState<string | null>(null);
  const [replaceTechniqueId, setReplaceTechniqueId] = useState<string | null>(null);
  const [hitLocation, setHitLocation] = useState<CombatHitLocationId>("torso");
  const [manualToHit, setManualToHit] = useState("0");
  const [manualDamage, setManualDamage] = useState("0");
  const [rangeMeters, setRangeMeters] = useState("");
  const [aimTurns, setAimTurns] = useState("");
  const [contestLabel, setContestLabel] = useState("");
  const [selectedDefense, setSelectedDefense] = useState<CombatDefenseOption>("none");
  const [braced, setBraced] = useState(false);
  const [determined, setDetermined] = useState(false);
  const [retreat, setRetreat] = useState(false);
  const [acrobatic, setAcrobatic] = useState(false);
  const [promptDefense, setPromptDefense] = useState<CombatDefenseOption>("none");
  const [promptRetreat, setPromptRetreat] = useState(false);
  const [promptAcrobatic, setPromptAcrobatic] = useState(false);
  const [promptFeverish, setPromptFeverish] = useState(false);
  const [feverish, setFeverish] = useState(false);
  
  // Novas states para manobras automatizadas
  const [waitTrigger, setWaitTrigger] = useState("");
  const [allOutVariant, setAllOutVariant] =
    useState<AllOutAttackVariant | AllOutDefenseVariant>("determined");
  const [roundsNeeded, setRoundsNeeded] = useState(2);
  const [feintAttribute, setFeintAttribute] = useState<FeintType>("dx");
  const [rollMode, setRollMode] = useState<TacticalRollMode>("normal");
  const [useInspiration, setUseInspiration] = useState(false);
  const [swapType, setSwapType] = useState<"technique" | "style">("technique");
  const [catalogStyles, setCatalogStyles] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<{ maneuver: CombatActionType; reason: string } | null>(null);

  const availableTargets = useMemo(
    () => tokens.filter((entry) => entry.token.id !== activeEntry?.token.id),
    [activeEntry?.token, tokens]
  );
  const selectedTarget =
    availableTargets.find((entry) => entry.token.id === targetTokenId) ?? null;
  const selectedWeapon =
    actorProfile?.weapons.find((entry) => entry.id === weaponId) ??
    actorProfile?.weapons[0] ??
    null;
  const selectedMode =
    selectedWeapon?.modes.find((entry) => entry.id === weaponModeId) ??
    selectedWeapon?.modes[0] ??
    null;
  const loadedTechniques = useMemo(
    () =>
      (actorProfile?.combat.loadoutTechniqueIds ?? [])
        .map((entry) => actorProfile?.techniques.find((technique) => technique.id === entry) ?? null)
        .filter((entry): entry is CharacterTechniqueRecord => Boolean(entry)),
    [actorProfile]
  );
  const allTechniques = actorProfile?.techniques ?? [];
  const pendingPrompt = combatFlow?.pendingPrompt ?? null;
  const lastResolution = combatFlow?.lastResolution ?? null;
  const combatLog = combatFlow?.log.slice(-6).reverse() ?? [];
  const visibleActions = useMemo(() => {
    return actionMeta.filter(action => {
      if (action.level === 1) return true;
      // Map action IDs to Mastery IDs used in the sheet
      const masteryId = action.id === "feint" ? "m3-feint" : 
                        action.id === "feint-beat" ? "m3-beat" :
                        action.id === "feint-mental" ? "m3-ruse" :
                        action.id === "iai-strike" ? "m3-iai" : action.id;
      return (actorProfile?.combat.loadoutTechniqueIds ?? []).includes(masteryId);
    });
  }, [actorProfile]);

  const styleTechniques = useMemo(() => {
    return (actorProfile?.combat.loadoutStyleTechniqueIds ?? []);
  }, [actorProfile]);

  const availableStyleTechs = useMemo(() => {
    const sName = actorProfile?.style.name;
    const styleData = catalogStyles.find(s => s.nome === sName);
    return (styleData?.tecnicas ?? []) as Array<{ nome: string; desc: string }>;
  }, [catalogStyles, actorProfile?.style.name]);

  const isSwapPending = Boolean(actorProfile?.combat.pendingSwap);

  const currentActionMeta =
    actionMeta.find((entry) => entry.id === actionType) ?? actionMeta[0];

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const nextWeaponId = actorProfile?.combat.activeWeaponId ?? actorProfile?.weapons[0]?.id ?? null;
    const nextWeapon =
      actorProfile?.weapons.find((entry) => entry.id === nextWeaponId) ??
      actorProfile?.weapons[0] ??
      null;
    const nextModeId =
      actorProfile?.combat.activeWeaponModeId ??
      nextWeapon?.modes[0]?.id ??
      null;

    setWeaponId(nextWeaponId);
    setWeaponModeId(nextModeId);
    setTechniqueId(actorProfile?.combat.loadoutTechniqueIds[0] ?? null);
    setReplaceTechniqueId(actorProfile?.combat.loadoutTechniqueIds[0] ?? null);
    setTargetTokenId((current) => {
      // Prioridade 1: Manter o selecionado se ele ainda for válido
      if (current && availableTargets.some((entry) => entry.token.id === current)) {
        return current;
      }

      // Prioridade 2: Usar o token selecionado no mapa se ele for um alvo válido
      if (selectedTokenId && availableTargets.some((entry) => entry.token.id === selectedTokenId)) {
        return selectedTokenId;
      }

      // Prioridade 3: Primeiro alvo disponível
      return availableTargets[0]?.token.id ?? null;
    });
  }, [availableTargets, selectedTokenId]);

  useEffect(() => {
    if (!selectedWeapon) {
      setWeaponModeId(null);
      return;
    }

    setWeaponModeId((current) => {
      if (current && selectedWeapon.modes.some((entry) => entry.id === current)) {
        return current;
      }

      return selectedWeapon.modes[0]?.id ?? null;
    });
  }, [selectedWeapon]);

  useEffect(() => {
    if (actionType === "swap-technique" && catalogStyles.length === 0) {
      getStylesAction({ sessionCode }).then(res => {
        if (res.ok) setCatalogStyles(res.styles);
      });
    }
  }, [actionType, sessionCode, catalogStyles.length]);

  useEffect(() => {
    const options = pendingPrompt?.payload.options ?? [];
    setPromptDefense(options[0] ?? "none");
    setPromptRetreat(false);
    setPromptAcrobatic(false);
    setPromptFeverish(false);
  }, [pendingPrompt?.eventId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleExecute = () => {
    if (!activeEntry || !onExecuteCombatAction) {
      return;
    }

    if (currentActionMeta.requiresTarget && !selectedTarget) {
      return;
    }

    const inspiration = actorProfile?.combat?.inspiration ?? 0;
    const finalRollMode: TacticalRollMode =
      useInspiration && rollMode === "normal" ? "advantage" : rollMode;
    const draftAction: CombatDraftAction = {
      actorTokenId: activeEntry.token.id,
      targetTokenId: currentActionMeta.requiresTarget ? selectedTarget?.token.id ?? null : null,
      actionType,
      weaponId,
      weaponModeId,
      techniqueId:
        actionType === "swap-technique"
          ? techniqueId
          : loadedTechniques.some((entry) => entry?.id === techniqueId)
            ? techniqueId
            : loadedTechniques[0]?.id ?? techniqueId,
      replaceTechniqueId: actionType === "swap-technique" ? replaceTechniqueId : null,
      isStyle: actionType === "swap-technique" ? swapType === "style" : undefined,
      hitLocation: isAttackManeuver(actionType) ? hitLocation : "torso",
      modifiers: {
        manualToHit: readNumber(manualToHit),
        manualDamage: readNumber(manualDamage),
        hitLocation: isAttackManeuver(actionType) ? hitLocation : "torso",
        rangeMeters: rangeMeters.trim() ? readNumber(rangeMeters) : null,
        aimTurns: aimTurns.trim() ? readNumber(aimTurns) : null,
        braced,
        determined,
        retreat,
        acrobatic,
        feverish,
        recoil: false,
        sizeModifier: null
      },
      selectedDefense,
      contestLabel: contestLabel.trim() || null,
      // Novos campos
      allOutVariant: actionType === "all-out-attack" ? allOutVariant as AllOutAttackVariant : undefined,
      allOutDefenseVariant: actionType === "all-out-defense" ? allOutVariant as AllOutDefenseVariant : undefined,
      feintAttribute: actionType.startsWith("feint") ? feintAttribute : undefined,
      waitTrigger: actionType === "wait" ? waitTrigger : undefined,
      roundsNeeded: actionType === "regular-contest" ? roundsNeeded : undefined,
      rollMode: isAttackManeuver(actionType) ? finalRollMode : "normal",
      inspirationSpent: isAttackManeuver(actionType) && useInspiration && inspiration > 0
    };

    onExecuteCombatAction(draftAction);
    setWaitTrigger("");
  };

  const handlePromptResolve = () => {
    if (!pendingPrompt?.eventId || !onRespondCombatPrompt) {
      return;
    }

    onRespondCombatPrompt({
      eventId: pendingPrompt.eventId,
      defenseOption: promptDefense,
      retreat: promptRetreat,
      acrobatic: promptAcrobatic,
      feverish: promptFeverish
    });
  };

  const canExecute =
    Boolean(onExecuteCombatAction) &&
    canManageCombat &&
    combatState.enabled &&
    Boolean(activeEntry) &&
    (!currentActionMeta.requiresTarget || Boolean(selectedTarget)) &&
    (actionType !== "swap-technique" || Boolean(techniqueId));

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-[color:var(--border-panel)] bg-[color:var(--bg-panel)]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-chip border-[color:var(--red-accent)]/20 bg-[color:var(--red-accent)]/10 text-[color:var(--red-accent)]">
              <Swords size={14} />
              combate
            </span>
            <span className="hud-chip border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-2)]">
              {combatState.totalTurns} combatentes
            </span>
            {combatState.enabled ? (
              <span className="hud-chip border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
                rodada {combatState.round}
              </span>
            ) : null}
            {combatFlow?.phase ? (
              <span className="hud-chip border-[color:var(--border-panel)] bg-[color:var(--bg-deep)]/20 text-[color:var(--ink-2)]">
                fase {combatFlow.phase}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
            {combatState.enabled
              ? `Ativo: ${activeEntry?.label ?? "sem destaque"}.`
              : "Inicie a ordem para abrir o painel gamificado e a fila de turnos."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {!combatState.enabled ? (
          canManageCombat && (
            <button
              type="button"
              onClick={onCombatStart}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-rose-100 transition hover:border-rose-300/40 active:scale-95"
            >
              <Swords size={14} />
              iniciar ordem de combate
            </button>
          )
        ) : canManageCombat ? (
          <>
            <div className="col-span-2 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onCombatAdvance?.("previous")}
                disabled={isPending}
                title="Voltar Turno"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10 hover:border-white/30 disabled:opacity-30"
              >
                {isPending && pendingKey === "combat:advance:previous" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <ChevronLeft size={16} />
                )}
                <span className="opacity-70">Ant</span>
              </button>

              <button
                type="button"
                onClick={() => onCombatAdvance?.("next")}
                disabled={isPending}
                title="Próximo Turno"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10 hover:border-white/30 disabled:opacity-30"
              >
                {isPending && pendingKey === "combat:advance:next" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span className="opacity-70">Prox</span>
              </button>

              <button
                type="button"
                onClick={onSkipTurn}
                disabled={isPending}
                title="Pular Turno"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 py-3 text-[10px] font-black uppercase tracking-widest text-amber-200 transition hover:bg-amber-500/20 hover:border-amber-500/40 disabled:opacity-30"
              >
                {isPending && pendingKey === "combat:skip" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <SkipForward size={16} />
                )}
                <span className="opacity-70">Pular</span>
              </button>

              <button
                type="button"
                onClick={onCombatStop}
                disabled={isPending}
                title="Encerrar Combate"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 py-3 text-[10px] font-black uppercase tracking-widest text-rose-200 transition hover:bg-rose-500/20 hover:border-rose-500/40 disabled:opacity-30"
              >
                {isPending && pendingKey === "combat:stop" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Power size={16} />
                )}
                <span className="opacity-70">Fim</span>
              </button>
            </div>
          </>
        ) : null}

        {combatState.enabled && activeEntry && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('daimyo:show-turn-overlay', { detail: { tokenId: activeEntry.token.id } }));
              }}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 transition-all hover:bg-sky-400/20 hover:scale-105 active:scale-95"
            >
              <Sparkles size={14} className="animate-pulse" />
              Gamificação
            </button>
          </div>
        )}
      </div>

      <div className="scrollbar-thin mt-4 flex-1 space-y-4 overflow-y-auto pr-1 pt-4">
        <section className="mb-2">
          <p className="section-label mb-2 px-1">Fila de Turnos</p>
          <CombatTurnQueue
            tokens={combatState.turnOrder}
            activeTokenId={combatState.activeTokenId}
            onSelect={onSelectCombatant}
          />
        </section>

        {combatFlow?.regularContest && (
          <section className="rounded-[22px] border border-purple-500/30 bg-purple-500/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Swords size={14} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-purple-400">
                  Disputa Regular em Andamento
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {combatFlow.regularContest.roundsNeeded} vit. necessarias
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/20 p-3 text-center">
                <p className="text-2xl font-black text-white">{combatFlow.regularContest.actorWins}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  {combatState.turnOrder.find(t => t.token.id === combatFlow.regularContest?.actorTokenId)?.label ?? "Atacante"}
                </p>
              </div>
              <div className="rounded-xl bg-black/20 p-3 text-center">
                <p className="text-2xl font-black text-white">{combatFlow.regularContest.targetWins}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  {combatState.turnOrder.find(t => t.token.id === combatFlow.regularContest?.targetTokenId)?.label ?? "Defensor"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-bold text-purple-400/60">
              Continue a disputa com &quot;Disputa Regular&quot; selecionada
            </p>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="section-label">Status dos Combatentes</p>
            <p className="text-[9px] font-bold text-white/20 uppercase">Clique para expandir</p>
          </div>
          <div className="grid gap-2">
            {combatState.turnOrder.map((entry) => (
              <CombatantStatusCard 
                key={entry.token.id}
                entry={entry}
                isActive={entry.token.id === combatState.activeTokenId}
                onSelect={onSelectCombatant}
                onAdjustResource={onAdjustResource}
                onToggleStatus={onToggleStatus}
                onUpdateCombatNumeric={onUpdateCombatNumeric}
              />
            ))}
          </div>
        </section>


        {combatState.enabled && activeEntry && canManageCombat ? (
          <>
            <section className="rounded-[20px] border border-white/10 bg-black/18 p-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair size={14} className="text-white" />
                  <p className="section-label">Comando do turno</p>
                </div>
                <div className="flex items-center gap-3">
                  {activeEntry?.ownerParticipantId && (
                    <button
                      type="button"
                      onClick={() => onGmTakeOver?.(activeEntry.token.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-amber-500/60 hover:text-amber-500 transition-colors"
                    >
                      Assumir Turno
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger global event or state to show overlay
                      // In our case, the overlay appears automatically if the GM is active and hasn't dismissed it
                      // but we can force it by clearing the dismissed state
                      window.dispatchEvent(new CustomEvent('daimyo:show-turn-overlay', { detail: { tokenId: activeEntry.token.id } }));
                    }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-sky-400/60 hover:text-sky-400 transition-colors"
                  >
                    <Sparkles size={10} />
                    Modo Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (actorProfile) {
                        const targetProf = selectedTarget?.character?.sheetProfile ?? null;
                        const suggestion = suggestNpcManeuver(actorProfile, combatState, targetProf);
                        setAiSuggestion(suggestion);
                        setActionType(suggestion.maneuver);
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 hover:text-emerald-400 transition-colors"
                  >
                    <Brain size={10} />
                    Sugerir Ação (IA)
                  </button>
                </div>
              </div>

              {aiSuggestion && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Sugestão da IA</p>
                    <button onClick={() => setAiSuggestion(null)} className="text-emerald-400/50 hover:text-emerald-400">
                      <X size={10} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-emerald-100 font-medium">{aiSuggestion.reason}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {visibleActions.map((entry) => (
                  <ToggleChip
                    key={entry.id}
                    active={entry.id === actionType}
                    onClick={() => setActionType(entry.id)}
                  >
                    {entry.label}
                  </ToggleChip>
                ))}
              </div>

              <div className="mt-4 grid gap-3">
                {actionType === "wait" && (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">gatilho da espera</span>
                    <input
                      value={waitTrigger}
                      onChange={(e) => setWaitTrigger(e.target.value)}
                      placeholder="ex.: se ele se mover, se ele me atacar..."
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                    />
                  </label>
                )}

                {actionType === "feint" && (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">tipo de finta</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {[
                        { id: "dx" as FeintType, label: "DX (basica)" },
                        { id: "st" as FeintType, label: "ST (batida)" },
                        { id: "iq" as FeintType, label: "IQ (mental)" },
                      ].map((attr) => (
                        <ToggleChip key={attr.id} active={feintAttribute === attr.id} onClick={() => setFeintAttribute(attr.id)}>
                          {attr.label}
                        </ToggleChip>
                      ))}
                    </div>
                  </label>
                )}

                {(actionType === "all-out-attack" || actionType === "all-out-defense") && (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">variante {actionType === "all-out-attack" ? "ataque total" : "defesa total"}</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {actionType === "all-out-attack" ? (
                        <>
                          {(["determined", "strong", "double", "long"] as AllOutAttackVariant[]).map((v) => (
                            <ToggleChip key={v} active={allOutVariant === v} onClick={() => setAllOutVariant(v)}>
                              {v === "determined" ? "determinado" : v === "strong" ? "forte" : v === "double" ? "duplo" : "longo"}
                            </ToggleChip>
                          ))}
                        </>
                      ) : (
                        <>
                          {(["increased", "double"] as AllOutDefenseVariant[]).map((v) => (
                            <ToggleChip key={v} active={allOutVariant === v} onClick={() => setAllOutVariant(v)}>
                              {v === "increased" ? "aumentada" : "dupla"}
                            </ToggleChip>
                          ))}
                        </>
                      )}
                    </div>
                  </label>
                )}

                {actionType === "regular-contest" && (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">vitorias necessarias</span>
                    <input
                      type="number"
                      value={roundsNeeded}
                      onChange={(e) => setRoundsNeeded(parseInt(e.target.value) || 1)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                    />
                  </label>
                )}

                {styleTechniques.length > 0 && isAttackManeuver(actionType) && (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">tecnica de estilo</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {styleTechniques.map((t) => (
                        <ToggleChip key={t} active={techniqueId === t} onClick={() => setTechniqueId(techniqueId === t ? null : t)}>
                          {t}
                        </ToggleChip>
                      ))}
                    </div>
                  </label>
                )}

                <label className="space-y-1.5 text-sm">
                  <span className="section-label">arma</span>
                  <select
                    value={weaponId ?? ""}
                    onChange={(event) => setWeaponId(event.target.value || null)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                  >
                    <option value="">sem arma</option>
                    {(actorProfile?.weapons ?? []).map((weapon) => (
                      <option key={weapon.id} value={weapon.id}>
                        {weapon.name} · {weapon.state}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="section-label">modo</span>
                  <select
                    value={weaponModeId ?? ""}
                    onChange={(event) => setWeaponModeId(event.target.value || null)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                  >
                    <option value="">sem modo</option>
                    {(selectedWeapon?.modes ?? []).map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label} · {mode.damage.raw}
                      </option>
                    ))}
                  </select>
                </label>

                {actionType === "swap-technique" ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wide">
                      <Ban size={12} />
                      Custa o Turno Inteiro — voce nao podera se defender
                    </div>

                    {isSwapPending && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wide">
                        <Timer size={12} />
                        Troca ja agendada para o proximo turno
                      </div>
                    )}

                    <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
                      {(["technique", "style"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setSwapType(type);
                            setTechniqueId(null);
                            setReplaceTechniqueId(null);
                          }}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition",
                            swapType === type ? "bg-amber-300/10 text-amber-100 border border-amber-300/20" : "text-[color:var(--ink-3)] hover:text-white"
                          )}
                        >
                          {type === "technique" ? "Manobra" : "Estilo"}
                        </button>
                      ))}
                    </div>

                    <label className="space-y-1.5 text-sm">
                      <span className="section-label">nova {swapType === "technique" ? "tecnica" : "tecnica de estilo"}</span>
                      <select
                        value={techniqueId ?? ""}
                        onChange={(event) => setTechniqueId(event.target.value || null)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                      >
                        <option value="">escolha</option>
                        {swapType === "technique" ? (
                          allTechniques.map((technique) => (
                            <option key={technique.id} value={technique.id}>
                              {technique.name}
                            </option>
                          ))
                        ) : (
                          availableStyleTechs.map((tech) => (
                            <option key={tech.nome} value={tech.nome}>
                              {tech.nome}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <span className="section-label">substitui</span>
                      <select
                        value={replaceTechniqueId ?? ""}
                        onChange={(event) => setReplaceTechniqueId(event.target.value || null)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                      >
                        <option value="">escolha</option>
                        {swapType === "technique" ? (
                          loadedTechniques.map((technique) => (
                            <option key={technique.id} value={technique.id}>
                              {technique.name}
                            </option>
                          ))
                        ) : (
                          styleTechniques.map((techId) => (
                            <option key={techId} value={techId}>
                              {techId}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">tecnica equipada</span>
                    <select
                      value={techniqueId ?? ""}
                      onChange={(event) => setTechniqueId(event.target.value || null)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                    >
                      <option value="">sem tecnica</option>
                      {loadedTechniques.map((technique) => (
                        <option key={technique.id} value={technique.id}>
                          {technique.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {currentActionMeta.requiresTarget ? (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="section-label">alvo</span>
                      <select
                        value={targetTokenId ?? ""}
                        onChange={(event) => setTargetTokenId(event.target.value || null)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                      >
                        <option value="">escolha</option>
                        {availableTargets.map((entry) => (
                          <option key={entry.token.id} value={entry.token.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isAttackManeuver(actionType) && (
                      <label className="space-y-1.5 text-sm animate-in fade-in slide-in-from-top-1">
                        <span className="section-label">local visado</span>
                        <select
                          value={hitLocation}
                          onChange={(event) => setHitLocation(event.target.value as CombatHitLocationId)}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                        >
                          {hitLocationOptions.map((location) => (
                            <option key={location.value} value={location.value}>
                              {location.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                ) : null}

                {(actionType === "quick-contest" || actionType === "regular-contest") ? (
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">rotulo da disputa</span>
                    <input
                      value={contestLabel}
                      onChange={(event) => setContestLabel(event.target.value)}
                      placeholder="ex.: agarrar, derrubar, controlar"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-white/20"
                    />
                  </label>
                ) : null}

                {isRangedManeuver(actionType) && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                    <label className="space-y-1.5 text-sm">
                      <span className="section-label">distancia (m)</span>
                      <input
                        value={rangeMeters}
                        onChange={(event) => setRangeMeters(event.target.value)}
                        placeholder="ex: 10"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="section-label">turnos mira</span>
                      <input
                        value={aimTurns}
                        onChange={(event) => setAimTurns(event.target.value)}
                        placeholder="ex: 2"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                      />
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">mod. acerto</span>
                    <input
                      value={manualToHit}
                      onChange={(event) => setManualToHit(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">mod. dano</span>
                    <input
                      value={manualDamage}
                      onChange={(event) => setManualDamage(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="section-label">defesa GM</span>
                    <select
                      value={selectedDefense}
                      onChange={(event) => setSelectedDefense(event.target.value as CombatDefenseOption)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                    >
                      <option value="none">nenhuma</option>
                      <option value="dodge">esquiva</option>
                      <option value="parry">aparar</option>
                      <option value="block">bloquear</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ToggleChip active={braced} onClick={() => setBraced((current) => !current)}>
                    apoiado
                  </ToggleChip>
                  <ToggleChip
                    active={determined}
                    onClick={() => setDetermined((current) => !current)}
                  >
                    determinado
                  </ToggleChip>
                  <ToggleChip active={retreat} onClick={() => setRetreat((current) => !current)}>
                    recuo
                  </ToggleChip>
                  <ToggleChip
                    active={acrobatic}
                    onClick={() => setAcrobatic((current) => !current)}
                  >
                    acrobatico
                  </ToggleChip>
                </div>

                {isAttackManeuver(actionType) ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="section-label mb-2">rolagem do ataque</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["normal", "advantage", "disadvantage"] as TacticalRollMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setRollMode(mode)}
                          className={cn(
                            "rounded-xl border px-2 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition",
                            rollMode === mode
                              ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                              : "border-white/10 bg-white/[0.03] text-[color:var(--ink-3)] hover:text-white"
                          )}
                        >
                          {mode === "normal" ? "Normal" : mode === "advantage" ? "Vant." : "Desv."}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => (actorProfile?.combat?.inspiration ?? 0) > 0 && setUseInspiration((current) => !current)}
                      disabled={(actorProfile?.combat?.inspiration ?? 0) <= 0}
                      className={cn(
                        "mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition",
                        useInspiration && (actorProfile?.combat?.inspiration ?? 0) > 0
                          ? "border-amber-300/45 bg-amber-300/12 text-amber-100"
                          : "border-white/10 bg-white/[0.03] text-[color:var(--ink-3)] hover:text-white disabled:opacity-40"
                      )}
                    >
                      <span>usar inspiracao</span>
                      <span>{actorProfile?.combat?.inspiration ?? 0} disp.</span>
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={!canExecute || isPending}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition",
                    canExecute && !isPending
                      ? "border-amber-300/24 bg-amber-300/10 text-amber-100 hover:border-amber-300/36"
                      : "cursor-not-allowed border-white/10 bg-white/[0.04] text-[color:var(--ink-3)]"
                  )}
                >
                  {isPending ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {isPending ? "processando..." : "girar e resolver"}
                </button>
              </div>
            </section>

            {pendingPrompt?.eventId ? (
              <section className={cn(
                "rounded-[20px] border p-3",
                pendingPrompt.payload.promptKind === "ht-check" ? "border-rose-400/18 bg-rose-400/8" : "border-sky-300/18 bg-sky-300/8"
              )}>
                <div className="flex items-center gap-2">
                  {pendingPrompt.payload.promptKind === "ht-check" ? (
                    <HeartPulse size={14} className="text-rose-400" />
                  ) : (
                    <Shield size={14} className="text-sky-100" />
                  )}
                  <p className={cn(
                    "section-label",
                    pendingPrompt.payload.promptKind === "ht-check" ? "text-rose-400" : "text-sky-100"
                  )}>
                        {pendingPrompt.payload.promptKind === "ht-check" ? "Teste de HT Pendente" : "Defesa pendente"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
                  {pendingPrompt.payload.summary}
                </p>
                {pendingPrompt.payload.promptKind === "defense" && pendingPrompt.payload.defenseLevels && (
                  <div className="mt-4 overflow-hidden rounded-[20px] bg-gradient-to-br from-amber-200/50 to-amber-500/50 p-[1px]">
                    <div className="flex items-center justify-between bg-[rgba(20,15,5,0.95)] px-5 py-4 rounded-[19px]">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-200/50">NH Efetivo</p>
                        <span className="text-3xl font-black text-amber-200 tracking-tighter">
                          NH {(() => {
                            const baseLevel = pendingPrompt.payload.defenseLevels[promptDefense] || 10;
                            let finalLevel = baseLevel;
                            if (promptRetreat) finalLevel += (promptDefense === "dodge" ? 3 : 1);
                            if (promptFeverish) finalLevel += 2;
                            return Math.min(16, Math.max(3, finalLevel));
                          })()}
                        </span>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-200/50">Probabilidade</p>
                        <span className="text-3xl font-black text-amber-200 tracking-tighter italic">
                          {(() => {
                            const baseLevel = pendingPrompt.payload.defenseLevels[promptDefense] || 10;
                            let finalLevel = baseLevel;
                            if (promptRetreat) finalLevel += (promptDefense === "dodge" ? 3 : 1);
                            if (promptFeverish) finalLevel += 2;
                            const nh = Math.min(16, Math.max(3, finalLevel));
                            const probMap: Record<number, string> = {
                              3: "0.5%", 4: "1.9%", 5: "4.6%", 6: "9.3%", 7: "16.2%", 8: "25.9%", 
                              9: "37.5%", 10: "50%", 11: "62.5%", 12: "74.1%", 13: "83.8%", 
                              14: "90.7%", 15: "95.4%", 16: "98.1%"
                            };
                            return probMap[nh] || (nh > 16 ? "98.1%" : "0.5%");
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 grid gap-4">
                  {pendingPrompt.payload.promptKind === "ht-check" ? (
                    <button
                      type="button"
                      onClick={handlePromptResolve}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/22 bg-rose-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-400/34"
                    >
                      <Sparkles size={14} />
                      rolar teste de HT
                    </button>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <label className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--ink-2)]">
                          Opção de Defesa
                          <select
                            value={promptDefense}
                            onChange={(event) => setPromptDefense(event.target.value as CombatDefenseOption)}
                            className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
                          >
                            {(pendingPrompt.payload.options ?? []).map((option) => (
                              <option key={option} value={option}>
                                {option.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                        
                        <div className="flex flex-wrap gap-2">
                          {pendingPrompt.payload.canRetreat ? (
                            <ToggleChip
                              active={promptRetreat}
                              onClick={() => setPromptRetreat((current) => !current)}
                            >
                              recuo (+3)
                            </ToggleChip>
                          ) : null}
                          {pendingPrompt.payload.canAcrobatic ? (
                            <ToggleChip
                              active={promptAcrobatic}
                              onClick={() => setPromptAcrobatic((current) => !current)}
                            >
                              acrobatica (+2)
                            </ToggleChip>
                          ) : null}
                          <ToggleChip
                            active={promptFeverish}
                            onClick={() => setPromptFeverish((current) => !current)}
                          >
                            febril (+2)
                          </ToggleChip>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePromptResolve}
                        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sky-500/10 border border-sky-400/20 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100 transition hover:bg-sky-500/20"
                      >
                        <Shield size={14} />
                        Resolver como Mestre
                      </button>
                    </>
                  )}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

      </div>
    </div>
  );
}
