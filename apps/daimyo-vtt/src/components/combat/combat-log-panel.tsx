"use client";

import { X, History } from "lucide-react";
import { CombatResolutionCard } from "@/components/combat/combat-resolution-card";
import type { CombatResolutionRecord } from "@/types/combat";

interface CombatLogPanelProps {
  log: CombatResolutionRecord[];
  onClose?: () => void;
}

export function CombatLogPanel({ log, onClose }: CombatLogPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-white/10 bg-[rgba(5,10,18,0.96)] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="hud-chip border-sky-300/20 bg-sky-300/10 text-sky-100">
            <History size={14} />
            histórico
          </span>
          <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
            {log.length} registros
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-1">
        {log.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center opacity-20">
            <History size={40} className="mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">
              Nenhum registro<br />de combate ainda
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {log.map((resolution) => (
              <CombatResolutionCard key={resolution.id} resolution={resolution} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
