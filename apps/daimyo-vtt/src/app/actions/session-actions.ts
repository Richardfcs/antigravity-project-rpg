"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getInfraReadiness } from "@/lib/env";
import { createSessionMemoryEvent } from "@/lib/session/memory-repository";
import { requireSessionViewer } from "@/lib/session/access";
import {
  buildSessionViewerCookie,
  readSessionViewerCookie
} from "@/lib/session/cookies";
import {
  buildViewerIdentity,
  createSessionWithGm,
  findSessionByCode,
  findParticipantById,
  findParticipantByAuthUser,
  joinSessionAsPlayer,
  linkParticipantToAuthUser,
  linkSessionOwnerToAuthUser,
  listLinkedSessionsByAuthUser,
  removeSessionParticipant,
  updateSessionPresentationMode,
  updateSessionStageMode,
  updateSessionCombatState
} from "@/lib/session/repository";
import { normalizeSessionCode } from "@/lib/session/codes";
import { verifySupabaseAccessToken } from "@/lib/supabase/auth";
import type { PresentationMode, StageMode } from "@/types/session";

function buildLobbyRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/?${searchParams.toString()}`;
}

function redirectTo(path: string): never {
  redirect(path as Route);
}

function formatActionError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

interface SessionStageModeResult {
  ok: boolean;
  stageMode?: StageMode;
  presentationMode?: PresentationMode;
  message?: string;
}

interface SessionAuthActionResult {
  ok: boolean;
  route?: string;
  linked?: boolean;
  message?: string;
}

interface SessionParticipantActionResult {
  ok: boolean;
  participantId?: string;
  message?: string;
}

async function recordSessionMemory(
  input: Parameters<typeof createSessionMemoryEvent>[0]
) {
  try {
    await createSessionMemoryEvent(input);
  } catch {
    // A memória da sessão é narrativa e não deve derrubar a action principal.
  }
}

function describeStageMode(stageMode: StageMode) {
  switch (stageMode) {
    case "tactical":
      return "Campo tatico";
    case "atlas":
      return "Atlas";
    default:
      return "Palco narrativo";
  }
}

export async function createSessionAction(formData: FormData) {
  const infra = getInfraReadiness();

  if (!infra.lobbyReady) {
    redirectTo(
      buildLobbyRedirect({
        error:
          "Configuração incompleta do Supabase. Defina as variáveis públicas e a service role antes de criar salas."
      })
    );
  }

  let result:
    | Awaited<ReturnType<typeof createSessionWithGm>>
    | null = null;

  try {
    const campaignName = String(formData.get("campaignName") ?? "");
    const gmName = String(formData.get("gmName") ?? "");

    result = await createSessionWithGm({
      campaignName,
      gmName
    });
  } catch (error) {
    redirectTo(
      buildLobbyRedirect({
        error: formatActionError(error) ?? "Falha inesperada ao criar a sessão."
      })
    );
  }

  const { session, participant } = result;
  const cookieStore = await cookies();
  cookieStore.set(buildSessionViewerCookie(buildViewerIdentity(session, participant)));
  redirectTo(`/session/${session.code}/gm`);
}

export async function joinSessionAction(formData: FormData) {
  const infra = getInfraReadiness();

  if (!infra.lobbyReady) {
    redirectTo(
      buildLobbyRedirect({
        error:
          "Configuração incompleta do Supabase. Defina as variáveis públicas e a service role antes de abrir o lobby."
      })
    );
  }

  let result:
    | Awaited<ReturnType<typeof joinSessionAsPlayer>>
    | null = null;

  try {
    const sessionCode = String(formData.get("sessionCode") ?? "");
    const playerName = String(formData.get("playerName") ?? "");

    result = await joinSessionAsPlayer({
      sessionCode,
      playerName
    });
  } catch (error) {
    redirectTo(
      buildLobbyRedirect({
        error:
          formatActionError(error) ?? "Falha inesperada ao entrar na sessão.",
        code: normalizeSessionCode(String(formData.get("sessionCode") ?? ""))
      })
    );
  }

  const { session, participant } = result;
  const cookieStore = await cookies();
  cookieStore.set(buildSessionViewerCookie(buildViewerIdentity(session, participant)));
  redirectTo(`/session/${session.code}/player`);
}

export async function resumeSessionAction(formData: FormData) {
  const infra = getInfraReadiness();

  if (!infra.lobbyReady) {
    redirectTo(
      buildLobbyRedirect({
        error:
          "Configuração incompleta do Supabase. Defina as variáveis públicas e a service role antes de retomar salas."
      })
    );
  }

  const sessionCode = normalizeSessionCode(String(formData.get("sessionCode") ?? ""));

  if (!sessionCode) {
    redirectTo(buildLobbyRedirect({ error: "Informe um código de sala válido." }));
  }

  const session = await findSessionByCode(sessionCode);

  if (!session) {
    redirectTo(buildLobbyRedirect({ error: "Sala não encontrada.", code: sessionCode }));
  }

  const cookieStore = await cookies();
  const viewer = readSessionViewerCookie(cookieStore, session.code);

  if (!viewer) {
    redirectTo(
      buildLobbyRedirect({
        error:
          "Este navegador ainda não está vinculado a essa sala. Entre novamente como Mestre ou Jogador.",
        code: session.code
      })
    );
  }

  redirectTo(`/session/${session.code}/${viewer.role === "gm" ? "gm" : "player"}`);
}

export async function setSessionStageModeAction(input: {
  sessionCode: string;
  stageMode: StageMode;
}): Promise<SessionStageModeResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    const updatedSession = await updateSessionStageMode({
      sessionId: session.id,
      stageMode: input.stageMode
    });

    await recordSessionMemory({
      sessionId: session.id,
      actorParticipantId: viewer.participantId,
      category: "stage",
      title: `${describeStageMode(updatedSession.activeStageMode)} em foco`,
      detail:
        updatedSession.activeStageMode === "theater"
          ? updatedSession.activeScene
          : updatedSession.activeStageMode === "tactical"
            ? "O campo tatico assumiu o palco da sessao."
            : "O atlas assumiu a condução da sessao.",
      stageMode: updatedSession.activeStageMode
    });

    return {
      ok: true,
      stageMode: updatedSession.activeStageMode
    };
  } catch (error) {
    return {
      ok: false,
      message:
        formatActionError(error) ?? "Falha ao atualizar o modo da sessao."
    };
  }
}

export async function setSessionPresentationModeAction(input: {
  sessionCode: string;
  presentationMode: PresentationMode;
}): Promise<SessionStageModeResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const updatedSession = await updateSessionPresentationMode({
      sessionId: session.id,
      presentationMode: input.presentationMode
    });

    return {
      ok: true,
      presentationMode: updatedSession.presentationMode
    };
  } catch (error) {
    return {
      ok: false,
      message:
        formatActionError(error) ?? "Falha ao atualizar a apresentacao da sessao."
    };
  }
}

export async function setSessionCombatStateAction(input: {
  sessionCode: string;
  combatEnabled?: boolean;
  combatRound?: number;
  combatTurnIndex?: number;
  combatActiveTokenId?: string | null;
}): Promise<SessionStageModeResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const updatedSession = await updateSessionCombatState({
      sessionId: session.id,
      combatEnabled: input.combatEnabled,
      combatRound: input.combatRound,
      combatTurnIndex: input.combatTurnIndex,
      combatActiveTokenId: input.combatActiveTokenId
    });

    return {
      ok: true,
      message: "Estado de combate atualizado.",
      stageMode: updatedSession.activeStageMode,
      presentationMode: updatedSession.presentationMode
    };
  } catch (error) {
    return {
      ok: false,
      message:
        formatActionError(error) ?? "Falha ao atualizar o combate da sessao."
    };
  }
}

export async function removeSessionParticipantAction(input: {
  sessionCode: string;
  participantId: string;
}): Promise<SessionParticipantActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    const participant = await findParticipantById(input.participantId);

    if (!participant || participant.sessionId !== session.id) {
      return {
        ok: false,
        message: "Jogador nao encontrado nesta mesa."
      };
    }

    if (participant.role !== "player") {
      return {
        ok: false,
        message: "Apenas jogadores podem ser removidos da mesa."
      };
    }

    const removedParticipant = await removeSessionParticipant({
      sessionId: session.id,
      participantId: participant.id
    });

    await recordSessionMemory({
      sessionId: session.id,
      actorParticipantId: viewer.participantId,
      targetParticipantId: removedParticipant.id,
      category: "private",
      title: `${removedParticipant.displayName} foi removido da mesa`,
      detail: "O mestre encerrou o vinculo deste jogador com a sessao."
    });

    return {
      ok: true,
      participantId: removedParticipant.id
    };
  } catch (error) {
    return {
      ok: false,
      message:
        formatActionError(error) ?? "Falha ao remover o jogador da sessao."
    };
  }
}

export async function linkViewerToAuthAction(input: {
  sessionCode: string;
  accessToken: string;
}): Promise<SessionAuthActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const [{ session, viewer }, authUser] = await Promise.all([
      requireSessionViewer(input.sessionCode),
      verifySupabaseAccessToken(input.accessToken)
    ]);

    const participant = await linkParticipantToAuthUser({
      sessionId: session.id,
      participantId: viewer.participantId,
      authUserId: authUser.id
    });

    if (participant.role === "gm") {
      await linkSessionOwnerToAuthUser({
        sessionId: session.id,
        authUserId: authUser.id
      });
    }

    return {
      ok: true,
      linked: true
    };
  } catch (error) {
    return {
      ok: false,
      message: formatActionError(error) ?? "Falha ao vincular o perfil autenticado."
    };
  }
}

export async function restoreSessionViewerByAuthAction(input: {
  sessionCode: string;
  role: "gm" | "player";
  accessToken: string;
}): Promise<SessionAuthActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const [authUser, session] = await Promise.all([
      verifySupabaseAccessToken(input.accessToken),
      findSessionByCode(input.sessionCode)
    ]);

    if (!session) {
      return {
        ok: false,
        message: "Sessao nao encontrada."
      };
    }

    const participant = await findParticipantByAuthUser({
      sessionId: session.id,
      role: input.role,
      authUserId: authUser.id
    });

    if (!participant) {
      return {
        ok: false,
        message: "Este perfil autenticado ainda nao esta vinculado a essa sala."
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(buildSessionViewerCookie(buildViewerIdentity(session, participant)));

    return {
      ok: true,
      route: `/session/${session.code}/${participant.role === "gm" ? "gm" : "player"}`
    };
  } catch (error) {
    return {
      ok: false,
      message: formatActionError(error) ?? "Falha ao restaurar a sessao pelo perfil."
    };
  }
}

export async function listLinkedSessionsByAuthAction(input: {
  accessToken: string;
}) {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      sessions: [],
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const authUser = await verifySupabaseAccessToken(input.accessToken);
    const sessions = await listLinkedSessionsByAuthUser(authUser.id);

    return {
      ok: true,
      sessions
    };
  } catch (error) {
    return {
      ok: false,
      sessions: [],
      message: formatActionError(error) ?? "Falha ao listar as sessoes vinculadas."
    };
  }
}
