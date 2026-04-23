import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateSessionCode,
  normalizeSessionCode,
  sanitizeName
} from "@/lib/session/codes";
import type {
  OnlinePresence,
  PresenceRole
} from "@/types/presence";
import type {
  LinkedSessionSummary,
  SessionBootstrapPayload,
  SessionParticipantRecord,
  SessionParticipantStatus,
  SessionRecord,
  SessionShellSnapshot,
  PresentationMode,
  StageMode,
  SessionStatus,
  SessionViewerIdentity
} from "@/types/session";

interface SessionRow {
  id: string;
  code: string;
  name: string;
  gm_name: string;
  owner_user_id: string | null;
  status: SessionStatus;
  active_scene: string;
  active_scene_id: string | null;
  active_map_id: string | null;
  active_atlas_map_id: string | null;
  active_stage_mode: StageMode;
  presentation_mode: PresentationMode;
  combat_enabled?: boolean | null;
  combat_round?: number | null;
  combat_turn_index?: number | null;
  combat_active_token_id?: string | null;
  scene_mood: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  id: string;
  session_id: string;
  display_name: string;
  auth_user_id: string | null;
  role: PresenceRole;
  status: SessionParticipantStatus;
  joined_at: string;
  last_seen_at: string;
}

function getSessionTable() {
  return createSupabaseAdminClient().from("sessions");
}

function getParticipantTable() {
  return createSupabaseAdminClient().from("session_participants");
}

function mapSessionRow(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    gmName: row.gm_name,
    ownerUserId: row.owner_user_id ?? null,
    status: row.status,
    activeScene: row.active_scene,
    activeSceneId: row.active_scene_id ?? null,
    activeMapId: row.active_map_id ?? null,
    activeAtlasMapId: row.active_atlas_map_id ?? null,
    activeStageMode: row.active_stage_mode ?? "theater",
    presentationMode: row.presentation_mode ?? "standard",
    combatEnabled: row.combat_enabled ?? false,
    combatRound: row.combat_round ?? 1,
    combatTurnIndex: row.combat_turn_index ?? 0,
    combatActiveTokenId: row.combat_active_token_id ?? null,
    sceneMood: row.scene_mood,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapParticipantRow(row: ParticipantRow): SessionParticipantRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    displayName: row.display_name,
    authUserId: row.auth_user_id ?? null,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at
  };
}

function mapSessionToSnapshot(
  session: SessionRecord,
  role: PresenceRole
): SessionShellSnapshot {
  return {
    sessionId: session.id,
    code: session.code,
    campaignName: session.name,
    role,
    activeScene: session.activeScene,
    activeSceneId: session.activeSceneId,
    activeMapId: session.activeMapId,
    activeAtlasMapId: session.activeAtlasMapId,
    stageMode: session.activeStageMode,
    presentationMode: session.presentationMode,
    combatEnabled: session.combatEnabled,
    combatRound: session.combatRound,
    combatTurnIndex: session.combatTurnIndex,
    combatActiveTokenId: session.combatActiveTokenId,
    latencyLabel: "--",
    sceneMood: session.sceneMood,
    syncState: "booting"
  };
}

export function mapParticipantsToOnlinePresence(
  participants: SessionParticipantRecord[],
  currentViewerId?: string
): OnlinePresence[] {
  return participants.map((participant) => ({
    id: participant.id,
    sessionId: participant.sessionId,
    name: participant.displayName,
    role: participant.role,
    status: participant.id === currentViewerId ? "online" : "offline",
    connectedAt: participant.joinedAt
  }));
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function buildPersistenceMigrationError() {
  return new Error(
    "A migration de persistencia/autenticacao ainda nao foi aplicada no Supabase."
  );
}

export async function updateSessionStageMode(input: {
  sessionId: string;
  stageMode: StageMode;
}) {
  const { data, error } = await getSessionTable()
    .update({
      active_stage_mode: input.stageMode
    })
    .eq("id", input.sessionId)
    .select("*")
    .single<SessionRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o modo da sessao.");
  }

  return mapSessionRow(data);
}

export async function updateSessionPresentationMode(input: {
  sessionId: string;
  presentationMode: PresentationMode;
}) {
  const { data, error } = await getSessionTable()
    .update({
      presentation_mode: input.presentationMode
    })
    .eq("id", input.sessionId)
    .select("*")
    .single<SessionRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar a apresentacao da sessao.");
  }

  return mapSessionRow(data);
}

export async function updateSessionCombatState(input: {
  sessionId: string;
  combatEnabled?: boolean;
  combatRound?: number;
  combatTurnIndex?: number;
  combatActiveTokenId?: string | null;
}) {
  const payload: Record<string, boolean | number | string | null> = {};

  if (input.combatEnabled !== undefined) {
    payload.combat_enabled = input.combatEnabled;
  }

  if (input.combatRound !== undefined) {
    payload.combat_round = Math.max(1, Math.floor(input.combatRound));
  }

  if (input.combatTurnIndex !== undefined) {
    payload.combat_turn_index = Math.max(0, Math.floor(input.combatTurnIndex));
  }

  if (input.combatActiveTokenId !== undefined) {
    payload.combat_active_token_id = input.combatActiveTokenId;
  }

  const { data, error } = await getSessionTable()
    .update(payload)
    .eq("id", input.sessionId)
    .select("*")
    .single<SessionRow>();

  if (error || !data) {
    if (isMissingColumnError(error)) {
      throw new Error(
        "A migration do estado de combate ainda nao foi aplicada no Supabase."
      );
    }

    throw error ?? new Error("Falha ao atualizar o estado de combate da sessao.");
  }

  return mapSessionRow(data);
}

export async function findSessionByCode(code: string) {
  const normalizedCode = normalizeSessionCode(code);
  const { data, error } = await getSessionTable()
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle<SessionRow>();

  if (error) {
    throw error;
  }

  return data ? mapSessionRow(data) : null;
}

export async function listSessionParticipants(sessionId: string) {
  const { data, error } = await getParticipantTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true })
    .returns<ParticipantRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapParticipantRow);
}

export async function findParticipantById(participantId: string) {
  const { data, error } = await getParticipantTable()
    .select("*")
    .eq("id", participantId)
    .maybeSingle<ParticipantRow>();

  if (error) {
    throw error;
  }

  return data ? mapParticipantRow(data) : null;
}

export async function removeSessionParticipant(input: {
  sessionId: string;
  participantId: string;
}) {
  const { data, error } = await getParticipantTable()
    .delete()
    .eq("id", input.participantId)
    .eq("session_id", input.sessionId)
    .eq("role", "player")
    .select("*")
    .maybeSingle<ParticipantRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao remover o jogador da sessao.");
  }

  return mapParticipantRow(data);
}

export async function linkParticipantToAuthUser(input: {
  sessionId: string;
  participantId: string;
  authUserId: string;
}) {
  const { data, error } = await getParticipantTable()
    .update({
      auth_user_id: input.authUserId,
      last_seen_at: new Date().toISOString()
    })
    .eq("id", input.participantId)
    .eq("session_id", input.sessionId)
    .select("*")
    .maybeSingle<ParticipantRow>();

  if (error || !data) {
    if (isMissingColumnError(error)) {
      throw buildPersistenceMigrationError();
    }

    throw error ?? new Error("Falha ao vincular o participante ao usuario autenticado.");
  }

  return mapParticipantRow(data);
}

export async function linkSessionOwnerToAuthUser(input: {
  sessionId: string;
  authUserId: string;
}) {
  const { data, error } = await getSessionTable()
    .update({
      owner_user_id: input.authUserId
    })
    .eq("id", input.sessionId)
    .select("*")
    .maybeSingle<SessionRow>();

  if (error || !data) {
    if (isMissingColumnError(error)) {
      throw buildPersistenceMigrationError();
    }

    throw error ?? new Error("Falha ao vincular a sessao ao mestre autenticado.");
  }

  return mapSessionRow(data);
}

export async function findParticipantByAuthUser(input: {
  sessionId: string;
  role: PresenceRole;
  authUserId: string;
}) {
  const { data, error } = await getParticipantTable()
    .select("*")
    .eq("session_id", input.sessionId)
    .eq("role", input.role)
    .eq("auth_user_id", input.authUserId)
    .maybeSingle<ParticipantRow>();

  if (error) {
    if (isMissingColumnError(error)) {
      throw buildPersistenceMigrationError();
    }

    throw error;
  }

  return data ? mapParticipantRow(data) : null;
}

export async function listLinkedSessionsByAuthUser(authUserId: string) {
  const { data: participantRows, error: participantError } = await getParticipantTable()
    .select("*")
    .eq("auth_user_id", authUserId)
    .order("last_seen_at", { ascending: false })
    .returns<ParticipantRow[]>();

  if (participantError) {
    if (isMissingColumnError(participantError)) {
      throw buildPersistenceMigrationError();
    }

    throw participantError;
  }

  const participants = (participantRows ?? []).map(mapParticipantRow);

  if (participants.length === 0) {
    return [] satisfies LinkedSessionSummary[];
  }

  const sessionIds = [...new Set(participants.map((participant) => participant.sessionId))];
  const { data: sessionRows, error: sessionError } = await getSessionTable()
    .select("*")
    .in("id", sessionIds)
    .returns<SessionRow[]>();

  if (sessionError) {
    throw sessionError;
  }

  const sessionsById = new Map(
    (sessionRows ?? []).map((row) => {
      const session = mapSessionRow(row);
      return [session.id, session] as const;
    })
  );

  return participants
    .map((participant) => {
      const session = sessionsById.get(participant.sessionId);

      if (!session) {
        return null;
      }

      return {
        sessionId: session.id,
        sessionCode: session.code,
        sessionName: session.name,
        participantId: participant.id,
        displayName: participant.displayName,
        role: participant.role,
        lastSeenAt: participant.lastSeenAt
      } satisfies LinkedSessionSummary;
    })
    .filter(Boolean) as LinkedSessionSummary[];
}

export async function createSessionWithGm(input: {
  campaignName: string;
  gmName: string;
}) {
  const campaignName = sanitizeName(input.campaignName, 72);
  const gmName = sanitizeName(input.gmName);

  if (!campaignName || !gmName) {
    throw new Error("Informe o nome da campanha e o nome do mestre.");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateSessionCode();
    const { data: sessionRow, error: sessionError } = await getSessionTable()
      .insert({
        code,
        name: campaignName,
        gm_name: gmName,
        status: "lobby"
      })
      .select("*")
      .single<SessionRow>();

    if (isUniqueViolation(sessionError)) {
      continue;
    }

    if (sessionError || !sessionRow) {
      throw sessionError ?? new Error("Falha ao criar a sessão.");
    }

    const { data: participantRow, error: participantError } =
      await getParticipantTable()
        .insert({
          session_id: sessionRow.id,
          display_name: gmName,
          role: "gm",
          status: "online"
        })
        .select("*")
        .single<ParticipantRow>();

    if (participantError || !participantRow) {
      throw participantError ?? new Error("Falha ao registrar o mestre.");
    }

    return {
      session: mapSessionRow(sessionRow),
      participant: mapParticipantRow(participantRow)
    };
  }

  throw new Error("Não foi possível gerar um código único para a sessão.");
}

export async function joinSessionAsPlayer(input: {
  sessionCode: string;
  playerName: string;
}) {
  const sessionCode = normalizeSessionCode(input.sessionCode);
  const playerName = sanitizeName(input.playerName);

  if (!sessionCode || !playerName) {
    throw new Error("Informe o código da sala e o nome do jogador.");
  }

  const session = await findSessionByCode(sessionCode);

  if (!session) {
    throw new Error("Sala não encontrada para esse código.");
  }

  if (session.status === "closed") {
    throw new Error("Esta sala está encerrada e não aceita novos jogadores.");
  }

  const { data, error } = await getParticipantTable()
    .insert({
      session_id: session.id,
      display_name: playerName,
      role: "player",
      status: "online"
    })
    .select("*")
    .single<ParticipantRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao registrar o jogador na sessão.");
  }

  return {
    session,
    participant: mapParticipantRow(data)
  };
}

export function buildViewerIdentity(
  session: SessionRecord,
  participant: SessionParticipantRecord
): SessionViewerIdentity {
  return {
    sessionId: session.id,
    sessionCode: session.code,
    participantId: participant.id,
    displayName: participant.displayName,
    role: participant.role
  };
}

export async function getSessionBootstrap(input: {
  sessionCode: string;
  role: PresenceRole;
  viewerId?: string | null;
}): Promise<SessionBootstrapPayload | null> {
  const session = await findSessionByCode(input.sessionCode);

  if (!session) {
    return null;
  }

  const participants = await listSessionParticipants(session.id);
  const viewer =
    input.viewerId != null
      ? participants.find(
          (participant) =>
            participant.id === input.viewerId &&
            participant.role === input.role &&
            participant.sessionId === session.id
        ) ?? null
      : null;

  return {
    session,
    snapshot: mapSessionToSnapshot(session, input.role),
    participants,
    viewer: viewer ? buildViewerIdentity(session, viewer) : null
  };
}
