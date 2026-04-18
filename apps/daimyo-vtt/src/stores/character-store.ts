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
  characters: SessionCharacterRecord[];
  setCharacters: (characters: SessionCharacterRecord[]) => void;
  upsertCharacter: (character: SessionCharacterRecord) => void;
  removeCharacter: (characterId: string) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  setCharacters: (characters) => set({ characters: sortCharacters(characters) }),
  upsertCharacter: (character) =>
    set((state) => ({
      characters: sortCharacters([
        ...state.characters.filter((item) => item.id !== character.id),
        character
      ])
    })),
  removeCharacter: (characterId) =>
    set((state) => ({
      characters: state.characters.filter((character) => character.id !== characterId)
    }))
}));
