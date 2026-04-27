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
  SessionCombatFlow,
  SessionCharacterSheetProfile
} from "@/types/combat";
import { formatDamageSpec } from "@/lib/combat/sheet-profile";
import { cn } from "@/lib/utils";
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
import { getAvailableCombatActions, getAttackTarget } from "@/lib/combat/engine";

interface PlayerTurnOverlayProps {
  token: TacticalStageToken;
  combatState: TacticalCombatStateView;
  combatFlow: SessionCombatFlow | null;
  onExecute: (action: CombatDraftAction) => void;
  onClose: () => void;
}

const maneuverMeta: Record<CombatActionType, { label: string; desc: string; requiresTarget: boolean }> = {
  "move": { label: "Mover", desc: "Movimento total sem ataque.", requiresTarget: false },
  "attack": { label: "Ataque", desc: "Ataque corpo a corpo padrão.", requiresTarget: true },
  "ranged-attack": { label: "Ataque Dist.", desc: "Ataque com alcance e mira.", requiresTarget: true },
  "all-out-attack": { label: "Ataque Total", desc: "Ofensiva agressiva, sem defesa.", requiresTarget: true },
  "feint": { label: "Finta", desc: "Disputa DX contra defesa.", requiresTarget: true },
  "feint-beat": { label: "Batida", desc: "Usa ST para desviar a arma.", requiresTarget: true },
  "feint-mental": { label: "Truque", desc: "Psicologia para confundir.", requiresTarget: true },
  "all-out-defense": { label: "Defesa Total", desc: "Prioriza sobrevivência.", requiresTarget: false },
  "aim": { label: "Mirar", desc: "Acumula Acc e bônus.", requiresTarget: true },
  "ready": { label: "Preparar", desc: "Sacar ou ajustar equipamentos.", requiresTarget: false },
  "evaluate": { label: "Avaliar", desc: "Estuda o alvo (+1).", requiresTarget: true },
  "wait": { label: "Esperar", desc: "Age quando gatilho ocorrer.", requiresTarget: false },
  "do-nothing": { label: "Fazer Nada", desc: "Recuperar de atordoamento.", requiresTarget: false },
  "iai-strike": { label: "Iaijutsu", desc: "Sacar e cortar no mesmo movimento.", requiresTarget: true },
  "concentrate": { label: "Concentrar", desc: "Foco em magias ou habilidades.", requiresTarget: false },
  "swap-technique": { label: "Trocar Técnica", desc: "Alternar foco de combate.", requiresTarget: false },
  "quick-contest": { label: "Disputa Rápida", desc: "Confronto direto de atributos.", requiresTarget: true },
  "regular-contest": { label: "Disputa Regular", desc: "Confronto prolongado.", requiresTarget: true },
  "clash-simple": { label: "Clash Simples", desc: "Disputa de NH; vencedor acerta. (Custo: 1 PF)", requiresTarget: true },
};

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
  { value: "foot", label: "Pé", penalty: -4 },
  { value: "chink", label: "Fenda", penalty: -8 }
];

export function PlayerTurnOverlay({
  token,
  combatState,
  combatFlow,
  onExecute,
  onClose
}: PlayerTurnOverlayProps) {
  const profile = token.character?.sheetProfile;
  const hp = profile?.combat?.currentHp ?? 10;
  const hpMax = profile?.attributes?.hpMax ?? 10;
  const fp = profile?.combat?.currentFp ?? 10;
  const fpMax = profile?.attributes?.fpMax ?? 10;

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
  const [newLoadoutIds, setNewLoadoutIds] = useState<string[]>(token.character?.sheetProfile?.combat.loadoutTechniqueIds || []);
  const [swapType, setSwapType] = useState<"technique" | "style">("technique");
  const [swapNewId, setSwapNewId] = useState<string | null>(null);
  const [swapOldId, setSwapOldId] = useState<string | null>(null);
  const [manualToHit, setManualToHit] = useState<number>(0);
  const [manualDamage, setManualDamage] = useState<number>(0);
  const [rangeMeters, setRangeMeters] = useState<number | null>(null);
  const [sizeModifier, setSizeModifier] = useState<number>(0);
  const [aimTurns, setAimTurns] = useState<number>(0);

  const activeState = combatFlow?.combatantStates[token.token.id] ?? null;

  const weapons = profile?.weapons ?? [];
  const selectedWeapon = weapons.find((w: CharacterWeaponRecord) => w.id === weaponId) || weapons[0] || null;
  const weaponModes = selectedWeapon?.modes ?? [];
  const selectedMode = weaponModes.find((m: CharacterWeaponMode) => m.id === weaponModeId) || weaponModes[0] || null;

  const isAttackManeuver = selectedManeuver === "attack" || selectedManeuver === "ranged-attack" || selectedManeuver === "all-out-attack" || selectedManeuver === "iai-strike" || selectedManeuver === "clash-simple";

  const targetToken = useMemo(() => 
    combatState.turnOrder.find(t => t.token.id === targetTokenId),
    [combatState.turnOrder, targetTokenId]
  );

  const attackNH = useMemo(() => {
    if (!profile || !isAttackManeuver) return null;
    
    // Simular o draft action para o cálculo
    const draft: CombatDraftAction = {
      actorTokenId: token.token.id,
      targetTokenId,
      actionType: selectedManeuver,
      weaponId: weaponId || selectedWeapon?.id || null,
      weaponModeId: weaponModeId || selectedMode?.id || null,
      hitLocation,
      attackVariant,
      deceptiveLevel,
      rapidStrike,
      dualWeapon,
      modifiers: {
        manualToHit,
        manualDamage,
        rangeMeters,
        sizeModifier,
        aimTurns,
        hitLocation
      }
    };
    
    return getAttackTarget(profile, draft, selectedMode);
  }, [profile, selectedManeuver, targetTokenId, weaponId, selectedWeapon, weaponModeId, selectedMode, hitLocation, attackVariant, deceptiveLevel, rapidStrike, dualWeapon, manualToHit, manualDamage, rangeMeters, sizeModifier, aimTurns, isAttackManeuver]);

  const nhProbability = useMemo(() => {
    if (attackNH === null) return null;
    const nh = Math.min(16, Math.max(3, attackNH));
    // Tabela simplificada de 3d6
    const probMap: Record<number, string> = {
      3: "0.5%", 4: "1.9%", 5: "4.6%", 6: "9.3%", 7: "16.2%", 8: "25.9%", 
      9: "37.5%", 10: "50%", 11: "62.5%", 12: "74.1%", 13: "83.8%", 
      14: "90.7%", 15: "95.4%", 16: "98.1%"
    };
    return probMap[nh] || (nh > 16 ? "98.1%+" : "0.5%-");
  }, [attackNH]);

  const { maneuvers: availableManeuverIds, techniques: filteredTechniques, styleTechniques } = useMemo(() => {
    if (!token.character?.sheetProfile) return { maneuvers: [], techniques: [], styleTechniques: [] };
    return getAvailableCombatActions(token.character.sheetProfile, weaponId);
  }, [token.character?.sheetProfile, weaponId]);

  const availableManeuvers = useMemo(() => 
    availableManeuverIds.map((id: CombatActionType) => ({ id, ...maneuverMeta[id] })),
    [availableManeuverIds]
  );

  const selectedMeta = useMemo(
    () => maneuverMeta[selectedManeuver] || maneuverMeta["attack"],
    [selectedManeuver]
  );
  
  const availableTargets = combatState.turnOrder.filter(
    (entry) => entry.token.id !== token.token.id
  );

  const needsDetails = isAttackManeuver || selectedManeuver === "feint" || selectedManeuver === "all-out-defense" || selectedManeuver === "swap-technique";

  const handleNext = () => {
    if (currentStep === "maneuver") {
      if (selectedMeta.requiresTarget) setCurrentStep("target");
      else if (needsDetails || selectedManeuver === "wait") setCurrentStep("details");
      else handleConfirm();
    } else if (currentStep === "target") {
      // Pular detalhes para manobras que não precisam de configuração extra
      const skipDetails = selectedManeuver === "evaluate" || selectedManeuver === "aim" || selectedManeuver === "iai-strike";
      if (needsDetails && !skipDetails) setCurrentStep("details");
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
      techniqueId: selectedManeuver === "swap-technique" ? swapNewId : techniqueId,
      replaceTechniqueId: selectedManeuver === "swap-technique" ? swapOldId : undefined,
      isStyle: selectedManeuver === "swap-technique" ? swapType === "style" : undefined,
      loadoutTechniqueIds: undefined, // Removido pois agora usamos swap unitário
      waitTrigger: selectedManeuver === "wait" ? (techniqueId || "Ataque por Gatilho") : undefined,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--bg-deep)]/60 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[color:var(--bg-panel)] border border-[color:var(--border-panel)] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[color:var(--border-panel)] bg-gradient-to-r from-[color:var(--accent)]/8 to-transparent p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/20 text-[color:var(--accent)]">
              <Swords size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-[color:var(--ink-1)]">Sua Vez</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--accent)]/70">
                {token.label} · Rodada {combatState.round}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <HealthBar label="HP" current={hp} max={hpMax} />
            <HealthBar label="FP" current={fp} max={fpMax} variant="fp" />
            <button onClick={onClose} className="p-2 text-[color:var(--ink-1)]/30 hover:text-[color:var(--ink-1)] transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Main Area */}
          <div className="flex-[3] p-8 overflow-y-auto border-r border-[color:var(--border-panel)] scrollbar-none">
            {currentStep === "maneuver" && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                  <Zap size={12} /> Selecione sua manobra
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {availableManeuvers.map((m: any) => (
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
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                  <Crosshair size={12} /> Selecione o alvo
                </h3>
                <div className="grid gap-2">
                  {availableTargets.map((t) => (
                    <button
                      key={t.token.id}
                      onClick={() => setTargetTokenId(t.token.id)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        targetTokenId === t.token.id
                          ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]"
                          : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/40 hover:border-white/20"
                      }`}
                    >
                      <span className="font-bold">{t.label}</span>
                      {targetTokenId === t.token.id && <ChevronRight size={20} className="text-[color:var(--accent)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === "details" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                {/* Armas */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                    <Swords size={12} /> Equipamento
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {weapons.length > 0 ? weapons.map((w: CharacterWeaponRecord) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => { setWeaponId(w.id); setWeaponModeId(w.modes[0]?.id || null); }}
                        className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          weaponId === w.id ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
                        }`}
                      >
                        <div>
                          <p className="font-bold">{w.name}</p>
                          <p className="text-[10px] uppercase opacity-40">{w.state}</p>
                        </div>
                        {weaponId === w.id && <Sparkles size={16} className="text-[color:var(--accent)]" />}
                      </button>
                    )) : (
                      <div className="col-span-full p-4 rounded-2xl border border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/20 text-center text-xs font-bold uppercase">
                        Sem armas equipadas
                      </div>
                    )}
                  </div>
                </div>

                {/* Modos */}
                {selectedWeapon && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Zap size={12} /> Modo de Ataque
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedWeapon.modes.map((m: CharacterWeaponMode) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setWeaponModeId(m.id)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            weaponModeId === m.id ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
                          }`}
                        >
                          <p className="font-bold text-sm uppercase">{m.label}</p>
                          <p className="text-[10px] opacity-40">{formatDamageSpec(m.damage, profile?.attributes.st ?? 10)} {m.damage.damageType} ({m.damage.raw})</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedWeapon && isAttackManeuver && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Swords size={12} /> Técnicas Disponíveis (Slots de Memória Muscular)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTechniqueId(null)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          techniqueId === null ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
                        }`}
                      >
                        <p className="font-bold text-xs uppercase">Ataque Padrão</p>
                        <p className="text-[10px] opacity-40 leading-tight mt-1">Usa perícia base</p>
                      </button>
                      {filteredTechniques
                        .filter((t: any) => !weaponModeId || t.skill === (selectedWeapon.modes.find((m: any) => m.id === weaponModeId)?.skill))
                        .map((t: any) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTechniqueId(t.id)}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              techniqueId === t.id ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
                            }`}
                          >
                            <p className="font-bold text-xs uppercase">{t.name}</p>
                            <p className="text-[10px] opacity-40 leading-tight mt-1">Nível {t.level}</p>
                          </button>
                        ))}
                      {styleTechniques.map((techName: string) => (
                        <button
                          key={techName}
                          type="button"
                          onClick={() => setTechniqueId(techName)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            techniqueId === techName ? "border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-xs uppercase text-[color:var(--gold)]">{techName}</p>
                            <Zap size={10} className="text-[color:var(--gold)]/40" />
                          </div>
                          <p className="text-[10px] opacity-40 leading-tight mt-1">Técnica de Estilo</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variantes de Ataque (Ofensivo/Defensivo/Enganoso) */}
                {selectedManeuver === "attack" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Crosshair size={12} /> Opções de Ataque
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(["standard", "committed", "defensive", "deceptive"] as AttackVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAttackVariant(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            attackVariant === v ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
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
                      <div className="p-4 rounded-2xl bg-[color:var(--accent)]/5 border border-[color:var(--accent)]/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase text-[color:var(--accent)]/50 tracking-widest">Nível Enganoso</label>
                          <span className="text-[color:var(--accent)] font-bold">-{deceptiveLevel} Defesa Inimiga</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="1"
                          value={deceptiveLevel}
                          onChange={(e) => setDeceptiveLevel(parseInt(e.target.value))}
                          className="w-full accent-[color:var(--accent)]"
                        />
                        <p className="text-[10px] text-[color:var(--ink-1)]/30 text-center italic">Aplica -{deceptiveLevel * 2} no seu acerto para dar -{deceptiveLevel} na defesa do alvo.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-Ataque */}
                {selectedManeuver === "attack" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
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
                          rapidStrike ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
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
                          dualWeapon ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
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
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Zap size={12} /> Opção de Ataque Total
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(["determined", "strong", "double", "long"] as AllOutAttackVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAllOutVariant(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            allOutVariant === v ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
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
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <ShieldAlert size={12} /> Tipo de Finta
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["dx", "st", "iq"] as FeintType[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFeintType(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            feintType === v ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
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

                {/* Gestão de Memória Muscular (Maneuver: swap-technique) */}
                {selectedManeuver === "swap-technique" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                        <Sparkles size={12} /> Gestão de Memória Muscular
                      </h3>
                      <p className="text-[10px] font-bold text-[color:var(--accent)]/50 uppercase">Manobra de Concentração</p>
                    </div>

                    <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
                      {(["technique", "style"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setSwapType(type);
                            setSwapNewId(null);
                            setSwapOldId(null);
                          }}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition",
                            swapType === type ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/20" : "text-[color:var(--ink-1)]/30 hover:text-white"
                          )}
                        >
                          {type === "technique" ? "Manobra (M3)" : "Estilo (Budô)"}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--ink-1)]/40">Nova Tecnica</span>
                        <div className="grid gap-2">
                          {(swapType === "technique" ? (token.character?.sheetProfile?.techniques || []) : []).map((t: any) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSwapNewId(t.id)}
                              className={cn(
                                "p-3 rounded-xl border text-left transition-all text-xs uppercase font-bold",
                                swapNewId === t.id ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-white" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-1)]/30"
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                          {swapType === "style" && (
                            <p className="text-[10px] text-[color:var(--ink-1)]/30 italic">Use o painel tatico para ver tecnicas de estilo disponiveis (Catalogo).</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--ink-1)]/40">Substituir</span>
                        <div className="grid gap-2">
                          {(swapType === "technique" ? (token.character?.sheetProfile?.combat.loadoutTechniqueIds || []) : (token.character?.sheetProfile?.combat.loadoutStyleTechniqueIds || [])).map((id: string) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSwapOldId(id)}
                              className={cn(
                                "p-3 rounded-xl border text-left transition-all text-xs uppercase font-bold",
                                swapOldId === id ? "border-rose-500/50 bg-rose-500/10 text-white" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-1)]/30"
                              )}
                            >
                              {swapType === "technique" ? (token.character?.sheetProfile?.techniques.find((t: any) => t.id === id)?.name || id) : id}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                        <Zap size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Manobra de Concentração</p>
                        <p className="text-[9px] text-amber-500/60 leading-relaxed mt-1">
                          A troca de postura mental exige foco total. Seu turno será encerrado e você ficará <span className="font-black text-amber-500">SEM DEFESA</span> até o início do seu próximo turno. Qualquer dano recebido pode quebrar seu foco.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedManeuver === "all-out-defense" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Shield size={12} /> Opção de Defesa Total
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["increased", "double"] as AllOutDefenseVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAllOutDefenseVariant(v)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            allOutDefenseVariant === v ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/30"
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

                {/* Localização (Apenas se for ataque direto) */}
                {isAttackManeuver && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Target size={12} /> Onde atacar?
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {hitLocationOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setHitLocation(opt.value)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            hitLocation === opt.value ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--ink-1)]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] text-[color:var(--ink-1)]/20"
                          }`}
                        >
                          <p className="text-[11px] font-bold uppercase">{opt.label}</p>
                          <p className={`text-[10px] ${opt.penalty === 0 ? 'text-[color:var(--ink-1)]/50' : 'text-[color:var(--red-accent)]/50'}`}>
                            {opt.penalty === 0 ? 'Normal' : opt.penalty}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modificadores Táticos */}
                <div className="space-y-6 pt-6 border-t border-[color:var(--border-panel)]">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                    <Sparkles size={12} /> Modificadores Táticos
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {/* Modificador Acerto */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[color:var(--ink-1)]/20">Mod. Acerto</label>
                      <input 
                        type="number" 
                        value={manualToHit} 
                        onChange={(e) => setManualToHit(parseInt(e.target.value) || 0)}
                        className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-panel)] rounded-xl px-4 py-3 text-sm font-bold text-[color:var(--ink-1)] focus:border-[color:var(--accent)]/50 outline-none transition-all"
                      />
                    </div>

                    {/* Modificador Dano */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[color:var(--ink-1)]/20">Mod. Dano</label>
                      <input 
                        type="number" 
                        value={manualDamage} 
                        onChange={(e) => setManualDamage(parseInt(e.target.value) || 0)}
                        className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-panel)] rounded-xl px-4 py-3 text-sm font-bold text-[color:var(--ink-1)] focus:border-[color:var(--accent)]/50 outline-none transition-all"
                      />
                    </div>

                    {/* Distância */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[color:var(--ink-1)]/20">Distância (m)</label>
                      <input 
                        type="number" 
                        value={rangeMeters || ''} 
                        onChange={(e) => setRangeMeters(parseInt(e.target.value) || null)}
                        placeholder="N/A"
                        className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-panel)] rounded-xl px-4 py-3 text-sm font-bold text-[color:var(--ink-1)] focus:border-[color:var(--accent)]/50 outline-none transition-all"
                      />
                    </div>

                    {/* Tamanho (SM) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[color:var(--ink-1)]/20">Tamanho (SM)</label>
                      <input 
                        type="number" 
                        value={sizeModifier} 
                        onChange={(e) => setSizeModifier(parseInt(e.target.value) || 0)}
                        className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-panel)] rounded-xl px-4 py-3 text-sm font-bold text-[color:var(--ink-1)] focus:border-[color:var(--accent)]/50 outline-none transition-all"
                      />
                    </div>

                    {/* Mira (Aim) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[color:var(--ink-1)]/20">Turnos Mira</label>
                      <select 
                        value={aimTurns} 
                        onChange={(e) => setAimTurns(parseInt(e.target.value))}
                        className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-panel)] rounded-xl px-4 py-3 text-sm font-bold text-[color:var(--ink-1)] focus:border-[color:var(--accent)]/50 outline-none transition-all appearance-none"
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
                {selectedManeuver === "all-out-attack" && (
                  <div className="p-4 rounded-2xl bg-[color:var(--red-accent)]/10 border border-[color:var(--red-accent)]/50 flex items-center gap-3 mb-4">
                    <ShieldAlert size={20} className="text-[color:var(--red-accent)] animate-pulse" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-[color:var(--red-accent)] tracking-widest">Aviso Crítico</p>
                      <p className="text-xs text-red-200/80">Você **NÃO PODERÁ DEFENDER** até o seu próximo turno!</p>
                    </div>
                  </div>
                )}
                {selectedManeuver === "iai-strike" && (
                  <div className="p-4 rounded-2xl bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/20 flex items-center gap-3 mb-4">
                    <Sparkles size={20} className="text-[color:var(--accent)]" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-[color:var(--accent)] tracking-widest">Iaijutsu</p>
                      <p className="text-xs text-amber-200/80">O alvo sofre **-1 na Defesa Ativa** por surpresa.</p>
                    </div>
                  </div>
                )}
                {(selectedManeuver === "clash-simple") && (
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3 mb-4">
                    <Swords size={20} className="text-indigo-400" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Disputa de Clash</p>
                      <p className="text-xs text-indigo-200/80">
                        {selectedManeuver === "clash-simple" 
                          ? "Disputa rápida de NH. Quem vencer a margem acerta o golpe." 
                          : "Disputa em 5 etapas. Vencer etapas drena vida e o vencedor final dá um golpe em cheio."}
                      </p>
                    </div>
                  </div>
                )}
                {selectedManeuver === "wait" && (
                  <div className="space-y-4 mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/30 flex items-center gap-2">
                      <Zap size={12} /> Definir Gatilho (Trigger)
                    </h3>
                    <input 
                      type="text"
                      placeholder="Ex: 'Atacar se o inimigo se aproximar'"
                      value={techniqueId || ""}
                      onChange={(e) => setTechniqueId(e.target.value)}
                      className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-panel)] rounded-xl px-4 py-4 text-sm font-bold text-[color:var(--ink-1)] focus:border-[color:var(--accent)]/50 outline-none transition-all"
                    />
                  </div>
                )}

              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-1)]/20 mb-6">Resumo da Ação</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[color:var(--bg-input)] border border-[color:var(--border-panel)]">
                  <p className="text-[10px] font-black uppercase text-[color:var(--ink-1)]/30 mb-1">Manobra</p>
                  <p className="font-bold text-[color:var(--accent)]">{selectedMeta.label}</p>
                </div>
                {targetTokenId && (
                  <div className="p-4 rounded-2xl bg-[color:var(--bg-input)] border border-[color:var(--border-panel)]">
                    <p className="text-[10px] font-black uppercase text-[color:var(--ink-1)]/30 mb-1">Alvo</p>
                    <p className="font-bold text-[color:var(--ink-1)]">{availableTargets.find(t => t.token.id === targetTokenId)?.label}</p>
                  </div>
                )}
                {isAttackManeuver && currentStep === "details" && (
                  <div className="p-4 rounded-2xl bg-[color:var(--accent)]/5 border border-[color:var(--accent)]/10">
                    <p className="text-[10px] font-black uppercase text-[color:var(--accent)]/50 mb-1">Configuração de Ataque</p>
                    <p className="text-sm text-[color:var(--ink-1)]/80">
                      Usa <span className="text-[color:var(--accent)] font-bold">{selectedWeapon?.name || 'arma'}</span> visando 
                      <span className="text-[color:var(--accent)] font-bold"> {hitLocation}</span>.
                    </p>
                  </div>
                )}
              </div>

              {attackNH !== null && (
                <div className="mt-4 p-5 rounded-[24px] bg-[color:var(--accent)] border border-[color:var(--accent)]/30 flex items-center justify-between shadow-2xl shadow-[color:var(--accent)]/20 relative overflow-hidden">
                  {/* Detalhe estético: brilho interno */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase text-[#050505]/50 tracking-[0.2em] mb-1">Potencial de Acerto</p>
                    <p className="text-3xl font-black text-[#050505] tracking-tighter">NH {attackNH}</p>
                  </div>
                  <div className="relative z-10 text-right">
                    <p className="text-[9px] font-black uppercase text-[#050505]/50 tracking-[0.2em] mb-1">Probabilidade</p>
                    <p className="text-3xl font-black text-[#050505] tracking-tighter">{nhProbability}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                {currentStep !== "maneuver" && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-5 rounded-2xl border border-[color:var(--border-panel)] text-[color:var(--ink-1)]/40 font-black uppercase tracking-widest text-xs hover:bg-[color:var(--bg-input)] transition-all"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={currentStep === "target" && selectedMeta.requiresTarget && !targetTokenId}
                  className="flex-[2] py-5 rounded-2xl bg-[color:var(--accent)] text-[#050505] font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  {currentStep === "details" || (!selectedMeta.requiresTarget && !isAttackManeuver) ? "Girar e Resolver" : "Próximo"}
                </button>
              </div>
              <p className="text-center text-[10px] font-black uppercase text-[color:var(--ink-1)]/20 tracking-widest">
                Passo {currentStep === "maneuver" ? '1' : currentStep === "target" ? '2' : '3'} de 3
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
