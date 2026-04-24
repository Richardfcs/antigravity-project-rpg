"use client";

import { useState, useMemo } from "react";
import type { 
  TacticalStageToken, 
  TacticalCombatStateView 
} from "@/lib/maps/selectors";
import type { 
  CombatDraftAction, 
  CombatActionType,
  SessionCombatFlow
} from "@/types/combat";
import { ManeuverCard } from "./maneuver-card";
import { HealthBar } from "./health-bar";
import { 
  X, 
  Swords, 
  Shield, 
  Zap, 
  Timer, 
  Brain, 
  Eye,
  Crosshair,
  ChevronRight,
  Sparkles
} from "lucide-react";
import "@/styles/combat-animations.css";

interface PlayerTurnOverlayProps {
  token: TacticalStageToken;
  combatState: TacticalCombatStateView;
  combatFlow: SessionCombatFlow | null;
  onExecute: (action: CombatDraftAction) => void;
  onClose: () => void;
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
  const [allOutVariant, setAllOutVariant] = useState<string>("determined");
  
  const profile = token.token.character?.sheetProfile as any;
  const hp = profile?.combat?.currentHp ?? 10;
  const hpMax = profile?.attributes?.hpMax ?? 10;
  const fp = profile?.combat?.currentFp ?? 10;
  const fpMax = profile?.attributes?.fpMax ?? 10;

  const maneuvers = [
    { id: "move", label: "Mover", desc: "Apenas movimento total.", cat: "basic" },
    { id: "attack", label: "Ataque", desc: "Movimento parcial e um ataque.", cat: "offense" },
    { id: "all-out-attack", label: "Ataque Total", desc: "Ataque agressivo, mas sem defesa.", cat: "offense" },
    { id: "feint", label: "Finta", desc: "Enganar a defesa do oponente.", cat: "offense" },
    { id: "evaluate", label: "Avaliar", desc: "Estudar o alvo para ganhar bônus.", cat: "support" },
    { id: "aim", label: "Mirar", desc: "Aumentar precisão à distância.", cat: "support" },
    { id: "all-out-defense", label: "Defesa Total", desc: "Foco total em não ser atingido.", cat: "defense" },
    { id: "ready", label: "Preparar", desc: "Pegar arma ou trocar de item.", cat: "support" },
    { id: "concentrate", label: "Concentrar", desc: "Usar magia ou habilidades mentais.", cat: "support" },
    { id: "wait", label: "Esperar", desc: "Aguardar um gatilho para agir.", cat: "support" },
    { id: "do-nothing", label: "Fazer Nada", desc: "Recuperar de atordoamento.", cat: "basic" },
  ];

  const availableTargets = combatState.turnOrder.filter(t => t.token.id !== token.token.id);

  const handleConfirm = () => {
    onExecute({
      actorTokenId: token.token.id,
      targetTokenId: targetTokenId,
      actionType: selectedManeuver,
      allOutVariant: selectedManeuver.includes("all-out") ? (allOutVariant as any) : undefined,
      modifiers: {
        manual: 0,
        hitLocation: "torso"
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 combat-overlay-backdrop">
      <div className="relative w-full max-w-5xl bg-[#0a0a0b] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] combat-alert">
        {/* Header com Info do Personagem */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Swords size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Seu Turno</h2>
              <p className="text-amber-500/60 font-bold uppercase tracking-widest text-xs mt-1">
                {token.label} • Rodada {combatState.round}
              </p>
            </div>
          </div>

          <div className="flex gap-8 items-center">
            <div className="w-48">
              <HealthBar label="Pontos de Vida" current={hp} max={hpMax} />
            </div>
            <div className="w-48">
              <HealthBar label="Fadiga" current={fp} max={fpMax} variant="fp" />
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Grid de Manobras */}
          <div className="flex-[3] p-8 overflow-y-auto scrollbar-none border-r border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
              <Zap size={12} /> Escolha sua Manobra
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              {maneuvers.map((m) => (
                <ManeuverCard
                  key={m.id}
                  type={m.id as any}
                  label={m.label}
                  description={m.desc}
                  selected={selectedManeuver === m.id}
                  onClick={() => setSelectedManeuver(m.id as any)}
                />
              ))}
            </div>
          </div>

          {/* Configuração da Ação */}
          <div className="flex-[2] p-8 bg-white/[0.01] flex flex-col">
            <div className="flex-1 space-y-8">
              {/* Seleção de Alvo se necessário */}
              {["attack", "feint", "evaluate", "aim", "all-out-attack"].includes(selectedManeuver) && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Crosshair size={12} /> Selecione o Alvo
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {availableTargets.map((t) => (
                      <button
                        key={t.token.id}
                        onClick={() => setTargetTokenId(t.token.id)}
                        className={`
                          p-3 rounded-xl border text-left flex items-center justify-between transition-all
                          ${targetTokenId === t.token.id 
                            ? 'bg-amber-500/10 border-amber-500/50 text-white' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}
                        `}
                      >
                        <span className="font-bold text-sm">{t.label}</span>
                        {targetTokenId === t.token.id && <ChevronRight size={16} className="text-amber-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Opções de Ataque Total */}
              {selectedManeuver === "all-out-attack" && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <Zap size={12} /> Opção de Ataque Total
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "determined", label: "Determinado", desc: "+4 no acerto" },
                      { id: "strong", label: "Forte", desc: "+2 no dano" },
                      { id: "double", label: "Duplo", desc: "Dois ataques" },
                      { id: "long", label: "Longo", desc: "+1m alcance" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setAllOutVariant(v.id)}
                        className={`
                          p-3 rounded-xl border text-left transition-all
                          ${allOutVariant === v.id 
                            ? 'bg-amber-500/10 border-amber-500/50 text-white' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'}
                        `}
                      >
                        <p className="font-bold text-xs">{v.label}</p>
                        <p className="text-[9px] opacity-60 uppercase font-black">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Execução */}
            <div className="pt-8 mt-auto">
              <button
                onClick={handleConfirm}
                className={`
                  w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all
                  ${(selectedManeuver === 'attack' && !targetTokenId) 
                    ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                    : 'bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_32px_rgba(245,158,11,0.25)]'}
                `}
              >
                <Sparkles size={18} />
                Executar Manobra
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
