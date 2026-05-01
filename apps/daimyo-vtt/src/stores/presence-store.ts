"use client";

import { create } from "zustand";

import type { OnlinePresence } from "@/types/presence";

interface PresenceState {
  scopeKey: string | null;
  members: OnlinePresence[];
  hasHydrated: boolean;
  hydrateForScope: (scopeKey: string, members: OnlinePresence[]) => void;
  setMembers: (members: OnlinePresence[]) => void;
  updateMember: (id: string, patch: Partial<OnlinePresence>) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  scopeKey: null,
  members: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, members) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return { scopeKey, members, hasHydrated: true };
    }),
  setMembers: (members) => set((state) => ({ ...state, members, hasHydrated: true })),
  updateMember: (id, patch) =>
    set((state) => ({
      ...state,
      members: state.members.map((member) =>
        member.id === id ? { ...member, ...patch } : member
      ),
      hasHydrated: true
    }))
}));
