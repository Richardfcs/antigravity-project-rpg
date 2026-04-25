"use client";

import { useMemo, useState } from "react";
import type {
  TacticalCombatStateView,
  TacticalStageToken
} from "@/lib/maps/selectors";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
  AttackVariant,
  CharacterWeaponMode,
  CharacterWeaponRecord,
  CombatActionType,
  CombatDraftAction,
  CombatHitLocationId,
  FeintType,
  SessionCombatFlow
} from "@/types/combat";
import { HealthBar } from "./health-bar";
import { ManeuverCard } from "./maneuver-card";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  X,
  Zap,
  Target
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
  { id: "attack", label: "Ataque", desc: "Ataque corpo a corpo padrão.", requiresTarget: true },
  { id: "ranged-attack", label: "Ataque Dist.", desc: "Ataque com alcance e mira.", requiresTarget: true },
  { id: "all-out-attack", label: "Ataque Total", desc: "Ofensiva agressiva, sem defesa.", requiresTarget: true },
  { id: "feint", label: "Finta", desc: "Disputa DX contra defesa.", requiresTarget: true },
  { id: "all-out-defense", label: "Defesa Total", desc: "Prioriza sobrevivência.", requiresTarget: false },
  { id: "aim", label: "Mirar", desc: "Acumula Acc e bônus.", requiresTarget: true },
  { id: "ready", label: "Preparar", desc: "Sacar ou ajustar equipamentos.", requiresTarget: false },
  { id: "evaluate", label: "Avaliar", desc: "Estuda o alvo (+1).", requiresTarget: true },
  { id: "wait", label: "Esperar", desc: "Age quando gatilho ocorrer.", requiresTarget: false },
  { id: "do-nothing", label: "Fazer Nada", desc: "Recuperar de atordoamento.", requiresTarget: false }
];

function getFeintAttribute(actionType: CombatActionType): FeintType | undefined {
  if (actionType === "feint-beat") return "st";
  if (actionType === "feint-mental") return "iq";
  if (actionType === "feint") return "dx";
  return undefined;
}

const hitLocationOptions: Array<{ value: CombatHitLocationId; label: string; penalty: number }> = [
  { value: "torso", label: "Torso", penalty: 0 },
  { value: "skull", label: "Crânio", penalty: -7 },
  { value: "eye", label: "Olho", penalty: -9 },
  { value: "face", label: "Rosto", penalty: -5 },
  { value: "neck", label: "Pescoço", penalty: -5 },
  { value: "vitals", label: "Vitais", penalty: -3 },
  { value: "arm", label: "Braço", penalty: -2 },
  { value: "hand", label: "Mão", penalty: -4 },
  { value: "leg", label: "Perna", penalty: -2 },
  { value: "foot", label: "Pé", penalty: -4 }
];

export function PlayerTurnOverlay({
  token,
  combatState,
  combatFlow,
  onExecute,
  onClose
}: PlayerTurnOverlayProps) {
  const [currentStep, setCurrentStep] = useState<"maneuver" | "target" | "details">("maneuver");
  const [selectedManeuver, setSelectedManeuver] = useState<CombatActionType>("attack");
  const [targetTokenId, setTargetTokenId] = useState<string | null>(null);
  const [weaponId, setWeaponId] = useState<string | null>(null);
  const [weaponModeId, setWeaponModeId] = useState<string | null>(null);
  const [hitLocation, setHitLocation] = useState<CombatHitLocationId>("torso");
  const [allOutVariant, setAllOutVariant] = useState<AllOutAttackVariant>("determined");
  const [allOutDefenseVariant, setAllOutDefenseVariant] = useState<AllOutDefenseVariant>("increased");
  const [feintType, setFeintType] = useState<FeintType>("dx");
  const [attackVariant, setAttackVariant] = useState<AttackVariant>("standard");
  const [deceptiveLevel, setDeceptiveLevel] = useState<number>(0);
  const [rapidStrike, setRapidStrike] = useState<boolean>(false);
  const [dualWeapon, setDualWeapon] = useState<boolean>(false);
  const [techniqueId, setTechniqueId] = useState<string | null>(null);
  const [manualToHit, setManualToHit] = useState<number>(0);
  const [manualDamage, setManualDamage] = useState<number>(0);
  const [rangeMeters, setRangeMeters] = useState<number | null>(null);
  const [sizeModifier, setSizeModifier] = useState<number>(0);
  const [aimTurns, setAimTurns] = useState<number>(0);

  const profile = token.character?.sheetProfile;
  const hp = profile?.combat?.currentHp ?? 10;
  const hpMax = profile?.attributes?.hpMax ?? 10;
  const fp = profile?.combat?.currentFp ?? 10;
  const fpMax = profile?.attributes?.fpMax ?? 10;
  const activeState = combatFlow?.combatantStates[token.token.id] ?? null;

  const weapons = profile?.weapons ?? [];
  const selectedWeapon = weapons.find((w: CharacterWeaponRecord) => w.id === weaponId) || weapons[0] || null;
  const weaponModes = selectedWeapon?.modes ?? [];
  const selectedMode = weaponModes.find((m: CharacterWeaponMode) => m.id === weaponModeId) || weaponModes[0] || null;

  const selectedMeta = useMemo(
    () => maneuvers.find((maneuver) => maneuver.id === selectedManeuver) ?? maneuvers[1],
    [selectedManeuver]
  );
  
  const availableTargets = combatState.turnOrder.filter(
    (entry) => entry.token.id !== token.token.id
  );

  const isAttackManeuver = selectedManeuver === "attack" || selectedManeuver === "ranged-attack" || selectedManeuver === "all-out-attack";
  const needsDetails = isAttackManeuver || selectedManeuver === "feint" || selectedManeuver === "all-out-defense";

  const handleNext = () => {
    if (currentStep === "maneuver") {
      if (selectedMeta.requiresTarget) setCurrentStep("target");
      else if (needsDetails) setCurrentStep("details");
      else handleConfirm();
    } else if (currentStep === "target") {
      if (needsDetails) setCurrentStep("details");
      else handleConfirm();
    } else {
      handleConfirm();
    }
  };

  const handleBack = () => {
    if (currentStep === "target") setCurrentStep("maneuver");
    else if (currentStep === "details") {
      if (selectedMeta.requiresTarget) setCurrentStep("target");
      else setCurrentStep("maneuver");
    }
  };

  const handleConfirm = () => {
    onExecute({
      actorTokenId: token.token.id,
      targetTokenId,
      actionType: selectedManeuver,
      weaponId: isAttackManeuver ? (weaponId || selectedWeapon?.id || null) : null,
      weaponModeId: isAttackManeuver ? (weaponModeId || selectedMode?.id || null) : null,
      hitLocation: isAttackManeuver ? hitLocation : "torso",
      allOutVariant: selectedManeuver === "all-out-attack" ? allOutVariant : undefined,
      allOutDefenseVariant: selectedManeuver === "all-out-defense" ? allOutDefenseVariant : undefined,
      attackVariant: selectedManeuver === "attack" ? attackVariant : undefined,
      deceptiveLevel: selectedManeuver === "attack" ? deceptiveLevel : 0,
      rapidStrike: selectedManeuver === "attack" ? rapidStrike : false,
      dualWeapon: selectedManeuver === "attack" ? dualWeapon : false,
      techniqueId,
      modifiers: {
        manualToHit,
        manualDamage,
        hitLocation: isAttackManeuver ? hitLocation : "torso",
        rangeMeters,
        sizeModifier,
        aimTurns
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 combat-overlay-backdrop sm:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0b] shadow-2xl combat-alert">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-white/5 bg-gradient-to-r from-amber-500/8 to-transparent p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400">
              <Swords size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Sua Vez</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70">
                {token.label} · Rodada {combatState.round}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <HealthBar label="HP" current={hp} max={hpMax} />
            <HealthBar label="FP" current={fp} max={fpMax} variant="fp" />
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Main Area */}
          <div className="flex-[3] p-8 overflow-y-auto border-r border-white/5 scrollbar-none">
            {currentStep === "maneuver" && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                  <Zap size={12} /> Selecione sua manobra
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {maneuvers.map((m) => (
                    <ManeuverCard
                      key={m.id}
                      type={m.id}
                      label={m.label}
                      description={m.desc}
                      selected={selectedManeuver === m.id}
                      onClick={() => setSelectedManeuver(m.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentStep === "target" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                  <Crosshair size={12} /> Selecione o alvo
                </h3>
                <div className="grid gap-2">
                  {availableTargets.map((t) => (
                    <button
                      key={t.token.id}
                      onClick={() => setTargetTokenId(t.token.id)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        targetTokenId === t.token.id
                          ? "border-amber-500/50 bg-amber-500/10 text-white"
                          : "border-white/5 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      <span className="font-bold">{t.label}</span>
                      {targetTokenId === t.token.id && <ChevronRight size={20} className="text-amber-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === "details" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                {/* Armas */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Swords size={12} /> Equipamento
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {weapons.length > 0 ? weapons.map((w: CharacterWeaponRecord) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => { setWeaponId(w.id); setWeaponModeId(w.modes[0]?.id || null); }}
                        className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          weaponId === w.id ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                        }`}
                      >
                        <div>
                          <p className="font-bold">{w.name}</p>
                          <p className="text-[10px] uppercase opacity-40">{w.state}</p>
                        </div>
                        {weaponId === w.id && <Sparkles size={16} className="text-amber-400" />}
                      </button>
                    )) : (
                      <div className="col-span-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white/20 text-center text-xs font-bold uppercase">
                        Sem armas equipadas
                      </div>
                    )}
                  </div>
                </div>

                {/* Modos */}
                {selectedWeapon && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Zap size={12} /> Modo de Ataque
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedWeapon.modes.map((m: CharacterWeaponMode) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setWeaponModeId(m.id)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            weaponModeId === m.id ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                          }`}
                        >
                          <p className="font-bold text-sm uppercase">{m.label}</p>
                          <p className="text-[10px] opacity-40">{m.damage.raw} {m.damage.damageType}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Técnicas */}
                {selectedWeapon && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Swords size={12} /> Técnicas Disponíveis
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTechniqueId(null)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          techniqueId === null ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                        }`}
                      >
                        <p className="font-bold text-xs uppercase">Ataque Padrão</p>
                        <p className="text-[10px] opacity-40 leading-tight mt-1">Usa perícia base</p>
                      </button>
                      {(token.character?.sheetProfile?.techniques || [])
                        .filter((t: any) => !weaponModeId || t.skill === (selectedWeapon.modes.find((m: any) => m.id === weaponModeId)?.skill))
                        .map((t: any) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTechniqueId(t.id)}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              techniqueId === t.id ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                            }`}
                          >
                            <p className="font-bold text-xs uppercase">{t.name}</p>
                            <p className="text-[10px] opacity-40 leading-tight mt-1">Nível {t.level}</p>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Variantes de Ataque (Ofensivo/Defensivo/Enganoso) */}
                {selectedManeuver === "attack" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Crosshair size={12} /> Opções de Ataque
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(["standard", "committed", "defensive", "deceptive"] as AttackVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAttackVariant(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            attackVariant === v ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                          }`}
                        >
                          <p className="font-bold text-xs uppercase">{
                            v === "standard" ? "Padrão" :
                            v === "committed" ? "Ofensivo" :
                            v === "defensive" ? "Defensivo" : "Enganoso"
                          }</p>
                          <p className="text-[10px] opacity-40 leading-tight mt-1">{
                            v === "standard" ? "Normal" :
                            v === "committed" ? "+2 Acerto, -2 Defesa" :
                            v === "defensive" ? "-2 Dano, +1 Aparar" : "Troca Acerto por Defesa"
                          }</p>
                        </button>
                      ))}
                    </div>
                    
                    {attackVariant === "deceptive" && (
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase text-amber-500/50 tracking-widest">Nível Enganoso</label>
                          <span className="text-amber-400 font-bold">-{deceptiveLevel} Defesa Inimiga</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="1"
                          value={deceptiveLevel}
                          onChange={(e) => setDeceptiveLevel(parseInt(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <p className="text-[10px] text-white/30 text-center italic">Aplica -{deceptiveLevel * 2} no seu acerto para dar -{deceptiveLevel} na defesa do alvo.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-Ataque */}
                {selectedManeuver === "attack" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Sparkles size={12} /> Multi-Ataque
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRapidStrike(!rapidStrike);
                          if (!rapidStrike) setDualWeapon(false);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          rapidStrike ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                        }`}
                      >
                        <p className="font-bold text-xs uppercase">Golpe Rápido</p>
                        <p className="text-[10px] opacity-40 leading-tight mt-1">-6 Acerto, 2 Ataques</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDualWeapon(!dualWeapon);
                          if (!dualWeapon) setRapidStrike(false);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          dualWeapon ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                        }`}
                      >
                        <p className="font-bold text-xs uppercase">Ataque Duplo</p>
                        <p className="text-[10px] opacity-40 leading-tight mt-1">-4 Acerto, 2 Armas</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Variantes de Ataque Total */}
                {selectedManeuver === "all-out-attack" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Zap size={12} /> Opção de Ataque Total
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(["determined", "strong", "double", "long"] as AllOutAttackVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAllOutVariant(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            allOutVariant === v ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                          }`}
                        >
                          <p className="font-bold text-xs uppercase">{
                            v === "determined" ? "Determinado" :
                            v === "strong" ? "Forte" :
                            v === "double" ? "Duplo" : "Longo"
                          }</p>
                          <p className="text-[10px] opacity-40 leading-tight mt-1">{
                            v === "determined" ? "+4 Acerto" :
                            v === "strong" ? "+2 Dano" :
                            v === "double" ? "2 Ataques" : "+1 Alcance"
                          }</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tipos de Finta */}
                {selectedManeuver === "feint" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <ShieldAlert size={12} /> Tipo de Finta
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["dx", "st", "iq"] as FeintType[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFeintType(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            feintType === v ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                          }`}
                        >
                          <p className="font-bold text-xs uppercase">{
                            v === "dx" ? "Técnica (DX)" :
                            v === "st" ? "Batida (ST)" : "Mental (IQ)"
                          }</p>
                          <p className="text-[10px] opacity-40 leading-tight mt-1">{
                            v === "dx" ? "Usa Perícia da Arma" :
                            v === "st" ? "Força Bruta" : "Finta Intelectual"
                          }</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variantes de Defesa Total */}
                {selectedManeuver === "all-out-defense" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      <Shield size={12} /> Opção de Defesa Total
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["increased", "double"] as AllOutDefenseVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAllOutDefenseVariant(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            allOutDefenseVariant === v ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/30"
                          }`}
                        >
                          <p className="font-bold text-xs uppercase">{
                            v === "increased" ? "Defesa Aumentada" : "Defesa Dupla"
                          }</p>
                          <p className="text-[10px] opacity-40 leading-tight mt-1">{
                            v === "increased" ? "+2 em uma esquiva/aparar/bloqueio" : "Pode tentar 2 defesas"
                          }</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Localização */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Target size={12} /> Onde atacar?
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {hitLocationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setHitLocation(opt.value)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          hitLocation === opt.value ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/5 bg-white/5 text-white/20"
                        }`}
                      >
                        <p className="text-[11px] font-bold uppercase">{opt.label}</p>
                        <p className={`text-[10px] ${opt.penalty === 0 ? 'text-green-500/50' : 'text-red-500/50'}`}>
                          {opt.penalty === 0 ? 'Normal' : opt.penalty}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modificadores Táticos */}
                <div className="space-y-6 pt-6 border-t border-white/5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Sparkles size={12} /> Modificadores Táticos
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {/* Modificador Acerto */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/20">Mod. Acerto</label>
                      <input 
                        type="number" 
                        value={manualToHit} 
                        onChange={(e) => setManualToHit(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500/50 outline-none transition-all"
                      />
                    </div>

                    {/* Modificador Dano */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/20">Mod. Dano</label>
                      <input 
                        type="number" 
                        value={manualDamage} 
                        onChange={(e) => setManualDamage(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500/50 outline-none transition-all"
                      />
                    </div>

                    {/* Distância */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/20">Distância (m)</label>
                      <input 
                        type="number" 
                        value={rangeMeters || ''} 
                        onChange={(e) => setRangeMeters(parseInt(e.target.value) || null)}
                        placeholder="N/A"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500/50 outline-none transition-all"
                      />
                    </div>

                    {/* Tamanho (SM) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/20">Tamanho (SM)</label>
                      <input 
                        type="number" 
                        value={sizeModifier} 
                        onChange={(e) => setSizeModifier(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500/50 outline-none transition-all"
                      />
                    </div>

                    {/* Mira (Aim) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/20">Turnos Mira</label>
                      <select 
                        value={aimTurns} 
                        onChange={(e) => setAimTurns(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-amber-500/50 outline-none transition-all appearance-none"
                      >
                        <option value={0}>0 Turnos</option>
                        <option value={1}>1 Turno</option>
                        <option value={2}>2 Turnos</option>
                        <option value={3}>3+ Turnos</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div className="flex-[2] p-8 bg-white/[0.01] flex flex-col">
            <div className="flex-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Resumo</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-black uppercase text-white/30 mb-1">Manobra</p>
                  <p className="font-bold text-amber-400">{selectedMeta.label}</p>
                </div>
                {targetTokenId && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black uppercase text-white/30 mb-1">Alvo</p>
                    <p className="font-bold text-white">{availableTargets.find(t => t.token.id === targetTokenId)?.label}</p>
                  </div>
                )}
                {isAttackManeuver && currentStep === "details" && (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] font-black uppercase text-amber-500/30 mb-1">Configuração</p>
                    <p className="text-sm text-white/80">
                      Usa <span className="text-amber-400 font-bold">{selectedWeapon?.name || 'arma'}</span> em modo 
                      <span className="text-amber-400 font-bold"> {selectedMode?.label || 'padrão'}</span> visando 
                      <span className="text-amber-400 font-bold"> {hitLocation}</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                {currentStep !== "maneuver" && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-5 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={currentStep === "target" && !targetTokenId}
                  className="flex-[2] py-5 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm shadow-[0_8px_32px_rgba(245,158,11,0.25)] hover:bg-amber-400 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  {currentStep === "details" || (!selectedMeta.requiresTarget && !isAttackManeuver) ? "Girar e Resolver" : "Próximo"}
                </button>
              </div>
              <p className="text-center text-[10px] font-black uppercase text-white/20 tracking-widest">
                Passo {currentStep === "maneuver" ? '1' : currentStep === "target" ? '2' : '3'} de 3
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
