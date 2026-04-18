export type PresenceRole = "gm" | "player";
export type PresenceStatus = "online" | "idle" | "offline";

export interface OnlinePresence {
  id: string;
  name: string;
  role: PresenceRole;
  sessionId?: string;
  avatarUrl?: string;
  status: PresenceStatus;
  connectedAt: string;
  hp?: number;
  fp?: number;
}

export interface SessionPresencePayload {
  participantId: string;
  sessionId: string;
  displayName: string;
  role: PresenceRole;
  connectedAt: string;
}
