"use client";

import { useMemo, useState } from "react";
import type {
  TacticalCombatStateView,
  TacticalStageToken
} from "@/lib/maps/selectors";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
  CombatActionType,
  CombatDraftAction,
  FeintType,
  SessionCombatFlow
} from "@/types/combat";
import { HealthBar } from "./health-bar";
import { ManeuverCard } from "./maneuver-card";
import {
  Ban,
  ChevronRight,
  Crosshair,
  Shield,
  Sparkles,
  Swords,
  X,
  Zap
} from "lucide-react";
import "@/styles/combat-animations.css";

interface PlayerTurnOverlayProps {
  token: TacticalStageToken;
  combatState: TacticalCombatStateView;
  combatFlow: SessionCombatFlow | null;
  onExecute: (action: CombatDraftAction) => void;
  onClose: () => void;
}

const maneuvers: Array<{
  id: CombatActionType;
  label: string;
  desc: string;
  requiresTarget: boolean;
}> = [
  { id: "move", label: "Mover", desc: "Movimento total sem ataque.", requiresTarget: false },
  { id: "attack", label: "Ataque", desc: "Ataque corpo a corpo padrao.", requiresTarget: true },
  { id: "ranged-attack", label: "Ataque Dist.", desc: "Ataque com alcance, mira e distancia.", requiresTarget: true },
  { id: "all-out-attack", label: "Ataque Total", desc: "Ofensiva agressiva, sem defesa.", requiresTarget: true },
  { id: "feint", label: "Finta", desc: "Disputa DX/pericia contra a defesa.", requiresTarget: true },
  { id: "feint-beat", label: "Batida", desc: "Finta por ST contra guarda.", requiresTarget: true },
  { id: "feint-mental", label: "Finta Mental", desc: "Disputa de IQ contra o alvo.", requiresTarget: true },
  { id: "all-out-defense", label: "Defesa Total", desc: "Prioriza sobrevivencia neste turno.", requiresTarget: false },
  { id: "aim", label: "Mirar", desc: "Acumula Acc e bonus de mira.", requiresTarget: true },
  { id: "ready", label: "Preparar", desc: "Sacar, trocar ou ajustar equipamento.", requiresTarget: false },
  { id: "concentrate", label: "Concentrar", desc: "Mantem foco mental ou poder.", requiresTarget: false },
  { id: "wait", label: "Esperar", desc: "Age quando o gatilho ocorrer.", requiresTarget: false },
  { id: "evaluate", label: "Avaliar", desc: "Estuda o alvo e acumula bonus.", requiresTarget: true },
  { id: "swap-technique", label: "Trocar Tecnica", desc: "Troca uma tecnica e consome o turno.", requiresTarget: false },
  { id: "quick-contest", label: "Disputa Rapida", desc: "Uma rolagem oposta por margem.", requiresTarget: true },
  { id: "regular-contest", label: "Disputa Regular", desc: "Acumula vitorias ate o limite.", requiresTarget: true },
  { id: "do-nothing", label: "Fazer Nada", desc: "Recuperar de atordoamento.", requiresTarget: false }
];

function getFeintAttribute(actionType: CombatActionType): FeintType | undefined {
  if (actionType === "feint-beat") return "st";
  if (actionType === "feint-mental") return "iq";
  if (actionType === "feint") return "dx";
  return undefined;
}

export function PlayerTurnOverlay({
  token,
  combatState,
  combatFlow,
  onExecute,
  onClose
}: PlayerTurnOverlayProps) {
  const [selectedManeuver, setSelectedManeuver] = useState<CombatActionType>("attack");
  const [targetTokenId, setTargetTokenId] = useState<string | null>(null);
  const [allOutVariant, setAllOutVariant] = useState<AllOutAttackVariant>("determined");
  const [allOutDefenseVariant, setAllOutDefenseVariant] =
    useState<AllOutDefenseVariant>("increased");

  const profile = token.character?.sheetProfile;
  const hp = profile?.combat?.currentHp ?? 10;
  const hpMax = profile?.attributes?.hpMax ?? 10;
  const fp = profile?.combat?.currentFp ?? 10;
  const fpMax = profile?.attributes?.fpMax ?? 10;
  const activeState = combatFlow?.combatantStates[token.token.id] ?? null;

  const selectedMeta = useMemo(
    () => maneuvers.find((maneuver) => maneuver.id === selectedManeuver) ?? maneuvers[1],
    [selectedManeuver]
  );
  const availableTargets = combatState.turnOrder.filter(
    (entry) => entry.token.id !== token.token.id
  );
  const executeDisabled = selectedMeta.requiresTarget && !targetTokenId;

  const handleConfirm = () => {
    if (executeDisabled) {
      return;
    }

    onExecute({
      actorTokenId: token.token.id,
      targetTokenId,
      actionType: selectedManeuver,
      weaponId: profile?.combat?.activeWeaponId ?? null,
      weaponModeId: profile?.combat?.activeWeaponModeId ?? null,
      techniqueId: null,
      hitLocation: "torso",
      allOutVariant:
        selectedManeuver === "all-out-attack"
          ? allOutVariant
          : selectedManeuver === "all-out-defense"
            ? allOutDefenseVariant
            : undefined,
      feintAttribute: getFeintAttribute(selectedManeuver),
      waitTrigger: selectedManeuver === "wait" ? "gatilho narrativo do jogador" : undefined,
      roundsNeeded: selectedManeuver === "regular-contest" ? 2 : undefined,
      modifiers: {
        manual: 0,
        hitLocation: "torso"
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 combat-overlay-backdrop sm:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0b] shadow-2xl combat-alert">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-white/5 bg-gradient-to-r from-amber-500/8 to-transparent p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Swords size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                E sua vez
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-400/70">
                {token.label} - rodada {combatState.round}
              </p>
              {activeState?.lastManeuver ? (
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                  ultima manobra: {activeState.lastManeuver}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="w-44">
              <HealthBar label="Pontos de Vida" current={hp} max={hpMax} />
            </div>
            <div className="w-44">
              <HealthBar label="Fadiga" current={fp} max={fpMax} variant="fp" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Fechar overlay de turno"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 flex-[3] overflow-y-auto border-r border-white/5 p-6 scrollbar-none sm:p-8">
            <h3 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              <Zap size={12} /> escolha sua manobra
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {maneuvers.map((maneuver) => (
                <ManeuverCard
                  key={maneuver.id}
                  type={maneuver.id}
                  label={maneuver.label}
                  description={maneuver.desc}
                  selected={selectedManeuver === maneuver.id}
                  badges={[
                    maneuver.requiresTarget ? "alvo" : "sem alvo",
                    maneuver.id === "all-out-attack" ? "sem defesa" : null,
                    maneuver.id === "swap-technique" ? "turno inteiro" : null
                  ].filter(Boolean) as string[]}
                  onClick={() => {
                    setSelectedManeuver(maneuver.id);
                    if (!maneuver.requiresTarget) {
                      setTargetTokenId(null);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-[2] flex-col bg-white/[0.01] p-6 sm:p-8">
            <div className="flex-1 space-y-7 overflow-y-auto pr-1 scrollbar-none">
              {selectedMeta.requiresTarget ? (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                    <Crosshair size={12} /> selecione o alvo
                  </h3>
                  <div className="grid gap-2">
                    {availableTargets.map((entry) => (
                      <button
                        key={entry.token.id}
                        type="button"
                        onClick={() => setTargetTokenId(entry.token.id)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                          targetTokenId === entry.token.id
                            ? "border-amber-500/50 bg-amber-500/10 text-white"
                            : "border-white/5 bg-white/5 text-white/45 hover:border-white/20"
                        }`}
                      >
                        <span className="text-sm font-bold">{entry.label}</span>
                        {targetTokenId === entry.token.id ? (
                          <ChevronRight size={16} className="text-amber-400" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedManeuver === "all-out-attack" ? (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                    <Zap size={12} /> opcao de ataque total
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "determined", label: "Determinado", desc: "+4 no acerto" },
                      { id: "strong", label: "Forte", desc: "+2 no dano" },
                      { id: "double", label: "Duplo", desc: "dois ataques" },
                      { id: "long", label: "Longo", desc: "+1 alcance" }
                    ].map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setAllOutVariant(variant.id as AllOutAttackVariant)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          allOutVariant === variant.id
                            ? "border-amber-500/50 bg-amber-500/10 text-white"
                            : "border-white/5 bg-white/5 text-white/45 hover:border-white/10"
                        }`}
                      >
                        <p className="text-xs font-bold">{variant.label}</p>
                        <p className="text-[9px] font-black uppercase opacity-60">
                          {variant.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedManeuver === "all-out-defense" ? (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                    <Shield size={12} /> opcao de defesa total
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "increased", label: "Aumentada", desc: "+2 defesa" },
                      { id: "double", label: "Dupla", desc: "duas defesas" }
                    ].map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() =>
                          setAllOutDefenseVariant(variant.id as AllOutDefenseVariant)
                        }
                        className={`rounded-xl border p-3 text-left transition-all ${
                          allOutDefenseVariant === variant.id
                            ? "border-sky-400/50 bg-sky-400/10 text-white"
                            : "border-white/5 bg-white/5 text-white/45 hover:border-white/10"
                        }`}
                      >
                        <p className="text-xs font-bold">{variant.label}</p>
                        <p className="text-[9px] font-black uppercase opacity-60">
                          {variant.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedManeuver === "swap-technique" ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-red-300">
                  <Ban size={14} />
                  custa o turno inteiro
                </div>
              ) : null}
            </div>

            <div className="mt-auto pt-7">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={executeDisabled}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-sm font-black uppercase tracking-[0.2em] transition-all ${
                  executeDisabled
                    ? "cursor-not-allowed bg-white/5 text-white/20"
                    : "bg-amber-500 text-black shadow-[0_8px_32px_rgba(245,158,11,0.25)] hover:scale-[1.02] hover:bg-amber-400 active:scale-[0.98]"
                }`}
              >
                <Sparkles size={18} />
                executar manobra
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45 transition hover:border-white/20 hover:text-white"
              >
                pedir ajuda ao mestre
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
