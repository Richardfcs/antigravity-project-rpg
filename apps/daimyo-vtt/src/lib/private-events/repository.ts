import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PrivateEventKind,
  SessionPrivateEventRecord
} from "@/types/immersive-event";

interface PrivateEventRow {
  id: string;
  session_id: string;
  target_participant_id: string;
  source_participant_id: string | null;
  kind: PrivateEventKind;
  title: string;
  body: string;
  image_asset_id: string | null;
  payload?: unknown | null;
  intensity: number;
  duration_ms: number;
  is_consumed: boolean;
  created_at: string;
}

function getPrivateEventTable() {
  return createSupabaseAdminClient().from("session_private_events");
}

function mapPrivateEventRow(row: PrivateEventRow): SessionPrivateEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    targetParticipantId: row.target_participant_id,
    sourceParticipantId: row.source_participant_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    imageAssetId: row.image_asset_id,
    payload:
      typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null,
    intensity: Number(row.intensity),
    durationMs: Number(row.duration_ms),
    isConsumed: row.is_consumed,
    createdAt: row.created_at
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("could not find the table") === true ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

export async function listPendingPrivateEvents(sessionId: string, participantId: string) {
  const { data, error } = await getPrivateEventTable()
    .select("*")
    .eq("session_id", sessionId)
    .eq("target_participant_id", participantId)
    .eq("is_consumed", false)
    .order("created_at", { ascending: true })
    .returns<PrivateEventRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapPrivateEventRow);
}

export async function findPrivateEventById(eventId: string) {
  const { data, error } = await getPrivateEventTable()
    .select("*")
    .eq("id", eventId)
    .maybeSingle<PrivateEventRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapPrivateEventRow(data) : null;
}

export async function createPrivateEvent(input: {
  sessionId: string;
  targetParticipantId: string;
  sourceParticipantId?: string | null;
  kind: PrivateEventKind;
  title: string;
  body: string;
  imageAssetId?: string | null;
  payload?: Record<string, unknown> | null;
  intensity?: number;
  durationMs?: number;
}) {
  const title = input.title.trim().slice(0, 72);
  const body = input.body.trim().slice(0, 800);

  if (!title || !body) {
    throw new Error("Preencha titulo e descricao do evento privado.");
  }

  const { data, error } = await getPrivateEventTable()
    .insert({
      session_id: input.sessionId,
      target_participant_id: input.targetParticipantId,
      source_participant_id: input.sourceParticipantId ?? null,
      kind: input.kind,
      title,
      body,
      image_asset_id: input.imageAssetId ?? null,
      ...(input.payload !== undefined ? { payload: input.payload } : {}),
      intensity: clamp(Math.round(input.intensity ?? 3), 1, 5),
      duration_ms: clamp(Math.round(input.durationMs ?? 5000), 800, 30000),
      is_consumed: false
    })
    .select("*")
    .single<PrivateEventRow>();

  if (error || !data) {
    if (isMissingColumnError(error) && input.payload !== undefined) {
      throw new Error(
        "A migration do payload estruturado dos eventos privados ainda nao foi aplicada no Supabase."
      );
    }

    throw error ?? new Error("Falha ao enviar o evento privado.");
  }

  return mapPrivateEventRow(data);
}

export async function consumePrivateEvent(eventId: string) {
  const { data, error } = await getPrivateEventTable()
    .update({
      is_consumed: true
    })
    .eq("id", eventId)
    .select("*")
    .single<PrivateEventRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao consumir o evento privado.");
  }

  return mapPrivateEventRow(data);
}
