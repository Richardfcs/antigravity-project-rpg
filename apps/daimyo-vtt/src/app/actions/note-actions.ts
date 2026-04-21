"use server";

import { getInfraReadiness } from "@/lib/env";
import {
  deleteSessionNote,
  findSessionNoteByScope,
  upsertSessionNote
} from "@/lib/notes/repository";
import { requireSessionViewer } from "@/lib/session/access";
import type { SessionNoteKind, SessionNoteRecord } from "@/types/note";

interface SessionNoteActionResult {
  ok: boolean;
  note?: SessionNoteRecord;
  message?: string;
}

function buildInfraError(): SessionNoteActionResult {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  };
}

export async function upsertSessionNoteAction(input: {
  sessionCode: string;
  kind: SessionNoteKind;
  scopeKey: string;
  title?: string;
  body?: string;
  sceneId?: string | null;
  mapId?: string | null;
  atlasMapId?: string | null;
}): Promise<SessionNoteActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);

    if (viewer.role !== "gm" && input.kind !== "journal") {
      throw new Error("Jogadores so podem editar o proprio caderno.");
    }

    const note = await upsertSessionNote({
      sessionId: session.id,
      authorParticipantId: viewer.participantId,
      kind: input.kind,
      scopeKey: input.scopeKey,
      title: input.title,
      body: input.body,
      sceneId: input.sceneId ?? null,
      mapId: input.mapId ?? null,
      atlasMapId: input.atlasMapId ?? null
    });

    return { ok: true, note };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao salvar a nota."
    };
  }
}

export async function deleteSessionNoteAction(input: {
  sessionCode: string;
  kind: SessionNoteKind;
  scopeKey: string;
}): Promise<SessionNoteActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);

    if (viewer.role !== "gm" && input.kind !== "journal") {
      throw new Error("Jogadores so podem limpar o proprio caderno.");
    }

    const current = await findSessionNoteByScope({
      sessionId: session.id,
      authorParticipantId: viewer.participantId,
      kind: input.kind,
      scopeKey: input.scopeKey
    });

    if (!current) {
      return { ok: true, message: "Nenhuma nota ativa para limpar." };
    }

    const note = await deleteSessionNote(current.id);
    return { ok: true, note: note ?? current };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao limpar a nota."
    };
  }
}
