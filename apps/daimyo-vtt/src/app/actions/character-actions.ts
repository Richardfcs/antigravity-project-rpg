"use server";

import {
  adjustCharacterInitiative,
  adjustCharacterResource,
  createSessionCharacter,
  findSessionCharacterById,
  updateSessionCharacterProfile
} from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import { requireSessionViewer } from "@/lib/session/access";
import { findParticipantById } from "@/lib/session/repository";
import { findSessionAssetById } from "@/lib/assets/repository";
import type { SessionCharacterRecord, CharacterType } from "@/types/character";

interface CharacterActionResult {
  ok: boolean;
  character?: SessionCharacterRecord;
  message?: string;
}

interface CreateCharacterInput {
  sessionCode: string;
  name: string;
  type: CharacterType;
  ownerParticipantId?: string | null;
  assetId?: string | null;
  hpMax: number;
  fpMax: number;
  initiative?: number;
}

interface AdjustCharacterResourceInput {
  sessionCode: string;
  characterId: string;
  resource: "hp" | "fp";
  delta: number;
}

interface AdjustCharacterInitiativeInput {
  sessionCode: string;
  characterId: string;
  delta: number;
}

interface UpdateCharacterProfileInput {
  sessionCode: string;
  characterId: string;
  name?: string;
  type?: CharacterType;
  ownerParticipantId?: string | null;
  assetId?: string | null;
}

function buildInfraError() {
  return {
    ok: false,
    message: "O Supabase Service Role ainda não está configurado."
  } satisfies CharacterActionResult;
}

export async function createCharacterAction(
  input: CreateCharacterInput
): Promise<CharacterActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const ownerParticipantId =
      input.type === "player" ? (input.ownerParticipantId ?? null) : null;

    if (ownerParticipantId) {
      const participant = await findParticipantById(ownerParticipantId);

      if (!participant || participant.sessionId !== session.id) {
        throw new Error("O jogador selecionado não pertence a esta sessão.");
      }
    }

    if (input.assetId) {
      const asset = await findSessionAssetById(input.assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O asset selecionado não pertence a esta sessão.");
      }
    }

    const character = await createSessionCharacter({
      sessionId: session.id,
      name: input.name,
      type: input.type,
      ownerParticipantId,
      assetId: input.assetId ?? null,
      hpMax: input.hpMax,
      fpMax: input.fpMax,
      initiative: input.initiative ?? 0
    });

    return { ok: true, character };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao criar o personagem."
    };
  }
}

export async function adjustCharacterResourceAction(
  input: AdjustCharacterResourceInput
): Promise<CharacterActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const character = await findSessionCharacterById(input.characterId);

    if (!character || character.sessionId !== session.id) {
      throw new Error("Personagem não encontrado nesta sessão.");
    }

    const ownsCharacter = character.ownerParticipantId === viewer.participantId;

    if (viewer.role !== "gm" && !ownsCharacter) {
      throw new Error("Você só pode alterar a ficha vinculada ao seu navegador.");
    }

    const updated = await adjustCharacterResource({
      characterId: input.characterId,
      resource: input.resource,
      delta: input.delta
    });

    return { ok: true, character: updated };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao atualizar PV/PF."
    };
  }
}

export async function adjustCharacterInitiativeAction(
  input: AdjustCharacterInitiativeInput
): Promise<CharacterActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const character = await findSessionCharacterById(input.characterId);

    if (!character || character.sessionId !== session.id) {
      throw new Error("Personagem não encontrado nesta sessão.");
    }

    const updated = await adjustCharacterInitiative({
      characterId: input.characterId,
      delta: input.delta
    });

    return { ok: true, character: updated };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao atualizar a iniciativa."
    };
  }
}

export async function updateCharacterProfileAction(
  input: UpdateCharacterProfileInput
): Promise<CharacterActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const character = await findSessionCharacterById(input.characterId);

    if (!character || character.sessionId !== session.id) {
      throw new Error("Ficha nao encontrada nesta sessao.");
    }

    const nextType = input.type ?? character.type;
    const nextOwnerParticipantId =
      input.ownerParticipantId !== undefined
        ? nextType === "player"
          ? input.ownerParticipantId
          : null
        : nextType === "player"
          ? character.ownerParticipantId
          : null;

    if (nextOwnerParticipantId) {
      const participant = await findParticipantById(nextOwnerParticipantId);

      if (!participant || participant.sessionId !== session.id) {
        throw new Error("O jogador selecionado nao pertence a esta sessao.");
      }
    }

    if (input.assetId) {
      const asset = await findSessionAssetById(input.assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O recurso selecionado nao pertence a esta sessao.");
      }
    }

    const updated = await updateSessionCharacterProfile({
      characterId: character.id,
      name: input.name,
      type: nextType,
      ownerParticipantId: nextOwnerParticipantId,
      assetId: input.assetId
    });

    return { ok: true, character: updated };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao atualizar a ficha."
    };
  }
}
