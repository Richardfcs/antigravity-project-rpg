import type { PresenceRole } from "@/types/presence";
import type { SessionCombatFlow } from "@/types/combat";

export type StageMode = "theater" | "tactical" | "atlas";
export type PresentationMode = "standard" | "immersive";
export type MasterMode = "prep" | "live";
export type MasterWorkspace = "stage" | "library";
export type MasterDrawer = "closed" | ExplorerSection;
export type ExplorerSection =
  | "scenes"
  | "maps"
  | "actors"
  | "assets"
  | "codex"
  | "notes"
  | "atlas"
  | "effects"
  | "admin"
  | "audio"
  | "chat";
export type DockTab = "chat" | "dice" | "audio" | "notes";
export type PlayerBottomTab = "stage" | "wiki" | "sheet" | "chat" | "notes";
export type PlayerOverlay = "none" | "sheet" | "wiki" | "chat" | "notes";
export type SyncState = "idle" | "booting" | "connected" | "degraded";
export type SessionStatus = "lobby" | "active" | "closed";
export type SessionParticipantStatus = "online" | "idle" | "offline";

export interface SessionRecord {
  id: string;
  code: string;
  name: string;
  gmName: string;
  ownerUserId: string | null;
  status: SessionStatus;
  activeScene: string;
  activeSceneId: string | null;
  activeMapId: string | null;
  activeAtlasMapId: string | null;
  activeStageMode: StageMode;
  presentationMode: PresentationMode;
  combatEnabled: boolean;
  combatRound: number;
  combatTurnIndex: number;
  combatActiveTokenId: string | null;
  combatFlow: SessionCombatFlow | null;
  sceneMood: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionParticipantRecord {
  id: string;
  sessionId: string;
  displayName: string;
  authUserId: string | null;
  role: PresenceRole;
  status: SessionParticipantStatus;
  joinedAt: string;
  lastSeenAt: string;
}

export interface SessionViewerIdentity {
  sessionId: string;
  sessionCode: string;
  participantId: string;
  displayName: string;
  role: PresenceRole;
}

export interface SessionShellSnapshot {
  sessionId: string;
  code: string;
  campaignName: string;
  role: PresenceRole;
  activeScene: string;
  activeSceneId: string | null;
  activeMapId: string | null;
  activeAtlasMapId: string | null;
  stageMode: StageMode;
  presentationMode: PresentationMode;
  combatEnabled: boolean;
  combatRound: number;
  combatTurnIndex: number;
  combatActiveTokenId: string | null;
  combatFlow: SessionCombatFlow | null;
  latencyLabel: string;
  sceneMood: string;
  syncState: SyncState;
}

export interface SessionBootstrapPayload {
  session: SessionRecord;
  snapshot: SessionShellSnapshot;
  participants: SessionParticipantRecord[];
  viewer: SessionViewerIdentity | null;
}

export interface LinkedSessionSummary {
  sessionId: string;
  sessionCode: string;
  sessionName: string;
  participantId: string;
  displayName: string;
  role: PresenceRole;
  lastSeenAt: string;
}
