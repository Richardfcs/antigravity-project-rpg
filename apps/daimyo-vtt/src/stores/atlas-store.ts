"use client";

import { create } from "zustand";

import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";

function sortAtlasMaps(atlasMaps: SessionAtlasMapRecord[]) {
  return [...atlasMaps].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function sortAtlasPins(atlasPins: SessionAtlasPinRecord[]) {
  return [...atlasPins].sort((left, right) => {
    if (left.atlasMapId !== right.atlasMapId) {
      return left.atlasMapId.localeCompare(right.atlasMapId);
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function sortAtlasPinCharacters(atlasPinCharacters: SessionAtlasPinCharacterRecord[]) {
  return [...atlasPinCharacters].sort((left, right) => {
    if (left.pinId !== right.pinId) {
      return left.pinId.localeCompare(right.pinId);
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

interface AtlasState {
  atlasMaps: SessionAtlasMapRecord[];
  atlasPins: SessionAtlasPinRecord[];
  atlasPinCharacters: SessionAtlasPinCharacterRecord[];
  setAtlasMaps: (atlasMaps: SessionAtlasMapRecord[]) => void;
  upsertAtlasMap: (atlasMap: SessionAtlasMapRecord) => void;
  removeAtlasMap: (atlasMapId: string) => void;
  setAtlasPins: (atlasPins: SessionAtlasPinRecord[]) => void;
  upsertAtlasPin: (atlasPin: SessionAtlasPinRecord) => void;
  removeAtlasPin: (pinId: string) => void;
  setAtlasPinCharacters: (atlasPinCharacters: SessionAtlasPinCharacterRecord[]) => void;
  replaceAtlasPinCharacters: (
    pinId: string,
    atlasPinCharacters: SessionAtlasPinCharacterRecord[]
  ) => void;
  upsertAtlasPinCharacter: (atlasPinCharacter: SessionAtlasPinCharacterRecord) => void;
  removeAtlasPinCharacter: (atlasPinCharacterId: string) => void;
}

export const useAtlasStore = create<AtlasState>((set) => ({
  atlasMaps: [],
  atlasPins: [],
  atlasPinCharacters: [],
  setAtlasMaps: (atlasMaps) => set({ atlasMaps: sortAtlasMaps(atlasMaps) }),
  upsertAtlasMap: (atlasMap) =>
    set((state) => ({
      atlasMaps: sortAtlasMaps([...state.atlasMaps.filter((item) => item.id !== atlasMap.id), atlasMap])
    })),
  removeAtlasMap: (atlasMapId) =>
    set((state) => ({
      atlasMaps: state.atlasMaps.filter((atlasMap) => atlasMap.id !== atlasMapId),
      atlasPins: state.atlasPins.filter((pin) => pin.atlasMapId !== atlasMapId),
      atlasPinCharacters: state.atlasPinCharacters.filter((link) => {
        const pin = state.atlasPins.find((entry) => entry.id === link.pinId);
        return pin?.atlasMapId !== atlasMapId;
      })
    })),
  setAtlasPins: (atlasPins) => set({ atlasPins: sortAtlasPins(atlasPins) }),
  upsertAtlasPin: (atlasPin) =>
    set((state) => ({
      atlasPins: sortAtlasPins([...state.atlasPins.filter((item) => item.id !== atlasPin.id), atlasPin])
    })),
  removeAtlasPin: (pinId) =>
    set((state) => ({
      atlasPins: state.atlasPins.filter((pin) => pin.id !== pinId),
      atlasPinCharacters: state.atlasPinCharacters.filter((link) => link.pinId !== pinId)
    })),
  setAtlasPinCharacters: (atlasPinCharacters) =>
    set({ atlasPinCharacters: sortAtlasPinCharacters(atlasPinCharacters) }),
  replaceAtlasPinCharacters: (pinId, atlasPinCharacters) =>
    set((state) => ({
      atlasPinCharacters: sortAtlasPinCharacters([
        ...state.atlasPinCharacters.filter((link) => link.pinId !== pinId),
        ...atlasPinCharacters
      ])
    })),
  upsertAtlasPinCharacter: (atlasPinCharacter) =>
    set((state) => ({
      atlasPinCharacters: sortAtlasPinCharacters([
        ...state.atlasPinCharacters.filter((item) => item.id !== atlasPinCharacter.id),
        atlasPinCharacter
      ])
    })),
  removeAtlasPinCharacter: (atlasPinCharacterId) =>
    set((state) => ({
      atlasPinCharacters: state.atlasPinCharacters.filter(
        (link) => link.id !== atlasPinCharacterId
      )
    }))
}));
