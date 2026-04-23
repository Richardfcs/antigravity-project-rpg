"use client";

import { Compass, Ghost, Map, MapPinned, Music4, Theater, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionCommandState } from "@/lib/session/command-state";
import type { ExplorerSection, StageMode } from "@/types/session";

interface StageContextBarProps {
  stageMode: StageMode;
  state: SessionCommandState;
  onOpenSection: (section: ExplorerSection) => void;
}

function buildContext(stageMode: StageMode, state: SessionCommandState) {
  switch (stageMode) {
    case "tactical":
      return {
        title: "Campo em foco",
        chips: [
          { label: state.activeMapName ?? "sem campo ativo", icon: MapPinned },
          { label: `${state.mapTokenCount} tokens`, icon: Compass },
          {
            label: state.combatEnabled ? `rodada ${state.combatRound}` : "combate em espera",
            icon: Ghost
          }
        ],
        actions: [
          { label: "campos", section: "maps" as const, icon: Map },
          { label: "fichas", section: "actors" as const, icon: UsersRound },
          { label: "trilhas", section: "audio" as const, icon: Music4 },
          { label: "efeitos", section: "effects" as const, icon: Ghost }
        ]
      };
    case "atlas":
      return {
        title: "Wiki em foco",
        chips: [
          { label: state.activeAtlasName ?? "sem atlas ativo", icon: MapPinned },
          {
            label: `${state.atlasVisiblePinCount}/${state.atlasVisiblePinCount + state.atlasHiddenPinCount} revelados`,
            icon: Compass
          }
        ],
        actions: [
          { label: "atlas", section: "atlas" as const, icon: MapPinned },
          { label: "fichas", section: "actors" as const, icon: UsersRound },
          { label: "efeitos", section: "effects" as const, icon: Ghost },
          { label: "conversa", section: "chat" as const, icon: Compass }
        ]
      };
    case "theater":
    default:
      return {
        title: "Cena em foco",
        chips: [
          { label: state.activeSceneName ?? "sem cena ativa", icon: Theater },
          { label: `${state.sceneCastCount} em cena`, icon: UsersRound }
        ],
        actions: [
          { label: "cenas", section: "scenes" as const, icon: Theater },
          { label: "fichas", section: "actors" as const, icon: UsersRound },
          { label: "trilhas", section: "audio" as const, icon: Music4 },
          { label: "efeitos", section: "effects" as const, icon: Ghost }
        ]
      };
  }
}

export function StageContextBar({
  stageMode,
  state,
  onOpenSection
}: StageContextBarProps) {
  const context = buildContext(stageMode, state);

  return (
    <section className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="section-label">{context.title}</span>
            {context.chips.map((chip) => (
              <span
                key={chip.label}
                className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]"
              >
                <chip.icon size={12} />
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {context.actions.map((action) => (
            <button
              key={`${stageMode}:${action.section}`}
              type="button"
              onClick={() => onOpenSection(action.section)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
              )}
            >
              <action.icon size={14} />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
