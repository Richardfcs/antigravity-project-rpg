import type {
  OnlinePresence,
  SessionPresencePayload
} from "@/types/presence";
import type { SessionViewerIdentity } from "@/types/session";

export function buildPresenceChannelName(sessionCode: string) {
  return `session:${sessionCode.toLowerCase()}`;
}

export function buildPresencePayload(
  viewer: SessionViewerIdentity
): SessionPresencePayload {
  return {
    participantId: viewer.participantId,
    sessionId: viewer.sessionId,
    displayName: viewer.displayName,
    role: viewer.role,
    connectedAt: new Date().toISOString()
  };
}

export function mergeRealtimePresence(
  currentMembers: OnlinePresence[],
  presenceState: Record<string, SessionPresencePayload[]>
) {
  const merged = new Map<string, OnlinePresence>(
    currentMembers.map((member) => [
      member.id,
      {
        ...member,
        status: "offline"
      }
    ])
  );

  for (const payloadList of Object.values(presenceState)) {
    for (const payload of payloadList) {
      const existing = merged.get(payload.participantId);

      merged.set(payload.participantId, {
        id: payload.participantId,
        sessionId: payload.sessionId,
        name: payload.displayName,
        role: payload.role,
        connectedAt: existing?.connectedAt ?? payload.connectedAt,
        hp: existing?.hp,
        fp: existing?.fp,
        avatarUrl: existing?.avatarUrl,
        status: "online"
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "gm" ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
}
