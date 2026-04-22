"use server";

import { getInfraReadiness } from "@/lib/env";
import {
  createSessionEffectLayer,
  deleteSessionEffectLayer,
  findSessionEffectLayerById
} from "@/lib/effects/repository";
import { requireSessionViewer } from "@/lib/session/access";
import { findParticipantById } from "@/lib/session/repository";
import type {
  SessionEffectLayerRecord,
  SessionEffectPreset
} from "@/types/immersive-event";

interface EffectActionResult {
  ok: boolean;
  effect?: SessionEffectLayerRecord;
  message?: string;
}

const supportedEffects = new Set<SessionEffectPreset>([
  "sunny",
  "night",
  "city-night",
  "rain",
  "storm",
  "snow",
  "sakura",
  "sand",
  "kegare-medium",
  "kegare-max",
  "injured-light",
  "injured-heavy",
  "downed",
  "tainted-low",
  "tainted-high",
  "tainted-max",
  "calm",
  "joy",
  "sad",
  "silhouette",
  "whisper-fog",
  "omen-red",
  "void-pressure",
  "fever-dream",
  "revelation",
  "dread"
]);

function buildInfraError(): EffectActionResult {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  };
}

export async function createEffectLayerAction(input: {
  sessionCode: string;
  targetParticipantId?: string | null;
  preset: SessionEffectPreset;
  note?: string;
  intensity?: number;
  durationMs?: number | null;
}): Promise<EffectActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");

    if (!supportedEffects.has(input.preset)) {
      throw new Error("Preset de efeito invalido.");
    }

    if (input.targetParticipantId) {
      const participant = await findParticipantById(input.targetParticipantId);

      if (!participant || participant.sessionId !== session.id) {
        throw new Error("O alvo escolhido nao pertence a esta sessao.");
      }
    }

    const effect = await createSessionEffectLayer({
      sessionId: session.id,
      targetParticipantId: input.targetParticipantId ?? null,
      sourceParticipantId: viewer.participantId,
      preset: input.preset,
      note: input.note,
      intensity: input.intensity,
      durationMs: input.durationMs
    });

    return { ok: true, effect };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao aplicar o efeito."
    };
  }
}

export async function deleteEffectLayerAction(input: {
  sessionCode: string;
  effectId: string;
}): Promise<EffectActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const effect = await findSessionEffectLayerById(input.effectId);

    if (!effect || effect.sessionId !== session.id) {
      throw new Error("Efeito nao encontrado nesta sessao.");
    }

    const removed = await deleteSessionEffectLayer(effect.id);
    return { ok: true, effect: removed };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao remover o efeito."
    };
  }
}
