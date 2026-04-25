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
                ? "border-amber-300/40 bg-amber-300/10 shadow-[0_0_15px_rgba(251,191,36,0.1)] scale-105 z-10"
                : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]"
            )}
          >
            {isActive && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-black shadow-lg">
                Ativo
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black transition-colors",
                isActive ? "border-amber-500/50 bg-amber-500 text-black" : "border-white/10 bg-black/40 text-white/40"
              )}>
                {index + 1}
              </div>
              <p className={cn(
                "truncate text-[11px] font-bold",
                isActive ? "text-white" : "text-white/60"
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
                    className="rounded-md border border-rose-500/20 bg-rose-500/10 px-1 py-0.5 text-[8px] font-black uppercase text-rose-300"
                  >
                    {c.label.slice(0, 4)}
                  </span>
                ))}
                {conditions.length > 2 && (
                  <span className="text-[8px] font-black text-white/20">
                    +{conditions.length - 2}
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
