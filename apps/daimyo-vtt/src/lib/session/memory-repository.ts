import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PresenceRole } from "@/types/presence";
import type { StageMode } from "@/types/session";
import type {
  SessionMemoryCategory,
  SessionMemoryRecord
} from "@/types/session-memory";

interface SessionMemoryRow {
  id: string;
  session_id: string;
  actor_participant_id: string | null;
  target_participant_id: string | null;
  category: SessionMemoryCategory;
  title: string;
  detail: string;
  stage_mode: StageMode | null;
  atlas_map_id: string | null;
  atlas_pin_id: string | null;
  audio_track_id: string | null;
  created_at: string;
}

function getSessionMemoryTable() {
  return createSupabaseAdminClient().from("session_memory_events");
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("relation")
  );
}

function mapSessionMemoryRow(row: SessionMemoryRow): SessionMemoryRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    actorParticipantId: row.actor_participant_id,
    targetParticipantId: row.target_participant_id,
    category: row.category,
    title: row.title,
    detail: row.detail,
    stageMode: row.stage_mode,
    atlasMapId: row.atlas_map_id,
    atlasPinId: row.atlas_pin_id,
    audioTrackId: row.audio_track_id,
    createdAt: row.created_at
  };
}

export async function listSessionMemoryEventsForViewer(input: {
  sessionId: string;
  role: PresenceRole;
  viewerParticipantId: string;
  limit?: number;
}) {
  let query = getSessionMemoryTable()
    .select("*")
    .eq("session_id", input.sessionId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 16);

  if (input.role !== "gm") {
    query = query.or(`target_participant_id.is.null,target_participant_id.eq.${input.viewerParticipantId}`);
  }

  const { data, error } = await query.returns<SessionMemoryRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [] satisfies SessionMemoryRecord[];
    }

    throw error;
  }

  return (data ?? []).map(mapSessionMemoryRow);
}

export async function createSessionMemoryEvent(input: {
  sessionId: string;
  actorParticipantId?: string | null;
  targetParticipantId?: string | null;
  category: SessionMemoryCategory;
  title: string;
  detail?: string;
  stageMode?: StageMode | null;
  atlasMapId?: string | null;
  atlasPinId?: string | null;
  audioTrackId?: string | null;
}) {
  const { data, error } = await getSessionMemoryTable()
    .insert({
      session_id: input.sessionId,
      actor_participant_id: input.actorParticipantId ?? null,
      target_participant_id: input.targetParticipantId ?? null,
      category: input.category,
      title: input.title.trim().slice(0, 120),
      detail: (input.detail ?? "").trim().slice(0, 320),
      stage_mode: input.stageMode ?? null,
      atlas_map_id: input.atlasMapId ?? null,
      atlas_pin_id: input.atlasPinId ?? null,
      audio_track_id: input.audioTrackId ?? null
    })
    .select("*")
    .single<SessionMemoryRow>();

  if (error || !data) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error ?? new Error("Falha ao registrar memoria da sessao.");
  }

  return mapSessionMemoryRow(data);
}
