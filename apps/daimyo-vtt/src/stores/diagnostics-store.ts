"use client";

import { create } from "zustand";

export interface DiagnosticEntry {
  id: string;
  level: "info" | "warn" | "error";
  source: "window" | "promise" | "session";
  message: string;
  createdAt: string;
}

interface DiagnosticsState {
  entries: DiagnosticEntry[];
  pushEntry: (entry: Omit<DiagnosticEntry, "id" | "createdAt">) => void;
  clearEntries: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  entries: [],
  pushEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          id: `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          ...entry
        },
        ...state.entries
      ].slice(0, 12)
    })),
  clearEntries: () => set({ entries: [] })
}));
