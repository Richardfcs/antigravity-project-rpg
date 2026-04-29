"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  DockTab,
  ExplorerSection,
  MasterDrawer,
  MasterMode,
  MasterWorkspace,
  PlayerBottomTab,
  PlayerOverlay
} from "@/types/session";

const DEFAULT_MASTER_COLUMNS = {
  explorer: 24,
  center: 52,
  inspector: 24
} as const;

const DEFAULT_MASTER_ROWS = {
  stage: 72,
  dock: 28
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMasterColumns(
  sizes?: Partial<Record<keyof typeof DEFAULT_MASTER_COLUMNS, number>>
) {
  if (!sizes) {
    return DEFAULT_MASTER_COLUMNS;
  }

  const explorer = clamp(
    Number.isFinite(sizes.explorer) ? Number(sizes.explorer) : DEFAULT_MASTER_COLUMNS.explorer,
    18,
    30
  );
  const inspector = clamp(
    Number.isFinite(sizes.inspector) ? Number(sizes.inspector) : DEFAULT_MASTER_COLUMNS.inspector,
    18,
    30
  );
  const center = 100 - explorer - inspector;

  if (center < 40) {
    return DEFAULT_MASTER_COLUMNS;
  }

  return {
    explorer,
    center,
    inspector
  };
}

function normalizeMasterRows(
  sizes?: Partial<Record<keyof typeof DEFAULT_MASTER_ROWS, number>>
) {
  if (!sizes) {
    return DEFAULT_MASTER_ROWS;
  }

  const stage = clamp(
    Number.isFinite(sizes.stage) ? Number(sizes.stage) : DEFAULT_MASTER_ROWS.stage,
    56,
    82
  );
  const dock = 100 - stage;

  if (dock < 18) {
    return DEFAULT_MASTER_ROWS;
  }

  return {
    stage,
    dock
  };
}

function normalizeDockTab(tab?: string): DockTab {
  if (
    tab === "chat" ||
    tab === "dice" ||
    tab === "audio" ||
    tab === "notes" ||
    tab === "codex" ||
    tab === "sheet"
  ) {
    return tab;
  }

  return "chat";
}

type PersistedUiShellState = Partial<{
  activeSection: ExplorerSection;
  activeDockTab: DockTab;
  masterMode: MasterMode;
  masterWorkspace: MasterWorkspace;
  masterDrawer: MasterDrawer;
  supportTrayOpen: boolean;
  liveSupportOpen: boolean;
  followMaster: boolean;
  playerBottomTab: PlayerBottomTab;
  playerOverlay: PlayerOverlay;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  masterColumns: Partial<Record<keyof typeof DEFAULT_MASTER_COLUMNS, number>>;
  masterRows: Partial<Record<keyof typeof DEFAULT_MASTER_ROWS, number>>;
}>;

interface UiShellState {
  activeSection: ExplorerSection;
  activeDockTab: DockTab;
  masterMode: MasterMode;
  masterWorkspace: MasterWorkspace;
  masterDrawer: MasterDrawer;
  supportTrayOpen: boolean;
  liveSupportOpen: boolean;
  followMaster: boolean;
  playerBottomTab: PlayerBottomTab;
  playerOverlay: PlayerOverlay;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  masterColumns: Record<string, number>;
  masterRows: Record<string, number>;
  setActiveSection: (section: ExplorerSection) => void;
  setActiveDockTab: (tab: DockTab) => void;
  setMasterMode: (mode: MasterMode) => void;
  setMasterWorkspace: (workspace: MasterWorkspace) => void;
  setMasterDrawer: (drawer: MasterDrawer) => void;
  setSupportTrayOpen: (open: boolean) => void;
  setLiveSupportOpen: (open: boolean) => void;
  setFollowMaster: (followMaster: boolean) => void;
  setPlayerBottomTab: (tab: PlayerBottomTab) => void;
  setPlayerOverlay: (overlay: PlayerOverlay) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleBottom: () => void;
  setMasterColumns: (sizes: Record<string, number>) => void;
  setMasterRows: (sizes: Record<string, number>) => void;
  resetMasterLayout: () => void;
}

export const useUiShellStore = create<UiShellState>()(
  persist(
    (set) => ({
      activeSection: "scenes",
      activeDockTab: "chat",
      masterMode: "prep",
      masterWorkspace: "library",
      masterDrawer: "closed",
      supportTrayOpen: false,
      liveSupportOpen: false,
      followMaster: true,
      playerBottomTab: "stage",
      playerOverlay: "none",
      leftCollapsed: false,
      rightCollapsed: false,
      bottomCollapsed: false,
      masterColumns: DEFAULT_MASTER_COLUMNS,
      masterRows: DEFAULT_MASTER_ROWS,
      setActiveSection: (section) => set({ activeSection: section }),
      setActiveDockTab: (tab) => set({ activeDockTab: normalizeDockTab(tab) }),
      setMasterMode: (masterMode) => set({ masterMode }),
      setMasterWorkspace: (masterWorkspace) => set({ masterWorkspace }),
      setMasterDrawer: (masterDrawer) => set({ masterDrawer }),
      setSupportTrayOpen: (supportTrayOpen) => set({ supportTrayOpen, liveSupportOpen: supportTrayOpen }),
      setLiveSupportOpen: (liveSupportOpen) => set({ liveSupportOpen }),
      setFollowMaster: (followMaster) => set({ followMaster }),
      setPlayerBottomTab: (playerBottomTab) => set({ playerBottomTab }),
      setPlayerOverlay: (playerOverlay) => set({ playerOverlay }),
      toggleLeft: () => set((state) => ({ leftCollapsed: !state.leftCollapsed })),
      toggleRight: () =>
        set((state) => ({ rightCollapsed: !state.rightCollapsed })),
      toggleBottom: () =>
        set((state) => ({ bottomCollapsed: !state.bottomCollapsed })),
      setMasterColumns: (sizes) =>
        set({
          masterColumns: normalizeMasterColumns(
            sizes as Partial<Record<keyof typeof DEFAULT_MASTER_COLUMNS, number>>
          )
        }),
      setMasterRows: (sizes) =>
        set({
          masterRows: normalizeMasterRows(
            sizes as Partial<Record<keyof typeof DEFAULT_MASTER_ROWS, number>>
          )
        }),
      resetMasterLayout: () =>
        set({
          leftCollapsed: false,
          rightCollapsed: false,
          bottomCollapsed: false,
          masterColumns: DEFAULT_MASTER_COLUMNS,
          masterRows: DEFAULT_MASTER_ROWS
        })
    }),
    {
      name: "daimyo-vtt-ui-shell",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as PersistedUiShellState;

        return {
          activeSection: state.activeSection ?? "scenes",
          activeDockTab: normalizeDockTab(state.activeDockTab),
          masterMode: state.masterMode === "live" ? "live" : "prep",
          masterWorkspace:
            state.masterWorkspace === "stage" ? "stage" : "library",
          masterDrawer:
            state.masterDrawer && state.masterDrawer !== "closed"
              ? state.masterDrawer
              : "closed",
          supportTrayOpen: state.supportTrayOpen ?? state.liveSupportOpen ?? false,
          liveSupportOpen: state.liveSupportOpen ?? false,
          followMaster: state.followMaster ?? true,
          playerBottomTab: state.playerBottomTab ?? "stage",
          playerOverlay: state.playerOverlay ?? "none",
          leftCollapsed: state.leftCollapsed ?? false,
          rightCollapsed: state.rightCollapsed ?? false,
          bottomCollapsed: state.bottomCollapsed ?? false,
          masterColumns: normalizeMasterColumns(state.masterColumns),
          masterRows: normalizeMasterRows(state.masterRows)
        };
      }
    }
  )
);
