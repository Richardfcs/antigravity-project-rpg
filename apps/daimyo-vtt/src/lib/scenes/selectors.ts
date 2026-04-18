import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";

export interface SceneStageEntry {
  entry: SceneCastRecord;
  character: SessionCharacterRecord;
  asset: SessionAssetRecord | null;
}

export function sortScenesByOrder(scenes: SessionSceneRecord[]) {
  return [...scenes].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function sortSceneCastBySlot(sceneCast: SceneCastRecord[]) {
  return [...sceneCast].sort((left, right) => {
    if (left.slotOrder !== right.slotOrder) {
      return left.slotOrder - right.slotOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function findActiveScene(
  scenes: SessionSceneRecord[],
  activeSceneId?: string | null
) {
  const orderedScenes = sortScenesByOrder(scenes);

  if (activeSceneId) {
    const activeScene = orderedScenes.find((scene) => scene.id === activeSceneId);

    if (activeScene) {
      return activeScene;
    }
  }

  return orderedScenes.find((scene) => scene.isActive) ?? orderedScenes[0] ?? null;
}

export function listSceneCastEntries(
  sceneId: string,
  sceneCast: SceneCastRecord[],
  characters: SessionCharacterRecord[],
  assets: SessionAssetRecord[]
) {
  const characterById = new Map(
    characters.map((character) => [character.id, character] as const)
  );
  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const));

  return sortSceneCastBySlot(
    sceneCast.filter((entry) => entry.sceneId === sceneId)
  )
    .map((entry) => {
      const character = characterById.get(entry.characterId);

      if (!character) {
        return null;
      }

      return {
        entry,
        character,
        asset: character.assetId ? (assetById.get(character.assetId) ?? null) : null
      } satisfies SceneStageEntry;
    })
    .filter(Boolean) as SceneStageEntry[];
}

export function findSpotlightEntry(entries: SceneStageEntry[]) {
  return entries.find((entry) => entry.entry.isSpotlighted) ?? entries[0] ?? null;
}
