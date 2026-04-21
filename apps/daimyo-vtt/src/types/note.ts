export type SessionNoteKind = "scene" | "map" | "atlas" | "journal";

export interface SessionNoteRecord {
  id: string;
  sessionId: string;
  authorParticipantId: string;
  kind: SessionNoteKind;
  scopeKey: string;
  title: string;
  body: string;
  sceneId: string | null;
  mapId: string | null;
  atlasMapId: string | null;
  createdAt: string;
  updatedAt: string;
}
