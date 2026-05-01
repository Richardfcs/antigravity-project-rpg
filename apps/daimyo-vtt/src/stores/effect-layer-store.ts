"use client";

import { create } from "zustand";

import type { SessionEffectLayerRecord } from "@/types/immersive-event";

function sortEffects(effects: SessionEffectLayerRecord[]) {
  return [...effects].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function isVisible(effect: SessionEffectLayerRecord, now = Date.now()) {
  if (!effect.expiresAt) {
    return true;
  }

  return new Date(effect.expiresAt).getTime() > now;
}

interface EffectLayerState {
  scopeKey: string | null;
  effects: SessionEffectLayerRecord[];
  previewEffect: SessionEffectLayerRecord | null;
  hasHydrated: boolean;
  hydrateForScope: (scopeKey: string, effects: SessionEffectLayerRecord[]) => void;
  setEffects: (effects: SessionEffectLayerRecord[]) => void;
  upsertEffect: (effect: SessionEffectLayerRecord) => void;
  removeEffect: (effectId: string) => void;
  pruneExpired: (now?: number) => void;
  setPreviewEffect: (effect: SessionEffectLayerRecord | null) => void;
}

export const useEffectLayerStore = create<EffectLayerState>((set) => ({
  scopeKey: null,
  effects: [],
  previewEffect: null,
  hasHydrated: false,
  hydrateForScope: (scopeKey, effects) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        effects: sortEffects(effects.filter((effect) => isVisible(effect))),
        previewEffect: null,
        hasHydrated: true
      };
    }),
  setEffects: (effects) =>
    set((state) => ({
      ...state,
      effects: sortEffects(effects.filter((effect) => isVisible(effect))),
      hasHydrated: true
    })),
  upsertEffect: (effect) =>
    set((state) => ({
      ...state,
      effects: sortEffects(
        [...state.effects.filter((item) => item.id !== effect.id), effect].filter((item) =>
          isVisible(item)
        )
      ),
      hasHydrated: true
    })),
  removeEffect: (effectId) =>
    set((state) => ({
      ...state,
      effects: state.effects.filter((effect) => effect.id !== effectId)
    })),
  pruneExpired: (now = Date.now()) =>
    set((state) => ({
      ...state,
      effects: state.effects.filter((effect) => isVisible(effect, now))
    })),
  setPreviewEffect: (effect) => set((state) => ({ ...state, previewEffect: effect }))
}));
