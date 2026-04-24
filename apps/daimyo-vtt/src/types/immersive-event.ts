export type PrivateEventKind =
  | "panic"
  | "kegare"
  | "secret"
  | "blood"
  | "shake"
  | "combat";

export type SessionEffectPreset =
  | "sunny"
  | "night"
  | "city-night"
  | "rain"
  | "storm"
  | "snow"
  | "sakura"
  | "sand"
  | "kegare-medium"
  | "kegare-max"
  | "injured-light"
  | "injured-heavy"
  | "downed"
  | "tainted-low"
  | "tainted-high"
  | "tainted-max"
  | "calm"
  | "joy"
  | "sad"
  | "silhouette"
  | "whisper-fog"
  | "omen-red"
  | "void-pressure"
  | "fever-dream"
  | "revelation"
  | "dread";

export interface SessionPrivateEventRecord {
  id: string;
  sessionId: string;
  targetParticipantId: string;
  sourceParticipantId: string | null;
  kind: PrivateEventKind;
  title: string;
  body: string;
  imageAssetId: string | null;
  payload: Record<string, unknown> | null;
  intensity: number;
  durationMs: number;
  isConsumed: boolean;
  createdAt: string;
}

export interface SessionEffectLayerRecord {
  id: string;
  sessionId: string;
  targetParticipantId: string | null;
  sourceParticipantId: string | null;
  preset: SessionEffectPreset;
  note: string;
  intensity: number;
  durationMs: number | null;
  expiresAt: string | null;
  createdAt: string;
}
