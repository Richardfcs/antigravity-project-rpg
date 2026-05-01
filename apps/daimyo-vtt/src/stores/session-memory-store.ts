"use client";

import { create } from "zustand";

import type { SessionMemoryRecord } from "@/types/session-memory";

function sortMemory(events: SessionMemoryRecord[]) {
  return [...events].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

interface SessionMemoryState {
  scopeKey: string | null;
  events: SessionMemoryRecord[];
  hasHydrated: boolean;
  hydrateForScope: (scopeKey: string, events: SessionMemoryRecord[]) => void;
  setEvents: (events: SessionMemoryRecord[]) => void;
  upsertEvent: (event: SessionMemoryRecord) => void;
  removeEvent: (eventId: string) => void;
}

export const useSessionMemoryStore = create<SessionMemoryState>((set) => ({
  scopeKey: null,
  events: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, events) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return { scopeKey, events: sortMemory(events), hasHydrated: true };
    }),
  setEvents: (events) =>
    set((state) => ({ ...state, events: sortMemory(events), hasHydrated: true })),
  upsertEvent: (event) =>
    set((state) => ({
      ...state,
      events: sortMemory([...state.events.filter((item) => item.id !== event.id), event]),
      hasHydrated: true
    })),
  removeEvent: (eventId) =>
    set((state) => ({
      ...state,
      events: state.events.filter((event) => event.id !== eventId)
    }))
}));
