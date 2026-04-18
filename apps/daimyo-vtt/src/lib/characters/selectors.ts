import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";

export function sortCharactersByInitiative(
  characters: SessionCharacterRecord[]
) {
  return [...characters].sort((left, right) => {
    if (right.initiative !== left.initiative) {
      return right.initiative - left.initiative;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function resolveCharacterAsset(
  character: SessionCharacterRecord,
  assets: SessionAssetRecord[]
) {
  return assets.find((asset) => asset.id === character.assetId) ?? null;
}

export function findCharacterByViewer(
  characters: SessionCharacterRecord[],
  participantId?: string | null
) {
  if (!participantId) {
    return null;
  }

  return (
    characters.find((character) => character.ownerParticipantId === participantId) ??
    null
  );
}
