"use client";

import {
  AudioLines,
  BookmarkCheck,
  Eye,
  Ghost,
  Map,
  MapPinned,
  RadioTower,
  ScrollText,
  Shield,
  Theater,
  UsersRound
} from "lucide-react";

import { AppTopBar } from "@/components/layout/app-top-bar";
import { SectionActionRow } from "@/components/layout/section-action-row";
import { cn } from "@/lib/utils";
import type { SessionCommandState } from "@/lib/session/command-state";
import type { SessionLibrarySummary } from "@/types/library";
import type {
  ExplorerSection,
  MasterMode,
  StageMode
} from "@/types/session";

interface SessionCommandCenterProps {
  sessionCode: string;
  campaignName: string;
  state: SessionCommandState;
  librarySummary: SessionLibrarySummary;
  masterMode: MasterMode;
  supportOpen: boolean;
  libraryWorkspaceActive: boolean;
  onMasterModeChange: (mode: MasterMode) => void;
  onStageModeChange: (mode: StageMode) => void;
  onToggleLibraryWorkspace: () => void;
  onOpenDrawer: (section?: ExplorerSection) => void;
  onOpenStatus: () => void;
  onToggleSupport: () => void;
}

const stageMeta = {
  theater: {
    label: "Palco narrativo",
    icon: Theater
  },
  tactical: {
    label: "Campo tatico",
    icon: Map
  },
  atlas: {
    label: "Wiki da campanha",
    icon: MapPinned
  }
} as const;

export function SessionCommandCenter({
  sessionCode,
  campaignName,
  state,
  librarySummary,
  masterMode,
  supportOpen,
  libraryWorkspaceActive,
  onMasterModeChange,
  onStageModeChange,
  onToggleLibraryWorkspace,
  onOpenDrawer,
  onOpenStatus,
  onToggleSupport
}: SessionCommandCenterProps) {
  const ActiveStageIcon = stageMeta[state.stageMode].icon;
  const eyebrow = (
    <>
      <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
        sala {sessionCode}
      </span>
      <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
        {state.onlinePlayers}/{Math.max(state.totalPresence, state.onlinePlayers)} presentes
      </span>
      <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
        <ActiveStageIcon size={12} />
        {stageMeta[state.stageMode].label}
      </span>
    </>
  );

  return (
    <AppTopBar
      title={campaignName}
      eyebrow={eyebrow}
      actions={
        <>
          {(["prep", "live"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onMasterModeChange(mode)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
                masterMode === mode
                  ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              )}
            >
              {mode === "prep" ? <ScrollText size={14} /> : <RadioTower size={14} />}
              {mode === "prep" ? "preparacao" : "sessao ao vivo"}
            </button>
          ))}
        </>
      }
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <SectionActionRow>
          {(["theater", "tactical", "atlas"] as const).map((mode) => {
            const Icon = stageMeta[mode].icon;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onStageModeChange(mode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.75 text-[9px] font-semibold uppercase tracking-[0.12em] transition",
                  !libraryWorkspaceActive && state.stageMode === mode
                    ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                )}
              >
                <Icon size={14} />
                {stageMeta[mode].label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onToggleLibraryWorkspace}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.75 text-[9px] font-semibold uppercase tracking-[0.12em] transition",
              libraryWorkspaceActive
                ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
            )}
          >
            <BookmarkCheck size={14} />
            Biblioteca
          </button>
        </SectionActionRow>

        <SectionActionRow className="justify-start xl:justify-end">
          <button
            type="button"
            onClick={onToggleSupport}
            className={cn(
              "hud-chip transition",
              supportOpen
                ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-black/18 text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
            )}
          >
            <Eye size={12} />
            apoio
          </button>
          <button
            type="button"
            onClick={onOpenStatus}
            className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            <UsersRound size={12} />
            {state.onlinePlayers} online
          </button>
          <button
            type="button"
            onClick={() => onOpenDrawer("audio")}
            className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            <AudioLines size={12} />
            {state.activeTrackTitle ?? "silencio"}
          </button>
          <button
            type="button"
            onClick={() => onOpenDrawer("effects")}
            className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            <Ghost size={12} />
            {state.totalEffects}
          </button>
          <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
            <Shield size={12} />
            {librarySummary.preparedCount} prontos
          </span>
        </SectionActionRow>
      </div>
    </AppTopBar>
  );
}
