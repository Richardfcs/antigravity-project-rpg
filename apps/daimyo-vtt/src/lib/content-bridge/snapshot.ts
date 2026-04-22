import type { SessionAssetRecord } from "@/types/asset";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";
import type {
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";
import type { SessionCharacterRecord } from "@/types/character";
import type { SessionEffectLayerRecord } from "@/types/immersive-event";
import type { SessionMapRecord, MapTokenRecord } from "@/types/map";
import type { SessionMessageRecord } from "@/types/message";
import type { SessionMemoryRecord } from "@/types/session-memory";
import type { SessionNoteRecord } from "@/types/note";
import type { SceneCastRecord, SessionSceneRecord } from "@/types/scene";
import type { SessionShellSnapshot } from "@/types/session";

import { daimyoContentBridge } from "@/lib/content-bridge/contract";

export interface SessionSnapshotExportPayload {
  manifest: ReturnType<typeof daimyoContentBridge.defaultManifest>;
  exportedAt: string;
  sessionCode: string;
  snapshot: SessionShellSnapshot;
  assets: SessionAssetRecord[];
  characters: SessionCharacterRecord[];
  scenes: SessionSceneRecord[];
  sceneCast: SceneCastRecord[];
  maps: SessionMapRecord[];
  mapTokens: MapTokenRecord[];
  atlasMaps: SessionAtlasMapRecord[];
  atlasPins: SessionAtlasPinRecord[];
  atlasPinCharacters: SessionAtlasPinCharacterRecord[];
  tracks: SessionAudioTrackRecord[];
  playback: SessionAudioStateRecord | null;
  messages: SessionMessageRecord[];
  effects: SessionEffectLayerRecord[];
  notes: SessionNoteRecord[];
  memoryEvents: SessionMemoryRecord[];
}

interface SessionSnapshotContract {
  createSessionSnapshotFilename: (sessionCode: string) => string;
  isSessionSnapshotPayload: (rawPayload: unknown) => boolean;
  normalizeSessionSnapshotPayload: (
    rawPayload: unknown
  ) => SessionSnapshotExportPayload;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawContract = require("../../../../../shared/daimyo-session-snapshot.js") as SessionSnapshotContract;

export const daimyoSessionSnapshot = rawContract;

export function buildSessionSnapshotPayload(
  input: Omit<SessionSnapshotExportPayload, "manifest" | "exportedAt">
): SessionSnapshotExportPayload {
  return {
    manifest: daimyoContentBridge.defaultManifest("vtt"),
    exportedAt: new Date().toISOString(),
    ...input
  };
}
