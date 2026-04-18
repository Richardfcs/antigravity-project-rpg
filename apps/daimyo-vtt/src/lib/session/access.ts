import "server-only";

import { cookies } from "next/headers";

import { readSessionViewerCookie } from "@/lib/session/cookies";
import { findSessionByCode } from "@/lib/session/repository";
import type { PresenceRole } from "@/types/presence";

export async function requireSessionViewer(
  sessionCode: string,
  role?: PresenceRole
) {
  const session = await findSessionByCode(sessionCode);

  if (!session) {
    throw new Error("Sessão não encontrada.");
  }

  const cookieStore = await cookies();
  const viewer = readSessionViewerCookie(cookieStore, session.code);

  if (!viewer || viewer.sessionId !== session.id) {
    throw new Error("Este navegador não está vinculado a essa sessão.");
  }

  if (role && viewer.role !== role) {
    throw new Error("Você não tem permissão para executar esta ação.");
  }

  return { session, viewer };
}
