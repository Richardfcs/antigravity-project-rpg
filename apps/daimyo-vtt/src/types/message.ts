export type SessionMessageKind = "chat" | "roll" | "system";

export interface SessionMessageRecord {
  id: string;
  sessionId: string;
  participantId: string | null;
  displayName: string;
  kind: SessionMessageKind;
  body: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RollPayload {
  formula: string;
  dice: number[];
  modifier: number;
  total: number;
  target?: number | null;
  margin?: number | null;
  outcome?: string | null;
  label?: string | null;
}
