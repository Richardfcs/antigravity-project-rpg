"use server";

import { rollDiceFormula, formatRollSummary } from "@/lib/dice/gurps";
import { getInfraReadiness } from "@/lib/env";
import { createSessionMessage } from "@/lib/chat/repository";
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
      kind: "chat",
      body: input.body
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
      payload: payload as unknown as Record<string, unknown>
    });

    return { ok: true, message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao rolar os dados."
    };
  }
}
