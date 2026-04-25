export type TokenFaction = "ally" | "enemy" | "neutral";

export type TokenStatusPreset =
  | "dead"
  | "poisoned"
  | "sleeping"
  | "wounded"
  | "stunned"
  | "hidden"
  | "burning"
  | "cursed"
  | "collapsed"
  | "below_zero";

export interface SessionMapRecord {
  id: string;
  sessionId: string;
  name: string;
  backgroundAssetId: string | null;
  defaultAllyAssetId: string | null;
  defaultEnemyAssetId: string | null;
  defaultNeutralAssetId: string | null;
  gridEnabled: boolean;
  gridSize: number;
  width: number;
  height: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MapTokenRecord {
  id: string;
  sessionId: string;
  mapId: string;
  characterId: string | null;
  label: string;
  assetId: string | null;
  faction: TokenFaction | null;
  statusEffects: TokenStatusPreset[];
  x: number;
  y: number;
  scale: number;
  isVisibleToPlayers: boolean;
  createdAt: string;
  updatedAt: string;
}
