export type AudioSourceType = "upload";
export type AudioPlaybackStatus = "playing" | "paused" | "stopped";

export interface SessionAudioTrackRecord {
  id: string;
  sessionId: string;
  title: string;
  sourceType: AudioSourceType;
  sourceUrl: string;
  sourcePublicId: string;
  cloudinaryResourceType: "video";
  mimeType: string | null;
  originalFilename: string | null;
  durationSeconds: number | null;
  playlistName: string;
  sortOrder: number;
  createdAt: string;
}

export interface SessionAudioStateRecord {
  sessionId: string;
  trackId: string | null;
  status: AudioPlaybackStatus;
  volume: number;
  loopEnabled: boolean;
  startedAt: string | null;
  positionSeconds: number;
  updatedAt: string;
}
