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
  Sparkles,
  MoveRight,
  Binary
} from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/combat-animations.css";

interface DefensePromptOverlayProps {
  summary: string;
  options: CombatDefenseOption[];
  defenseLevels?: Record<string, number> | null;
  canRetreat?: boolean;
  canAcrobatic?: boolean;
  onResolve: (option: CombatDefenseOption, retreat: boolean, acrobatic: boolean, manualModifier: number, feverish: boolean) => void;
}

export function DefensePromptOverlay({
  summary,
  options,
  defenseLevels,
  canRetreat,
  canAcrobatic,
  onResolve
}: DefensePromptOverlayProps) {
  const [selected, setSelected] = useState<CombatDefenseOption>(options[0] || "none");
  const [retreat, setRetreat] = useState(false);
  const [acrobatic, setAcrobatic] = useState(false);
  const [feverish, setFeverish] = useState(false);
  const [manualModifier, setManualModifier] = useState(0);

  const defenseLabels: Record<string, { label: string; sub: string }> = {
    dodge: { label: "ESQUIVA", sub: "Baseado em Velocidade Básica." },
    parry: { label: "APARAR", sub: "Baseado em perícia de combate." },
    block: { label: "BLOQUEIO", sub: "Uso do escudo equipado." },
    none: { label: "SEM DEFESA", sub: "Aceitar o golpe sem reagir." }
  };

  const finalNH = (() => {
    const baseLevel = (defenseLevels as any)?.[selected] || 10;
    let level = baseLevel + manualModifier;
    if (retreat) level += (selected === "dodge" ? 3 : 1);
    if (feverish) level += 2;
    return Math.min(16, Math.max(3, level));
  })();

  const finalProb = (() => {
    const nh = finalNH;
    const probMap: Record<number, string> = {
      3: "0.5%", 4: "1.9%", 5: "4.6%", 6: "9.3%", 7: "16.2%", 8: "25.9%", 
      9: "37.5%", 10: "50%", 11: "62.5%", 12: "74.1%", 13: "83.8%", 
      14: "90.7%", 15: "95.4%", 16: "98.1%"
    };
    return probMap[nh] || (nh > 16 ? "98.1%" : "0.5%");
  })();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
      <div className="relative w-full max-w-2xl bg-[rgba(10,10,12,0.98)] border border-white/5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col combat-defense-alert animate-in fade-in zoom-in duration-300">
        
        {/* Header - Estilo "Premium" */}
        <div className="relative flex items-center gap-6 border-b border-white/5 px-8 py-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Sob Ataque!</h2>
            <p className="text-sm font-bold tracking-[0.3em] text-rose-500 uppercase opacity-80 mt-1">Escolha sua defesa ativa</p>
          </div>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Gold Probability Box - Santuário Design */}
          {options.length > 0 && (
            <div className="overflow-hidden rounded-[24px] bg-gradient-to-br from-amber-200 to-amber-500 p-[1px] shadow-[0_20px_50px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-between bg-[rgba(20,15,5,0.92)] px-8 py-6 backdrop-blur-md rounded-[23px]">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/50">Potencial de Defesa</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-amber-200 tracking-tighter">
                      NH {finalNH}
                    </span>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/50">Probabilidade</p>
                  <span className="text-5xl font-black text-amber-200 tracking-tighter italic">
                    {finalProb}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resumo do Ataque */}
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 flex items-start gap-4">
            <div className="mt-1 p-2 rounded-xl bg-white/5 text-[color:var(--ink-2)]">
              <Target size={20} />
            </div>
            <p className="text-sm italic leading-relaxed text-[color:var(--ink-2)] opacity-90">
              &quot;{summary}&quot;
            </p>
          </div>

          {/* Opções de Defesa */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-2)] flex items-center gap-2">
              <Shield size={12} /> Métodos Disponíveis
            </h3>
            <div className="grid gap-2.5">
              {options.map((opt) => {
                const active = selected === opt;
                const info = defenseLabels[opt] || { label: opt.toUpperCase(), sub: "" };
                return (
                  <button
                    key={opt}
                    onClick={() => setSelected(opt)}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-[24px] border px-6 py-4 transition-all duration-300",
                      active 
                        ? "border-rose-500/40 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.05)]" 
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all",
                      active 
                        ? "border-rose-500/30 bg-rose-500/20 text-rose-500" 
                        : "border-white/10 bg-white/5 text-[color:var(--ink-2)] group-hover:text-white"
                    )}>
                      {opt === "none" ? <Target size={22} /> : <Shield size={22} className={cn(active && "fill-rose-500/20")} />}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-lg font-black tracking-tight", active ? "text-white" : "text-[color:var(--ink-2)]")}>
                        {info.label}
                      </p>
                      <p className="text-xs text-[color:var(--ink-2)] opacity-50">{info.sub}</p>
                    </div>
                    <MoveRight className={cn(
                      "ml-auto h-5 w-5 transition-all",
                      active ? "text-rose-500 translate-x-0 opacity-100" : "text-white/0 -translate-x-4 opacity-0"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modificadores Especiais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {canRetreat && (
              <button
                onClick={() => setRetreat(!retreat)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-[20px] border py-4 transition-all",
                  retreat ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-2)] hover:border-white/10"
                )}
              >
                <Zap size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Recuar (+3)</span>
              </button>
            )}
            {canAcrobatic && (
              <button
                onClick={() => setAcrobatic(!acrobatic)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-[20px] border py-4 transition-all",
                  acrobatic ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-2)] hover:border-white/10"
                )}
              >
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Acrobática (+2)</span>
              </button>
            )}
            <button
              onClick={() => setFeverish(!feverish)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-[20px] border py-4 transition-all",
                feverish ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-2)] hover:border-white/10"
              )}
            >
              <Zap size={16} fill={feverish ? "currentColor" : "none"} />
              <span className="text-[10px] font-black uppercase tracking-widest">Febril (+2)</span>
            </button>
            <div className="flex flex-col items-center justify-center gap-1 rounded-[20px] border border-white/5 bg-white/[0.02] py-3 text-[color:var(--ink-2)]">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Manual</span>
              <div className="flex items-center gap-2">
                <Binary size={12} className="opacity-30" />
                <input 
                  type="number"
                  value={manualModifier}
                  onChange={(e) => setManualModifier(parseInt(e.target.value) || 0)}
                  className="w-10 bg-transparent text-center text-xl font-black text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Confirmar */}
          <button
            onClick={() => onResolve(selected, retreat, acrobatic, manualModifier, feverish)}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[24px] bg-rose-500 py-6 text-sm font-black uppercase tracking-[0.3em] text-white shadow-[0_15px_40px_rgba(244,63,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            <Shield size={20} className="transition-transform group-hover:scale-125" />
            Confirmar Defesa
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </div>
  );
}
