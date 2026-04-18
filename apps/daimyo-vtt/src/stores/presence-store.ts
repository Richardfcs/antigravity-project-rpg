"use client";

import { create } from "zustand";

import type { OnlinePresence } from "@/types/presence";

interface PresenceState {
  members: OnlinePresence[];
  setMembers: (members: OnlinePresence[]) => void;
  updateMember: (id: string, patch: Partial<OnlinePresence>) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
  updateMember: (id, patch) =>
    set((state) => ({
      members: state.members.map((member) =>
        member.id === id ? { ...member, ...patch } : member
      )
    }))
}));
