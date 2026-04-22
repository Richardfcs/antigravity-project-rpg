"use client";

import { create } from "zustand";

import type { SessionMemoryRecord } from "@/types/session-memory";

function sortMemory(events: SessionMemoryRecord[]) {
  return [...events].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

interface SessionMemoryState {
  events: SessionMemoryRecord[];
  setEvents: (events: SessionMemoryRecord[]) => void;
  upsertEvent: (event: SessionMemoryRecord) => void;
  removeEvent: (eventId: string) => void;
}

export const useSessionMemoryStore = create<SessionMemoryState>((set) => ({
  events: [],
  setEvents: (events) => set({ events: sortMemory(events) }),
  upsertEvent: (event) =>
    set((state) => ({
      events: sortMemory([...state.events.filter((item) => item.id !== event.id), event])
    })),
  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId)
    }))
}));
