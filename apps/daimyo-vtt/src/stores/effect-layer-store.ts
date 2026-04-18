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
  effects: SessionEffectLayerRecord[];
  previewEffect: SessionEffectLayerRecord | null;
  setEffects: (effects: SessionEffectLayerRecord[]) => void;
  upsertEffect: (effect: SessionEffectLayerRecord) => void;
  removeEffect: (effectId: string) => void;
  pruneExpired: (now?: number) => void;
  setPreviewEffect: (effect: SessionEffectLayerRecord | null) => void;
}

export const useEffectLayerStore = create<EffectLayerState>((set) => ({
  effects: [],
  previewEffect: null,
  setEffects: (effects) =>
    set({ effects: sortEffects(effects.filter((effect) => isVisible(effect))) }),
  upsertEffect: (effect) =>
    set((state) => ({
      effects: sortEffects(
        [...state.effects.filter((item) => item.id !== effect.id), effect].filter((item) =>
          isVisible(item)
        )
      )
    })),
  removeEffect: (effectId) =>
    set((state) => ({
      effects: state.effects.filter((effect) => effect.id !== effectId)
    })),
  pruneExpired: (now = Date.now()) =>
    set((state) => ({
      effects: state.effects.filter((effect) => isVisible(effect, now))
    })),
  setPreviewEffect: (effect) => set({ previewEffect: effect })
}));
