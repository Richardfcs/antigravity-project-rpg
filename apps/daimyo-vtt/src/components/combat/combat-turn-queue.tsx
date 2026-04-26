"use client";

import { cn } from "@/lib/utils";
import { HealthBar } from "./health-bar";
import type { TacticalStageToken } from "@/lib/maps/selectors";

interface CombatTurnQueueProps {
  tokens: TacticalStageToken[];
  activeTokenId: string | null;
  onSelect?: (tokenId: string) => void;
}

export function CombatTurnQueue({
  tokens,
  activeTokenId,
  onSelect
}: CombatTurnQueueProps) {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2 px-1 pt-4">
      {tokens.map((entry, index) => {
        const isActive = entry.token.id === activeTokenId;
        const profile = entry.character?.sheetProfile;
        const hp = profile?.combat?.currentHp ?? 10;
        const hpMax = profile?.attributes?.hpMax ?? 10;
        const fp = profile?.combat?.currentFp ?? 10;
        const fpMax = profile?.attributes?.fpMax ?? 10;
        const conditions = entry.character?.sheetProfile?.conditions || [];

        return (
          <button
            key={`queue:${entry.token.id}`}
            onClick={() => onSelect?.(entry.token.id)}
            className={cn(
              "relative flex min-w-[140px] max-w-[140px] flex-col gap-2 rounded-2xl border p-2.5 transition-all duration-300",
              isActive
                ? "border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 shadow-[0_0_15px_rgba(212,168,70,0.1)] scale-105 z-10"
                : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] hover:border-[color:var(--ink-3)] hover:bg-[color:var(--bg-panel)]"
            )}
          >
            {isActive && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--accent)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#050505] shadow-lg">
                Ativo
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black transition-colors",
                isActive ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)] text-[#050505]" : "border-[color:var(--border-panel)] bg-[color:var(--bg-deep)]/40 text-[color:var(--ink-3)]"
              )}>
                {index + 1}
              </div>
              <p className={cn(
                "truncate text-[11px] font-bold",
                isActive ? "text-[color:var(--ink-1)]" : "text-[color:var(--ink-2)]"
              )}>
                {entry.label}
              </p>
            </div>

            <div className="space-y-1.5">
              <HealthBar
                current={hp}
                max={hpMax}
                label="PV"
                variant="hp"
                compact={true}
              />
              <HealthBar
                current={fp}
                max={fpMax}
                label="PF"
                variant="fp"
                compact={true}
              />
            </div>

            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {conditions.slice(0, 2).map((c) => (
                  <span
                    key={c.id}
                    className="rounded-md border border-[color:var(--red-accent)]/20 bg-[color:var(--red-accent)]/10 px-1 py-0.5 text-[8px] font-black uppercase text-[color:var(--red-accent)]"
                  >
                    {c.label.slice(0, 4)}
                  </span>
                ))}
                {conditions.length > 2 && (
                  <span className="text-[8px] font-black text-white/20">
                    + {conditions.length - 2}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
