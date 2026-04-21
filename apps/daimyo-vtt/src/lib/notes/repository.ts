import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionNoteKind, SessionNoteRecord } from "@/types/note";

interface SessionNoteRow {
  id: string;
  session_id: string;
  author_participant_id: string;
  kind: SessionNoteKind;
  scope_key: string;
  title: string;
  body: string;
  scene_id: string | null;
  map_id: string | null;
  atlas_map_id: string | null;
  created_at: string;
  updated_at: string;
}

function getSessionNotesTable() {
  return createSupabaseAdminClient().from("session_notes");
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("relation")
  );
}

function mapSessionNoteRow(row: SessionNoteRow): SessionNoteRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    authorParticipantId: row.author_participant_id,
    kind: row.kind,
    scopeKey: row.scope_key,
    title: row.title,
    body: row.body,
    sceneId: row.scene_id,
    mapId: row.map_id,
    atlasMapId: row.atlas_map_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listSessionNotes(sessionId: string) {
  const { data, error } = await getSessionNotesTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: true })
    .returns<SessionNoteRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [] satisfies SessionNoteRecord[];
    }

    throw error;
  }

  return (data ?? []).map(mapSessionNoteRow);
}

export async function findSessionNoteByScope(input: {
  sessionId: string;
  authorParticipantId: string;
  kind: SessionNoteKind;
  scopeKey: string;
}) {
  const { data, error } = await getSessionNotesTable()
    .select("*")
    .eq("session_id", input.sessionId)
    .eq("author_participant_id", input.authorParticipantId)
    .eq("kind", input.kind)
    .eq("scope_key", input.scopeKey)
    .maybeSingle<SessionNoteRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapSessionNoteRow(data) : null;
}

export async function upsertSessionNote(input: {
  sessionId: string;
  authorParticipantId: string;
  kind: SessionNoteKind;
  scopeKey: string;
  title?: string;
  body?: string;
  sceneId?: string | null;
  mapId?: string | null;
  atlasMapId?: string | null;
}) {
  const current = await findSessionNoteByScope({
    sessionId: input.sessionId,
    authorParticipantId: input.authorParticipantId,
    kind: input.kind,
    scopeKey: input.scopeKey
  });

  const payload = {
    session_id: input.sessionId,
    author_participant_id: input.authorParticipantId,
    kind: input.kind,
    scope_key: input.scopeKey,
    title: (input.title ?? "").trim().slice(0, 120),
    body: (input.body ?? "").trim().slice(0, 12000),
    scene_id: input.sceneId ?? null,
    map_id: input.mapId ?? null,
    atlas_map_id: input.atlasMapId ?? null,
    updated_at: new Date().toISOString()
  };

  if (current) {
    const { data, error } = await getSessionNotesTable()
      .update(payload)
      .eq("id", current.id)
      .select("*")
      .single<SessionNoteRow>();

    if (error || !data) {
      throw error ?? new Error("Falha ao atualizar a nota.");
    }

    return mapSessionNoteRow(data);
  }

  const { data, error } = await getSessionNotesTable()
    .insert(payload)
    .select("*")
    .single<SessionNoteRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar a nota.");
  }

  return mapSessionNoteRow(data);
}

export async function deleteSessionNote(noteId: string) {
  const { data, error } = await getSessionNotesTable()
    .delete()
    .eq("id", noteId)
    .select("*")
    .maybeSingle<SessionNoteRow>();

  if (error) {
    throw error;
  }

  return data ? mapSessionNoteRow(data) : null;
}
