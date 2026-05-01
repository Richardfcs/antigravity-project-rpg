"use client";

import { create } from "zustand";

import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";

function sortScenes(scenes: SessionSceneRecord[]) {
  return [...scenes].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function sortSceneCast(sceneCast: SceneCastRecord[]) {
  return [...sceneCast].sort((left, right) => {
    if (left.sceneId !== right.sceneId) {
      return left.sceneId.localeCompare(right.sceneId);
    }

    if (left.slotOrder !== right.slotOrder) {
      return left.slotOrder - right.slotOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

interface SceneState {
  scopeKey: string | null;
  scenes: SessionSceneRecord[];
  sceneCast: SceneCastRecord[];
  hasHydrated: boolean;
  hydrateForScope: (
    scopeKey: string,
    scenes: SessionSceneRecord[],
    sceneCast: SceneCastRecord[]
  ) => void;
  setScenes: (scenes: SessionSceneRecord[]) => void;
  upsertScene: (scene: SessionSceneRecord) => void;
  removeScene: (sceneId: string) => void;
  setSceneCast: (sceneCast: SceneCastRecord[]) => void;
  upsertSceneCast: (entry: SceneCastRecord) => void;
  removeSceneCast: (sceneCastId: string) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  scopeKey: null,
  scenes: [],
  sceneCast: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, scenes, sceneCast) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        scenes: sortScenes(scenes),
        sceneCast: sortSceneCast(sceneCast),
        hasHydrated: true
      };
    }),
  setScenes: (scenes) =>
    set((state) => ({ ...state, scenes: sortScenes(scenes), hasHydrated: true })),
  upsertScene: (scene) =>
    set((state) => ({
      ...state,
      scenes: sortScenes([
        ...state.scenes.filter((item) => item.id !== scene.id),
        scene
      ]),
      hasHydrated: true
    })),
  removeScene: (sceneId) =>
    set((state) => ({
      ...state,
      scenes: state.scenes.filter((scene) => scene.id !== sceneId),
      sceneCast: state.sceneCast.filter((entry) => entry.sceneId !== sceneId)
    })),
  setSceneCast: (sceneCast) =>
    set((state) => ({
      ...state,
      sceneCast: sortSceneCast(sceneCast),
      hasHydrated: true
    })),
  upsertSceneCast: (entry) =>
    set((state) => ({
      ...state,
      sceneCast: sortSceneCast([
        ...state.sceneCast.filter((item) => item.id !== entry.id),
        entry
      ]),
      hasHydrated: true
    })),
  removeSceneCast: (sceneCastId) =>
    set((state) => ({
      ...state,
      sceneCast: state.sceneCast.filter((entry) => entry.id !== sceneCastId)
    }))
}));
