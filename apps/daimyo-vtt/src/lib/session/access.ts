import "server-only";

import { cookies } from "next/headers";

import { readSessionViewerCookie } from "@/lib/session/cookies";
import {
  buildViewerIdentity,
  findParticipantById,
  findSessionByCode
} from "@/lib/session/repository";
import type { PresenceRole } from "@/types/presence";

export async function requireSessionViewer(
  sessionCode: string,
  role?: PresenceRole
) {
  const session = await findSessionByCode(sessionCode);

  if (!session) {
    throw new Error("Sessao nao encontrada.");
  }

  const cookieStore = await cookies();
  const cookieViewer = readSessionViewerCookie(cookieStore, session.code);

  if (!cookieViewer || cookieViewer.sessionId !== session.id) {
    throw new Error("Este navegador nao esta vinculado a essa sessao.");
  }

  const participant = await findParticipantById(cookieViewer.participantId);

  if (
    !participant ||
    participant.sessionId !== session.id ||
    participant.role !== cookieViewer.role
  ) {
    throw new Error("O participante desta sessao nao e mais valido.");
  }

  if (role && participant.role !== role) {
    throw new Error("Voce nao tem permissao para executar esta acao.");
  }

  return {
    session,
    viewer: buildViewerIdentity(session, participant),
    participant
  };
}
