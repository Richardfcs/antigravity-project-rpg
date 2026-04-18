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
  scenes: SessionSceneRecord[];
  sceneCast: SceneCastRecord[];
  setScenes: (scenes: SessionSceneRecord[]) => void;
  upsertScene: (scene: SessionSceneRecord) => void;
  removeScene: (sceneId: string) => void;
  setSceneCast: (sceneCast: SceneCastRecord[]) => void;
  upsertSceneCast: (entry: SceneCastRecord) => void;
  removeSceneCast: (sceneCastId: string) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  sceneCast: [],
  setScenes: (scenes) => set({ scenes: sortScenes(scenes) }),
  upsertScene: (scene) =>
    set((state) => ({
      scenes: sortScenes([
        ...state.scenes.filter((item) => item.id !== scene.id),
        scene
      ])
    })),
  removeScene: (sceneId) =>
    set((state) => ({
      scenes: state.scenes.filter((scene) => scene.id !== sceneId),
      sceneCast: state.sceneCast.filter((entry) => entry.sceneId !== sceneId)
    })),
  setSceneCast: (sceneCast) => set({ sceneCast: sortSceneCast(sceneCast) }),
  upsertSceneCast: (entry) =>
    set((state) => ({
      sceneCast: sortSceneCast([
        ...state.sceneCast.filter((item) => item.id !== entry.id),
        entry
      ])
    })),
  removeSceneCast: (sceneCastId) =>
    set((state) => ({
      sceneCast: state.sceneCast.filter((entry) => entry.id !== sceneCastId)
    }))
}));
