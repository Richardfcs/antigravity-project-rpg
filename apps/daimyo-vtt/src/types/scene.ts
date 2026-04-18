export type SceneLayoutMode = "line" | "arc" | "grid" | "center";

export interface SessionSceneRecord {
  id: string;
  sessionId: string;
  name: string;
  backgroundAssetId: string | null;
  moodLabel: string;
  layoutMode: SceneLayoutMode;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneCastRecord {
  id: string;
  sessionId: string;
  sceneId: string;
  characterId: string;
  slotOrder: number;
  isSpotlighted: boolean;
  createdAt: string;
}
