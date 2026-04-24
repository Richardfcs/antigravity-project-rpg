"use client";

import { useMemo } from "react";
import type { CombatRollRecord } from "@/types/combat";
import "@/styles/combat-animations.css";

interface DiceRollerDisplayProps {
  roll: CombatRollRecord | null;
  target: number;
  label?: string;
  isRolling?: boolean;
}

export function DiceRollerDisplay({
  roll,
  target,
  label,
  isRolling = false
}: DiceRollerDisplayProps) {
  const status = useMemo(() => {
    if (!roll) return "idle";
    if (roll.critical === "critical-success") return "critical-success";
    if (roll.critical === "critical-failure") return "critical-failure";
    return roll.margin >= 0 ? "success" : "failure";
  }, [roll]);

  const containerClass = useMemo(() => {
    const base = "flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300";
    if (isRolling) return `${base} combat-dice-rolling`;
    if (status === "critical-success") return `${base} combat-critical-success border-amber-500/50`;
    if (status === "critical-failure") return `${base} combat-critical-failure border-red-500/50`;
    return base;
  }, [isRolling, status]);

  const diceColors = useMemo(() => {
    if (status === "critical-success") return "text-amber-400";
    if (status === "critical-failure") return "text-red-500";
    if (status === "success") return "text-green-400";
    if (status === "failure") return "text-red-400";
    return "text-white/80";
  }, [status]);

  return (
    <div className={containerClass}>
      {label && (
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">
          {label}
        </span>
      )}
      
      <div className="flex gap-3 mb-3">
        {roll ? (
          roll.dice.map((value, idx) => (
            <div
              key={idx}
              className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 border-white/10 bg-white/5 text-2xl font-black ${diceColors} shadow-lg combat-number-pop`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {value}
            </div>
          ))
        ) : (
          [1, 2, 3].map((_, idx) => (
            <div
              key={idx}
              className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-white/5 bg-white/2 text-2xl font-black text-white/10 shadow-inner"
            >
              ?
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black tracking-tight ${diceColors}`}>
            {roll ? roll.total : "--"}
          </span>
          <span className="text-lg text-white/20 font-bold">VS</span>
          <span className="text-3xl font-bold text-white/60">
            {target}
          </span>
        </div>
        
        {roll && (
          <div className={`mt-1 text-sm font-bold uppercase tracking-widest ${diceColors} combat-fade-in`}>
            {status === "critical-success" && "Sucesso Crítico!"}
            {status === "critical-failure" && "Falha Crítica!"}
            {status === "success" && `Sucesso por ${roll.margin}`}
            {status === "failure" && `Falha por ${Math.abs(roll.margin)}`}
          </div>
        )}
      </div>
    </div>
  );
}
