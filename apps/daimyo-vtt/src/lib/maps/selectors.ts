import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";

export interface TacticalStageToken {
  token: MapTokenRecord;
  character: SessionCharacterRecord | null;
  asset: SessionAssetRecord | null;
  label: string;
  ownerParticipantId: string | null;
  initiative: number;
}

export interface TacticalCombatStateView {
  enabled: boolean;
  round: number;
  activeTokenId: string | null;
  activeIndex: number;
  totalTurns: number;
  activeEntry: TacticalStageToken | null;
  turnOrder: TacticalStageToken[];
}

export function sortMaps(maps: SessionMapRecord[]) {
  return [...maps].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
}

export function sortMapTokens(tokens: MapTokenRecord[]) {
  return [...tokens].sort((left, right) => {
    if (left.mapId !== right.mapId) {
      return left.mapId.localeCompare(right.mapId);
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function findActiveMap(maps: SessionMapRecord[], activeMapId?: string | null) {
  const orderedMaps = sortMaps(maps);

  if (activeMapId) {
    const activeMap = orderedMaps.find((map) => map.id === activeMapId);

    if (activeMap) {
      return activeMap;
    }
  }

  return orderedMaps.find((map) => map.isActive) ?? orderedMaps[0] ?? null;
}

export function listMapStageTokens(
  mapId: string,
  mapTokens: MapTokenRecord[],
  characters: SessionCharacterRecord[],
  assets: SessionAssetRecord[]
) {
  const characterById = new Map(
    characters.map((character) => [character.id, character] as const)
  );
  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const));

  return sortMapTokens(mapTokens.filter((token) => token.mapId === mapId))
    .map((token) => {
      const character = token.characterId ? (characterById.get(token.characterId) ?? null) : null;

      const asset =
        (token.assetId ? assetById.get(token.assetId) : null) ??
        (character?.assetId ? assetById.get(character.assetId) : null) ??
        null;

      return {
        token,
        character,
        asset,
        label: token.label || character?.name || "Token",
        ownerParticipantId: character?.ownerParticipantId ?? null,
        initiative: character?.initiative ?? 0
      } satisfies TacticalStageToken;
    })
    .filter(Boolean) as TacticalStageToken[];
}

export function buildTacticalCombatState(options: {
  enabled: boolean;
  round: number;
  turnIndex: number;
  activeTokenId: string | null;
  entries: TacticalStageToken[];
}): TacticalCombatStateView {
  const turnOrder = [...options.entries].sort((left, right) => {
    if (left.initiative !== right.initiative) {
      return right.initiative - left.initiative;
    }

    if (left.label !== right.label) {
      return left.label.localeCompare(right.label);
    }

    return left.token.createdAt.localeCompare(right.token.createdAt);
  });

  if (turnOrder.length === 0) {
    return {
      enabled: options.enabled,
      round: Math.max(1, options.round),
      activeTokenId: null,
      activeIndex: 0,
      totalTurns: 0,
      activeEntry: null,
      turnOrder: []
    };
  }

  const indexedActiveEntry = options.activeTokenId
    ? turnOrder.findIndex((entry) => entry.token.id === options.activeTokenId)
    : -1;
  const safeIndex =
    indexedActiveEntry >= 0
      ? indexedActiveEntry
      : Math.min(Math.max(options.turnIndex, 0), turnOrder.length - 1);
  const activeEntry = turnOrder[safeIndex] ?? null;

  return {
    enabled: options.enabled,
    round: Math.max(1, options.round),
    activeTokenId: activeEntry?.token.id ?? null,
    activeIndex: safeIndex,
    totalTurns: turnOrder.length,
    activeEntry,
    turnOrder
  };
}
