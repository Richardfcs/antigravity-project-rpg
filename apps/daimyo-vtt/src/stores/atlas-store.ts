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
  scopeKey: string | null;
  atlasMaps: SessionAtlasMapRecord[];
  atlasPins: SessionAtlasPinRecord[];
  atlasPinCharacters: SessionAtlasPinCharacterRecord[];
  hasHydrated: boolean;
  hydrateForScope: (
    scopeKey: string,
    atlasMaps: SessionAtlasMapRecord[],
    atlasPins: SessionAtlasPinRecord[],
    atlasPinCharacters: SessionAtlasPinCharacterRecord[]
  ) => void;
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
  scopeKey: null,
  atlasMaps: [],
  atlasPins: [],
  atlasPinCharacters: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, atlasMaps, atlasPins, atlasPinCharacters) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        atlasMaps: sortAtlasMaps(atlasMaps),
        atlasPins: sortAtlasPins(atlasPins),
        atlasPinCharacters: sortAtlasPinCharacters(atlasPinCharacters),
        hasHydrated: true
      };
    }),
  setAtlasMaps: (atlasMaps) =>
    set((state) => ({
      ...state,
      atlasMaps: sortAtlasMaps(atlasMaps),
      hasHydrated: true
    })),
  upsertAtlasMap: (atlasMap) =>
    set((state) => ({
      ...state,
      atlasMaps: sortAtlasMaps([
        ...state.atlasMaps.filter((item) => item.id !== atlasMap.id),
        atlasMap
      ]),
      hasHydrated: true
    })),
  removeAtlasMap: (atlasMapId) =>
    set((state) => ({
      ...state,
      atlasMaps: state.atlasMaps.filter((atlasMap) => atlasMap.id !== atlasMapId),
      atlasPins: state.atlasPins.filter((pin) => pin.atlasMapId !== atlasMapId),
      atlasPinCharacters: state.atlasPinCharacters.filter((link) => {
        const pin = state.atlasPins.find((entry) => entry.id === link.pinId);
        return pin?.atlasMapId !== atlasMapId;
      })
    })),
  setAtlasPins: (atlasPins) =>
    set((state) => ({
      ...state,
      atlasPins: sortAtlasPins(atlasPins),
      hasHydrated: true
    })),
  upsertAtlasPin: (atlasPin) =>
    set((state) => ({
      ...state,
      atlasPins: sortAtlasPins([
        ...state.atlasPins.filter((item) => item.id !== atlasPin.id),
        atlasPin
      ]),
      hasHydrated: true
    })),
  removeAtlasPin: (pinId) =>
    set((state) => ({
      ...state,
      atlasPins: state.atlasPins.filter((pin) => pin.id !== pinId),
      atlasPinCharacters: state.atlasPinCharacters.filter((link) => link.pinId !== pinId)
    })),
  setAtlasPinCharacters: (atlasPinCharacters) =>
    set((state) => ({
      ...state,
      atlasPinCharacters: sortAtlasPinCharacters(atlasPinCharacters),
      hasHydrated: true
    })),
  replaceAtlasPinCharacters: (pinId, atlasPinCharacters) =>
    set((state) => ({
      ...state,
      atlasPinCharacters: sortAtlasPinCharacters([
        ...state.atlasPinCharacters.filter((link) => link.pinId !== pinId),
        ...atlasPinCharacters
      ]),
      hasHydrated: true
    })),
  upsertAtlasPinCharacter: (atlasPinCharacter) =>
    set((state) => ({
      ...state,
      atlasPinCharacters: sortAtlasPinCharacters([
        ...state.atlasPinCharacters.filter((item) => item.id !== atlasPinCharacter.id),
        atlasPinCharacter
      ]),
      hasHydrated: true
    })),
  removeAtlasPinCharacter: (atlasPinCharacterId) =>
    set((state) => ({
      ...state,
      atlasPinCharacters: state.atlasPinCharacters.filter(
        (link) => link.id !== atlasPinCharacterId
      )
    }))
}));
