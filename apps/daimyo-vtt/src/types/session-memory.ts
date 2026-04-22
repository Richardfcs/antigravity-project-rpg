import type { StageMode } from "@/types/session";

export type SessionMemoryCategory = "stage" | "atlas" | "audio" | "private-event";

export interface SessionMemoryRecord {
  id: string;
  sessionId: string;
  actorParticipantId: string | null;
  targetParticipantId: string | null;
  category: SessionMemoryCategory;
  title: string;
  detail: string;
  stageMode: StageMode | null;
  atlasMapId: string | null;
  atlasPinId: string | null;
  audioTrackId: string | null;
  createdAt: string;
}
