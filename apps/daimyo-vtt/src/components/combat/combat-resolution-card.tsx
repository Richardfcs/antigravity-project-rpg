"use client";

import type { CombatResolutionRecord } from "@/types/combat";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Activity,
  Heart,
  Skull
} from "lucide-react";
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

  return (
    <div 
      className={`
        combat-resolution-card p-3 rounded-lg border bg-black/30 backdrop-blur-sm
        ${isSuccess ? 'border-green-500/20' : isFailure ? 'border-red-500/20' : 'border-white/10'}
        ${compact ? 'mb-2' : 'mb-4'}
      `}
      data-success={isSuccess}
      data-failure={isFailure}
    >
      <div className="flex items-start gap-3">
        <div className={`
          mt-0.5 p-1.5 rounded-md
          ${isSuccess ? 'bg-green-500/10 text-green-400' : isFailure ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/40'}
        `}>
          {isDeath ? <Skull size={16} /> : isSuccess ? <CheckCircle2 size={16} /> : isFailure ? <XCircle size={16} /> : <Activity size={16} />}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-tighter text-white/30 truncate">
              {resolution.actionType} • {new Date(resolution.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {hasDamage && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                <Heart size={10} fill="currentColor" />
                {resolution.hpDelta || `-${resolution.damage?.injury}`}
              </div>
            )}
          </div>

          <p className="text-xs font-medium text-white/80 leading-relaxed">
            {resolution.summary}
          </p>

          {resolution.appliedConditions && resolution.appliedConditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {resolution.appliedConditions.map((cond, i) => (
                <span 
                  key={i}
                  className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider"
                >
                  {cond}
                </span>
              ))}
            </div>
          )}

          {resolution.contestRolls && (
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-white/20 font-bold tracking-widest">Atacante</span>
                <span className="text-[10px] font-bold text-white/60">{resolution.contestRolls.actor.total} vs {resolution.contestRolls.actor.target}</span>
              </div>
              <div className="text-[8px] font-bold text-white/10 uppercase">vs</div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-white/20 font-bold tracking-widest">Defensor</span>
                <span className="text-[10px] font-bold text-white/60">{resolution.contestRolls.target.total} vs {resolution.contestRolls.target.target}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
