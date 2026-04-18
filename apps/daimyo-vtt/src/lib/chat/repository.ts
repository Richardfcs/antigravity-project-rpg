import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionMessageKind, SessionMessageRecord } from "@/types/message";

interface MessageRow {
  id: string;
  session_id: string;
  participant_id: string | null;
  display_name: string;
  kind: SessionMessageKind;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function getMessageTable() {
  return createSupabaseAdminClient().from("session_messages");
}

function sanitizeMessageBody(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 1200);
}

function mapMessageRow(row: MessageRow): SessionMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    displayName: row.display_name,
    kind: row.kind,
    body: row.body,
    payload: row.payload ?? {},
    createdAt: row.created_at
  };
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("could not find the table") === true ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

export async function listSessionMessages(sessionId: string, limit = 80) {
  const { data, error } = await getMessageTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<MessageRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapMessageRow);
}

export async function createSessionMessage(input: {
  sessionId: string;
  participantId?: string | null;
  displayName: string;
  kind: SessionMessageKind;
  body: string;
  payload?: Record<string, unknown>;
}) {
  const displayName = sanitizeMessageBody(input.displayName).slice(0, 72);
  const body = sanitizeMessageBody(input.body);

  if (!displayName || !body) {
    throw new Error("Mensagem invalida.");
  }

  const { data, error } = await getMessageTable()
    .insert({
      session_id: input.sessionId,
      participant_id: input.participantId ?? null,
      display_name: displayName,
      kind: input.kind,
      body,
      payload: input.payload ?? {}
    })
    .select("*")
    .single<MessageRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao publicar a mensagem.");
  }

  return mapMessageRow(data);
}
