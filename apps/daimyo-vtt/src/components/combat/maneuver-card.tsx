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
import type { LucideIcon } from "lucide-react";
import "@/styles/combat-animations.css";

interface ManeuverCardProps {
  type: CombatActionType;
  label: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  shortcut?: string;
  badges?: string[];
}

const maneuverIcons: Partial<Record<CombatActionType, LucideIcon>> = {
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
  "swap-technique": Timer,
  "quick-contest": Zap,
  "regular-contest": Zap,
  "iai-strike": Zap,
  "do-nothing": Ban
};

export function ManeuverCard({
  type,
  label,
  description,
  selected,
  disabled,
  onClick,
  shortcut,
  badges = []
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
        ${disabled ? 'opacity-40 cursor-not-allowed border-[color:var(--border-panel)] bg-[color:var(--bg-input)]/20' : 'cursor-pointer'}
        ${selected 
          ? 'bg-[color:var(--accent)]/10 border-[color:var(--accent)]/50 shadow-[0_0_15px_rgba(212,168,70,0.1)]' 
          : 'bg-[color:var(--bg-deep)]/40 border-[color:var(--border-panel)] hover:border-[color:var(--ink-3)] hover:bg-[color:var(--bg-panel)]'}
      `}
    >
      <div className={`
        p-2 rounded-lg mb-3 transition-colors
        ${selected ? 'bg-[color:var(--accent)] text-[#050505]' : 'bg-[color:var(--bg-input)] text-[color:var(--ink-3)] group-hover:text-[color:var(--ink-1)]'}
      `}>
        <Icon size={20} strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between w-full">
          <span className={`font-black text-sm uppercase tracking-tight ${selected ? 'text-[color:var(--accent)]' : 'text-[color:var(--ink-1)]'}`}>
            {label}
          </span>
          {shortcut && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[color:var(--bg-input)] text-[color:var(--ink-3)] border border-[color:var(--border-panel)] uppercase">
              {shortcut}
            </span>
          )}
        </div>
        <p className="text-[11px] leading-tight text-[color:var(--ink-3)] font-medium line-clamp-2">
          {description}
        </p>
        {badges.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[color:var(--border-panel)] bg-[color:var(--bg-input)] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--ink-3)]"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_rgba(212,168,70,0.8)]" />
      )}
    </button>
  );
}
