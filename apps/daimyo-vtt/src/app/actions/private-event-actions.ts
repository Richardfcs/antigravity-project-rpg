"use server";

import { findSessionAssetById } from "@/lib/assets/repository";
import { getInfraReadiness } from "@/lib/env";
import {
  consumePrivateEvent,
  createPrivateEvent,
  findPrivateEventById
} from "@/lib/private-events/repository";
import { createSessionMemoryEvent } from "@/lib/session/memory-repository";
import { requireSessionViewer } from "@/lib/session/access";
import { findParticipantById } from "@/lib/session/repository";
import type { SessionPrivateEventRecord, PrivateEventKind } from "@/types/immersive-event";

interface PrivateEventActionResult {
  ok: boolean;
  event?: SessionPrivateEventRecord;
  message?: string;
}

const privateEventKinds = new Set<PrivateEventKind>([
  "panic",
  "kegare",
  "secret",
  "blood",
  "shake",
  "combat"
]);

function buildInfraError(): PrivateEventActionResult {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  };
}

async function recordSessionMemory(
  input: Parameters<typeof createSessionMemoryEvent>[0]
) {
  try {
    await createSessionMemoryEvent(input);
  } catch {
    // O evento privado principal nao deve falhar por causa do historico.
  }
}

export async function sendPrivateEventAction(input: {
  sessionCode: string;
  targetParticipantId: string;
  kind: PrivateEventKind;
  title: string;
  body: string;
  imageAssetId?: string | null;
  payload?: Record<string, unknown> | null;
  intensity?: number;
  durationMs?: number;
}): Promise<PrivateEventActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");

    if (!privateEventKinds.has(input.kind)) {
      throw new Error("Tipo de evento privado invalido.");
    }

    const target = await findParticipantById(input.targetParticipantId);

    if (!target || target.sessionId !== session.id) {
      throw new Error("Jogador alvo nao encontrado nesta sessao.");
    }

    if (input.imageAssetId) {
      const asset = await findSessionAssetById(input.imageAssetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("A imagem do evento nao pertence a esta sessao.");
      }
    }

    const event = await createPrivateEvent({
      sessionId: session.id,
      targetParticipantId: target.id,
      sourceParticipantId: viewer.participantId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      imageAssetId: input.imageAssetId ?? null,
      ...(input.payload !== undefined ? { payload: input.payload } : {}),
      intensity: input.intensity,
      durationMs: input.durationMs
    });

    await recordSessionMemory({
      sessionId: session.id,
      actorParticipantId: viewer.participantId,
      targetParticipantId: target.id,
      category: "private-event",
      title: input.title,
      detail: `Sinal enviado para ${target.displayName}.`
    });

    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao enviar o evento privado."
    };
  }
}

export async function consumePrivateEventAction(input: {
  sessionCode: string;
  eventId: string;
}): Promise<PrivateEventActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const event = await findPrivateEventById(input.eventId);

    if (!event || event.sessionId !== session.id) {
      throw new Error("Evento privado nao encontrado nesta sessao.");
    }

    if (viewer.role !== "gm" && event.targetParticipantId !== viewer.participantId) {
      throw new Error("Voce nao pode consumir um evento privado de outro jogador.");
    }

    const consumed = await consumePrivateEvent(event.id);
    return { ok: true, event: consumed };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao consumir o evento privado."
    };
  }
}
