"use client";

import { useState } from "react";
import type { CombatDefenseOption } from "@/types/combat";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  ChevronRight,
  Zap,
  Target,
  Sparkles
} from "lucide-react";
import "@/styles/combat-animations.css";

interface DefensePromptOverlayProps {
  summary: string;
  options: CombatDefenseOption[];
  canRetreat?: boolean;
  canAcrobatic?: boolean;
  onResolve: (option: CombatDefenseOption, retreat: boolean, acrobatic: boolean) => void;
}

export function DefensePromptOverlay({
  summary,
  options,
  canRetreat,
  canAcrobatic,
  onResolve
}: DefensePromptOverlayProps) {
  const [selected, setSelected] = useState<CombatDefenseOption>(options[0] || "none");
  const [retreat, setRetreat] = useState(false);
  const [acrobatic, setAcrobatic] = useState(false);

  const getOptionLabel = (opt: CombatDefenseOption) => {
    switch (opt) {
      case "dodge": return "Esquiva";
      case "parry": return "Aparar";
      case "block": return "Bloqueio";
      default: return "Nenhuma";
    }
  };

  const getOptionDesc = (opt: CombatDefenseOption) => {
    switch (opt) {
      case "dodge": return "Baseado em Velocidade Básica.";
      case "parry": return "Baseado em perícia de combate.";
      case "block": return "Uso do escudo equipado.";
      default: return "Aceitar o golpe sem defender.";
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 combat-overlay-backdrop">
      <div className="relative w-full max-w-2xl bg-[#0d0d0e] border border-red-500/20 rounded-[32px] shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden flex flex-col combat-defense-alert">
        {/* Header de Alerta */}
        <div className="p-8 border-b border-red-500/10 bg-gradient-to-r from-red-500/10 to-transparent flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Sob Ataque!</h2>
            <p className="text-red-500/60 font-bold uppercase tracking-widest text-xs mt-1">
              Escolha sua defesa ativa
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Resumo do Ataque */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
            <div className="mt-1 p-2 rounded-lg bg-red-500/10 text-red-400">
              <Target size={16} />
            </div>
            <p className="text-sm font-medium text-white/80 leading-relaxed italic">
              "{summary}"
            </p>
          </div>

          {/* Opções de Defesa */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Shield size={12} /> Métodos Disponíveis
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`
                    p-4 rounded-2xl border text-left flex items-center justify-between transition-all group
                    ${selected === opt 
                      ? 'bg-red-500/10 border-red-500/50 text-white' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      p-2 rounded-lg transition-colors
                      ${selected === opt ? 'bg-red-500 text-black' : 'bg-white/5 text-white/20'}
                    `}>
                      {opt === "none" ? <Target size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-tight">{getOptionLabel(opt)}</p>
                      <p className="text-[10px] opacity-40 font-medium">{getOptionDesc(opt)}</p>
                    </div>
                  </div>
                  {selected === opt && <ChevronRight size={20} className="text-red-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Modificadores Especiais */}
          <div className="flex gap-4">
            {canRetreat && (
              <button
                onClick={() => setRetreat(!retreat)}
                className={`
                  flex-1 p-4 rounded-2xl border flex flex-col items-center gap-1 transition-all
                  ${retreat 
                    ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                    : 'bg-white/5 border-white/5 text-white/20 hover:border-white/20'}
                `}
              >
                <Zap size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Recuar (+3)</span>
              </button>
            )}
            {canAcrobatic && (
              <button
                onClick={() => setAcrobatic(!acrobatic)}
                className={`
                  flex-1 p-4 rounded-2xl border flex flex-col items-center gap-1 transition-all
                  ${acrobatic 
                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'bg-white/5 border-white/5 text-white/20 hover:border-white/20'}
                `}
              >
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Acrobática (+2)</span>
              </button>
            )}
          </div>

          {/* Confirmar */}
          <button
            onClick={() => onResolve(selected, retreat, acrobatic)}
            className="w-full py-5 rounded-2xl bg-red-500 text-black flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all hover:bg-red-400 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_32px_rgba(239,68,68,0.25)] mt-4"
          >
            <Shield size={18} fill="currentColor" />
            Confirmar Defesa
          </button>
        </div>
      </div>
    </div>
  );
}
