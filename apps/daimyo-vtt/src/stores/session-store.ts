"use client";

import { create } from "zustand";

import type {
  PresentationMode,
  SessionShellSnapshot,
  SessionViewerIdentity,
  StageMode,
  SyncState
} from "@/types/session";

interface SessionState {
  scopeKey: string | null;
  snapshot: SessionShellSnapshot | null;
  viewer: SessionViewerIdentity | null;
  hasHydrated: boolean;
  hydrateForScope: (input: {
    scopeKey: string;
    snapshot: SessionShellSnapshot;
    viewer: SessionViewerIdentity | null;
    initialSyncState: SyncState;
    initialLatencyLabel?: string;
  }) => void;
  setSnapshot: (snapshot: SessionShellSnapshot) => void;
  patchSnapshot: (patch: Partial<SessionShellSnapshot>) => void;
  setViewer: (viewer: SessionViewerIdentity | null) => void;
  setStageMode: (mode: StageMode) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setSyncState: (syncState: SyncState) => void;
  setLatencyLabel: (latencyLabel: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  scopeKey: null,
  snapshot: null,
  viewer: null,
  hasHydrated: false,
  hydrateForScope: ({
    scopeKey,
    snapshot,
    viewer,
    initialSyncState,
    initialLatencyLabel
  }) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        snapshot: {
          ...snapshot,
          syncState: initialSyncState,
          latencyLabel: initialLatencyLabel ?? snapshot.latencyLabel
        },
        viewer,
        hasHydrated: true
      };
    }),
  setSnapshot: (snapshot) =>
    set((state) => ({ ...state, snapshot, hasHydrated: true })),
  patchSnapshot: (patch) =>
    set((state) =>
      state.snapshot
        ? {
            ...state,
            snapshot: { ...state.snapshot, ...patch },
            hasHydrated: true
          }
        : state
    ),
  setViewer: (viewer) => set((state) => ({ ...state, viewer, hasHydrated: true })),
  setStageMode: (mode) =>
    set((state) =>
      state.snapshot
        ? {
            ...state,
            snapshot: { ...state.snapshot, stageMode: mode },
            hasHydrated: true
          }
        : state
    ),
  setPresentationMode: (mode) =>
    set((state) =>
      state.snapshot
        ? {
            ...state,
            snapshot: { ...state.snapshot, presentationMode: mode },
            hasHydrated: true
          }
        : state
    ),
  setSyncState: (syncState) =>
    set((state) =>
      state.snapshot
        ? {
            ...state,
            snapshot: { ...state.snapshot, syncState },
            hasHydrated: true
          }
        : state
    ),
  setLatencyLabel: (latencyLabel) =>
    set((state) =>
      state.snapshot
        ? {
            ...state,
            snapshot: { ...state.snapshot, latencyLabel },
            hasHydrated: true
          }
        : state
    )
}));
