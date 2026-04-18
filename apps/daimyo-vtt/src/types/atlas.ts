export interface SessionAtlasMapRecord {
  id: string;
  sessionId: string;
  name: string;
  assetId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionAtlasPinRecord {
  id: string;
  sessionId: string;
  atlasMapId: string;
  title: string;
  description: string;
  x: number;
  y: number;
  imageAssetId: string | null;
  submapAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionAtlasPinCharacterRecord {
  id: string;
  sessionId: string;
  pinId: string;
  characterId: string;
  sortOrder: number;
  createdAt: string;
}
