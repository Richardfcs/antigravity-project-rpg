"use client";

import { create } from "zustand";

import type { SessionCharacterRecord } from "@/types/character";

function sortCharacters(characters: SessionCharacterRecord[]) {
  return [...characters].sort((left, right) => {
    if (right.initiative !== left.initiative) {
      return right.initiative - left.initiative;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

interface CharacterState {
  scopeKey: string | null;
  characters: SessionCharacterRecord[];
  hasHydrated: boolean;
  hydrateForScope: (scopeKey: string, characters: SessionCharacterRecord[]) => void;
  setCharacters: (characters: SessionCharacterRecord[]) => void;
  upsertCharacter: (character: SessionCharacterRecord) => void;
  removeCharacter: (characterId: string) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  scopeKey: null,
  characters: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, characters) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        characters: sortCharacters(characters),
        hasHydrated: true
      };
    }),
  setCharacters: (characters) =>
    set((state) => ({
      ...state,
      characters: sortCharacters(characters),
      hasHydrated: true
    })),
  upsertCharacter: (character) =>
    set((state) => ({
      ...state,
      characters: sortCharacters([
        ...state.characters.filter((item) => item.id !== character.id),
        character
      ]),
      hasHydrated: true
    })),
  removeCharacter: (characterId) =>
    set((state) => ({
      ...state,
      characters: state.characters.filter((character) => character.id !== characterId)
    }))
}));
