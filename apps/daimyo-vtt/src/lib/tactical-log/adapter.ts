import type { CombatResolutionRecord, TacticalSkillRollPayload } from "@/types/combat";
import type { SessionMessageRecord } from "@/types/message";

export type TacticalLogFilter = "all" | "combat" | "rolls" | "chat" | "system" | "reverted";

export type TacticalLogEntry =
  | {
      id: string;
      source: "combat";
      type: "combat";
      createdAt: string;
      title: string;
      body: string;
      isPrivate: false;
      reverted: boolean;
      resolution: CombatResolutionRecord;
    }
  | {
      id: string;
      source: "message";
      type: "skill-roll" | "roll" | "chat" | "system";
      createdAt: string;
      title: string;
      body: string;
      isPrivate: boolean;
      reverted: boolean;
      message: SessionMessageRecord;
      skillRoll?: TacticalSkillRollPayload;
    };

type TacticalMessageLogType = "skill-roll" | "roll" | "chat" | "system";

function isSkillRollPayload(value: unknown): value is TacticalSkillRollPayload {
  const payload = value as TacticalSkillRollPayload | null;
  return Boolean(
    payload &&
      payload.rollKind === "skill" &&
      typeof payload.skillName === "string" &&
      typeof payload.targetNumber === "number" &&
      Array.isArray(payload.rolls)
  );
}

function messageType(message: SessionMessageRecord): TacticalMessageLogType {
  if (message.kind === "roll") {
    return isSkillRollPayload(message.payload) ? "skill-roll" : "roll";
  }

  if (message.kind === "chat") {
    return "chat";
  }

  return "system";
}

export function buildTacticalLogEntries(input: {
  combatLog?: CombatResolutionRecord[] | null;
  messages?: SessionMessageRecord[] | null;
  includePrivate?: boolean;
}) {
  const includePrivate = input.includePrivate ?? false;
  const combatEntries: TacticalLogEntry[] = (input.combatLog ?? []).map((resolution) => ({
    id: `combat:${resolution.id}`,
    source: "combat",
    type: "combat",
    createdAt: resolution.createdAt,
    title: resolution.actorName
      ? `${resolution.actorName}${resolution.targetName ? ` -> ${resolution.targetName}` : ""}`
      : "Resolucao de combate",
    body: resolution.summary,
    isPrivate: false,
    reverted: resolution.reverted ?? false,
    resolution
  }));

  const messageEntries: TacticalLogEntry[] = (input.messages ?? [])
    .filter((message) => includePrivate || !message.isPrivate)
    .map((message) => {
      const skillRoll = isSkillRollPayload(message.payload) ? message.payload : undefined;

      return {
        id: `message:${message.id}`,
        source: "message",
        type: messageType(message),
        createdAt: message.createdAt,
        title: skillRoll?.skillName ?? message.displayName,
        body: message.body,
        isPrivate: message.isPrivate,
        reverted: Boolean(message.payload?.reverted),
        message,
        skillRoll
      };
    });

  return [...combatEntries, ...messageEntries].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

export function filterTacticalLogEntries(
  entries: TacticalLogEntry[],
  filter: TacticalLogFilter
) {
  if (filter === "all") return entries;
  if (filter === "combat") return entries.filter((entry) => entry.type === "combat");
  if (filter === "rolls") {
    return entries.filter((entry) => entry.type === "roll" || entry.type === "skill-roll");
  }
  if (filter === "chat") return entries.filter((entry) => entry.type === "chat");
  if (filter === "reverted") return entries.filter((entry) => entry.reverted);
  return entries.filter((entry) => entry.type === "system");
}
