"use client";

import type { CombatResolutionRecord } from "@/types/combat";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Activity,
  Heart,
  Skull,
  Swords,
  Shield,
  ShieldAlert,
  Dices,
  ChevronRight,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/combat-animations.css";

interface CombatResolutionCardProps {
  resolution: CombatResolutionRecord;
  compact?: boolean;
}

export function CombatResolutionCard({
  resolution,
  compact = false
}: CombatResolutionCardProps) {
  const isSuccess = resolution.summary.toLowerCase().includes("sucesso") || 
                   resolution.summary.toLowerCase().includes("acerta") ||
                   resolution.summary.toLowerCase().includes("supera");
  
  const isFailure = resolution.summary.toLowerCase().includes("falha") || 
                   resolution.summary.toLowerCase().includes("erro") ||
                   resolution.summary.toLowerCase().includes("resiste");

  const hasDamage = (resolution.hpDelta && resolution.hpDelta < 0) || (resolution.damage && resolution.damage.injury > 0);
  const isDeath = resolution.appliedConditions?.includes("Morto") || resolution.summary.toLowerCase().includes("morto");

  // Determinar o tipo de ícone principal
  const getIcon = () => {
    if (isDeath) return <Skull size={18} className="text-rose-500" />;
    if (resolution.damage && resolution.damage.injury > 0) return <Heart size={18} className="text-rose-400" fill="currentColor" />;
    if (resolution.defenseRoll && resolution.defenseRoll.margin >= 0) return <Shield size={18} className="text-sky-400" />;
    if (resolution.attackRoll && resolution.attackRoll.margin < 0) return <XCircle size={18} className="text-rose-400" />;
    return <Swords size={18} className="text-amber-400" />;
  };

  // Fallbacks para nomes baseados no summary (para logs antigos)
  const fallbackActor = resolution.summary.split("ataca")[0]?.split("troca")[0]?.split("se move")[0]?.split("falhou")[0]?.split("sobreviveu")[0]?.split("evita")[0]?.split("resiste")[0]?.split("supera")[0]?.trim() || "Desconhecido";
  const actorName = resolution.actorName || fallbackActor;
  
  const fallbackTarget = resolution.targetName || (resolution.summary.includes("ataca") ? resolution.summary.split("ataca")[1]?.split("com")[0]?.trim() : null);
  const targetName = resolution.targetName || fallbackTarget;

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-[20px] border transition-all duration-300",
        isSuccess ? "border-emerald-500/20 bg-emerald-500/[0.02]" : 
        isFailure ? "border-rose-500/20 bg-rose-500/[0.02]" : 
        "border-white/10 bg-white/[0.01]",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Glow lateral indicativo */}
      <div className={cn(
        "absolute inset-y-0 left-0 w-1",
        isSuccess ? "bg-emerald-500/40" : isFailure ? "bg-rose-500/40" : "bg-white/10"
      )} />

      <div className="flex flex-col gap-3">
        {/* Cabeçalho: Ator -> Alvo */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
              isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              isFailure ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
              "bg-white/5 border-white/10 text-white/40"
            )}>
              {resolution.actionType}
            </span>
            <span className="text-[10px] font-medium text-white/20">
              {new Date(resolution.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {hasDamage && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-black">
              <Heart size={10} fill="currentColor" />
              {resolution.hpDelta || `-${resolution.damage?.injury}`}
            </div>
          )}
        </div>

        {/* Fluxo do Combate: QUEM -> O QUÊ -> QUEM */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white tracking-tight truncate max-w-[150px]">
                {actorName}
              </span>
              
              <ChevronRight size={14} className="text-white/10 shrink-0" />
              
              <span className="text-[10px] font-bold text-amber-200/60 uppercase tracking-wider bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                {resolution.summary.split("ataca")[1]?.split("com")[0]?.trim() || resolution.actionType}
              </span>

              {targetName && (
                <>
                  <ChevronRight size={14} className="text-white/10 shrink-0" />
                  <span className="text-sm font-black text-white/60 tracking-tight truncate max-w-[150px]">
                    {targetName}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="shrink-0">
            {getIcon()}
          </div>
        </div>

        {/* Resultado Principal */}
        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
          <p className="text-xs font-medium text-white/90 leading-relaxed italic">
            {resolution.summary.includes(".") ? resolution.summary.split(".").slice(1).join(".").trim() : resolution.summary}
          </p>
        </div>

        {/* Auditoria Matemática (Audit) */}
        <div className="grid grid-cols-2 gap-4 mt-1">
          {resolution.attackRoll && (
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Ataque</p>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-xs font-black",
                  resolution.attackRoll.margin >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {resolution.attackRoll.total} <span className="text-[9px] font-medium text-white/30">vs {resolution.attackRoll.target}</span>
                </span>
                <span className="text-[9px] font-bold text-white/20 italic">
                  M: {resolution.attackRoll.margin > 0 ? `+${resolution.attackRoll.margin}` : resolution.attackRoll.margin}
                </span>
              </div>
            </div>
          )}

          {resolution.defenseRoll && (
            <div className="space-y-1 text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Defesa</p>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-[9px] font-bold text-white/20 italic">
                  M: {resolution.defenseRoll.margin > 0 ? `+${resolution.defenseRoll.margin}` : resolution.defenseRoll.margin}
                </span>
                <span className={cn(
                  "text-xs font-black",
                  resolution.defenseRoll.margin >= 0 ? "text-sky-400" : "text-rose-400"
                )}>
                   <span className="text-[9px] font-medium text-white/30">{resolution.defenseRoll.target} vs</span> {resolution.defenseRoll.total}
                </span>
              </div>
            </div>
          )}

          {resolution.damage && (
            <div className="col-span-2 pt-2 border-t border-white/5 mt-1 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Dano Bruto</p>
                    <p className="text-[10px] font-bold text-white/60">
                      {resolution.damage.rawDamage} <span className="text-[9px] font-medium text-white/30">[{resolution.damage.rawDice.join("+")}]</span>
                    </p>
                  </div>
                  <div className="h-4 w-[1px] bg-white/5" />
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">RD Efetiva</p>
                    <p className="text-[10px] font-bold text-white/60">{resolution.damage.effectiveDr}</p>
                  </div>
               </div>
               
               <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-400/40">Lesao Final</p>
                  <p className="text-sm font-black text-rose-400">-{resolution.damage.injury}</p>
               </div>
            </div>
          )}
        </div>

        {/* Condições Aplicadas */}
        {resolution.appliedConditions && resolution.appliedConditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resolution.appliedConditions.map((cond, i) => (
              <span 
                key={i}
                className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider"
              >
                {cond}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
