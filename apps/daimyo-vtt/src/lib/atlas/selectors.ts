import type { SessionAssetRecord } from "@/types/asset";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";
import type { SessionCharacterRecord } from "@/types/character";

export interface AtlasStagePin {
  pin: SessionAtlasPinRecord;
  imageAsset: SessionAssetRecord | null;
  submapAsset: SessionAssetRecord | null;
  linkedCharacters: SessionCharacterRecord[];
  linkedCharacterAssets: Array<SessionAssetRecord | null>;
}

export function canPlayerSeeAtlasPin(pin: SessionAtlasPinRecord) {
  return pin.isVisibleToPlayers || pin.isNameVisibleToPlayers;
}

export function filterAtlasPinsForViewer(
  atlasPins: SessionAtlasPinRecord[],
  canRevealAll: boolean
) {
  return canRevealAll ? atlasPins : atlasPins.filter(canPlayerSeeAtlasPin);
}

export function sortAtlasMaps(atlasMaps: SessionAtlasMapRecord[]) {
  return [...atlasMaps].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
}

export function sortAtlasPins(atlasPins: SessionAtlasPinRecord[]) {
  return [...atlasPins].sort((left, right) => {
    if (left.atlasMapId !== right.atlasMapId) {
      return left.atlasMapId.localeCompare(right.atlasMapId);
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function findActiveAtlasMap(
  atlasMaps: SessionAtlasMapRecord[],
  activeAtlasMapId?: string | null
) {
  const orderedAtlasMaps = sortAtlasMaps(atlasMaps);

  if (activeAtlasMapId) {
    const activeAtlasMap = orderedAtlasMaps.find(
      (atlasMap) => atlasMap.id === activeAtlasMapId
    );

    if (activeAtlasMap) {
      return activeAtlasMap;
    }
  }

  return (
    orderedAtlasMaps.find((atlasMap) => atlasMap.isActive) ??
    orderedAtlasMaps[0] ??
    null
  );
}

export function listAtlasStagePins(
  atlasMapId: string,
  atlasPins: SessionAtlasPinRecord[],
  assets: SessionAssetRecord[],
  atlasPinCharacters: SessionAtlasPinCharacterRecord[] = [],
  characters: SessionCharacterRecord[] = []
) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const));
  const characterById = new Map(
    characters.map((character) => [character.id, character] as const)
  );
  const linkedCharactersByPinId = new Map<string, SessionCharacterRecord[]>();

  for (const link of atlasPinCharacters) {
    const linkedCharacter = characterById.get(link.characterId);

    if (!linkedCharacter) {
      continue;
    }

    const current = linkedCharactersByPinId.get(link.pinId) ?? [];
    current.push(linkedCharacter);
    linkedCharactersByPinId.set(link.pinId, current);
  }

  return sortAtlasPins(atlasPins.filter((pin) => pin.atlasMapId === atlasMapId)).map((pin) => ({
    pin,
    imageAsset: pin.imageAssetId ? assetById.get(pin.imageAssetId) ?? null : null,
    submapAsset: pin.submapAssetId ? assetById.get(pin.submapAssetId) ?? null : null,
    linkedCharacters: linkedCharactersByPinId.get(pin.id) ?? [],
    linkedCharacterAssets: (linkedCharactersByPinId.get(pin.id) ?? [])
      .map((character) =>
        character.assetId ? assetById.get(character.assetId) ?? null : null
      )
  })) satisfies AtlasStagePin[];
}
