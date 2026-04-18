"use client";

import { create } from "zustand";

import type { SessionPrivateEventRecord } from "@/types/immersive-event";

function sortEvents(events: SessionPrivateEventRecord[]) {
  return [...events].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

interface ImmersiveEventState {
  events: SessionPrivateEventRecord[];
  setEvents: (events: SessionPrivateEventRecord[]) => void;
  upsertEvent: (event: SessionPrivateEventRecord) => void;
  removeEvent: (eventId: string) => void;
}

export const useImmersiveEventStore = create<ImmersiveEventState>((set) => ({
  events: [],
  setEvents: (events) => set({ events: sortEvents(events.filter((event) => !event.isConsumed)) }),
  upsertEvent: (event) =>
    set((state) => ({
      events: event.isConsumed
        ? state.events.filter((item) => item.id !== event.id)
        : sortEvents([...state.events.filter((item) => item.id !== event.id), event])
    })),
  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId)
    }))
}));
