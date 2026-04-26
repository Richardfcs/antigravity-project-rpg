"use server";

import { rollDiceFormula, formatRollSummary } from "@/lib/dice/gurps";
import { getInfraReadiness } from "@/lib/env";
import { createSessionMessage, clearSessionMessages } from "@/lib/chat/repository";
import { requireSessionViewer } from "@/lib/session/access";
import type { SessionMessageRecord } from "@/types/message";

interface ChatActionResult {
  ok: boolean;
  message?: SessionMessageRecord;
  error?: string;
}

function buildInfraError(): ChatActionResult {
  return {
    ok: false,
    error: "O Supabase Service Role ainda nao esta configurado."
  };
}

export async function sendChatMessageAction(input: {
  sessionCode: string;
  body: string;
  isPrivate?: boolean;
}): Promise<ChatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const message = await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: input.isPrivate ? "master-log" : "chat",
      body: input.body,
      isPrivate: input.isPrivate ?? false
    });

    return { ok: true, message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao enviar a mensagem."
    };
  }
}

export async function rollDiceAction(input: {
  sessionCode: string;
  formula: string;
  target?: number | null;
  label?: string | null;
  isPrivate?: boolean;
  tokenId?: string | null;
}): Promise<ChatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const payload = rollDiceFormula(input.formula, input.target, input.label);
    const message = await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "roll",
      body: formatRollSummary(payload),
      payload: { 
        ...payload as unknown as Record<string, unknown>,
        tokenId: input.tokenId || null
      },
      isPrivate: input.isPrivate ?? false
    });

    return { ok: true, message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao rolar os dados."
    };
  }
}

export async function clearChatAction(input: {
  sessionCode: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    
    if (viewer.role !== "gm") {
      return { ok: false, error: "Apenas o mestre pode limpar o chat." };
    }

    await clearSessionMessages(session.id);
    
    // Log da ação de limpeza
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "master-log",
      body: "O mestre limpou o historico de mensagens da sessao.",
      isPrivate: true
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao limpar o chat."
    };
  }
}
