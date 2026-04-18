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
  snapshot: SessionShellSnapshot | null;
  viewer: SessionViewerIdentity | null;
  setSnapshot: (snapshot: SessionShellSnapshot) => void;
  patchSnapshot: (patch: Partial<SessionShellSnapshot>) => void;
  setViewer: (viewer: SessionViewerIdentity | null) => void;
  setStageMode: (mode: StageMode) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setSyncState: (syncState: SyncState) => void;
  setLatencyLabel: (latencyLabel: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  snapshot: null,
  viewer: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  patchSnapshot: (patch) =>
    set((state) =>
      state.snapshot
        ? { snapshot: { ...state.snapshot, ...patch } }
        : state
    ),
  setViewer: (viewer) => set({ viewer }),
  setStageMode: (mode) =>
    set((state) =>
      state.snapshot
        ? { snapshot: { ...state.snapshot, stageMode: mode } }
        : state
    ),
  setPresentationMode: (mode) =>
    set((state) =>
      state.snapshot
        ? { snapshot: { ...state.snapshot, presentationMode: mode } }
        : state
    ),
  setSyncState: (syncState) =>
    set((state) =>
      state.snapshot
        ? { snapshot: { ...state.snapshot, syncState } }
        : state
    ),
  setLatencyLabel: (latencyLabel) =>
    set((state) =>
      state.snapshot
        ? { snapshot: { ...state.snapshot, latencyLabel } }
        : state
    )
}));
