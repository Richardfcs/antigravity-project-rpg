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
  SessionCombatFlow
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
  onToggleStatus?: (tokenId: string, status: TokenStatusPreset) => void;
  selectedTokenId?: string | null;
  isPending?: boolean;
  pendingKey?: string | null;
}

const actionMeta: Array<{
  id: CombatActionType;
  label: string;
  requiresTarget: boolean;
  description?: string;
}> = [
  { id: "move", label: "mover", requiresTarget: false },
  { id: "attack", label: "ataque", requiresTarget: true },
  { id: "ranged-attack", label: "distancia", requiresTarget: true },
  { id: "all-out-attack", label: "ataque total", requiresTarget: true },
  { id: "feint", label: "finta", requiresTarget: true },
  { id: "feint-beat", label: "finta (batida)", requiresTarget: true },
  { id: "feint-mental", label: "finta (mental)", requiresTarget: true },
  { id: "aim", label: "mirar", requiresTarget: true },
  { id: "evaluate", label: "avaliar", requiresTarget: true },
  { id: "all-out-defense", label: "defesa total", requiresTarget: false },
  { id: "ready", label: "preparar", requiresTarget: false },
  { id: "concentrate", label: "concentrar", requiresTarget: false },
  { id: "wait", label: "esperar", requiresTarget: false },
  { id: "quick-contest", label: "disputa rapida", requiresTarget: true },
  { id: "regular-contest", label: "disputa regular", requiresTarget: true },
  { id: "do-nothing", label: "fazer nada", requiresTarget: false },
  { id: "swap-technique", label: "trocar tecnica", requiresTarget: false }
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
          ? "border-amber-300/24 bg-amber-300/12 text-amber-100"
          : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

const isAttackManeuver = (type: CombatActionType) =>
  type === "attack" || type === "ranged-attack" || type === "all-out-attack";

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
  selectedTokenId,
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
      hitLocation,
      modifiers: {
        manualToHit: readNumber(manualToHit),
        manualDamage: readNumber(manualDamage),
        hitLocation,
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
      roundsNeeded: actionType === "regular-contest" ? roundsNeeded : undefined
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
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-white/10 bg-[rgba(5,10,18,0.96)] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-chip border-rose-300/20 bg-rose-300/10 text-rose-100">
              <Swords size={14} />
              combate
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {combatState.totalTurns} combatentes
            </span>
            {combatState.enabled ? (
              <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                rodada {combatState.round}
              </span>
            ) : null}
            {combatFlow?.phase ? (
              <span className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)]">
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
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {actionMeta.map((entry) => (
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

                    <label className="space-y-1.5 text-sm">
                      <span className="section-label">nova tecnica</span>
                      <select
                        value={techniqueId ?? ""}
                        onChange={(event) => setTechniqueId(event.target.value || null)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                      >
                        <option value="">escolha</option>
                        {allTechniques.map((technique) => (
                          <option key={technique.id} value={technique.id}>
                            {technique.name}
                          </option>
                        ))}
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
                        {loadedTechniques.map((technique) => (
                          <option key={technique.id} value={technique.id}>
                            {technique.name}
                          </option>
                        ))}
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
                
                <div className="mt-3 grid gap-3">
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
                      <label className="space-y-1.5 text-sm">
                        <span className="section-label">assumir defesa</span>
                        <select
                          value={promptDefense}
                          onChange={(event) => setPromptDefense(event.target.value as CombatDefenseOption)}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                        >
                          {(pendingPrompt.payload.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
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
                            recuo
                          </ToggleChip>
                        ) : null}
                        {pendingPrompt.payload.canAcrobatic ? (
                          <ToggleChip
                            active={promptAcrobatic}
                            onClick={() => setPromptAcrobatic((current) => !current)}
                          >
                            acrobatica
                          </ToggleChip>
                        ) : null}
                        <ToggleChip
                          active={promptFeverish}
                          onClick={() => setPromptFeverish((current) => !current)}
                        >
                          febril (-1 PF)
                        </ToggleChip>
                      </div>
                      <button
                        type="button"
                        onClick={handlePromptResolve}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-300/22 bg-sky-300/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100 transition hover:border-sky-300/34"
                      >
                        resolver pelo mestre
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
