"use client";

import type { CombatActionType } from "@/types/combat";
import { 
  Footprints, 
  Sword, 
  ShieldCheck, 
  Eye, 
  Zap, 
  Brain, 
  Timer, 
  Crosshair,
  Ban
} from "lucide-react";
import "@/styles/combat-animations.css";

interface ManeuverCardProps {
  type: CombatActionType;
  label: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  shortcut?: string;
}

const maneuverIcons: Record<string, any> = {
  "move": Footprints,
  "attack": Sword,
  "ranged-attack": Crosshair,
  "all-out-attack": Zap,
  "all-out-defense": ShieldCheck,
  "evaluate": Eye,
  "aim": Crosshair,
  "feint": Sword,
  "feint-beat": ShieldCheck,
  "feint-mental": Brain,
  "ready": Timer,
  "concentrate": Brain,
  "wait": Timer,
  "do-nothing": Ban
};

export function ManeuverCard({
  type,
  label,
  description,
  selected,
  disabled,
  onClick,
  shortcut
}: ManeuverCardProps) {
  const Icon = maneuverIcons[type] || Sword;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-selected={selected}
      className={`
        relative flex flex-col items-start p-4 text-left border rounded-xl 
        combat-maneuver-card transition-all duration-200 group
        ${disabled ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/2' : 'cursor-pointer'}
        ${selected 
          ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
          : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'}
      `}
    >
      <div className={`
        p-2 rounded-lg mb-3 transition-colors
        ${selected ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 group-hover:text-white'}
      `}>
        <Icon size={20} strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between w-full">
          <span className={`font-black text-sm uppercase tracking-tight ${selected ? 'text-amber-400' : 'text-white'}`}>
            {label}
          </span>
          {shortcut && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/5 uppercase">
              {shortcut}
            </span>
          )}
        </div>
        <p className="text-[11px] leading-tight text-white/40 font-medium line-clamp-2">
          {description}
        </p>
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      )}
    </button>
  );
}
