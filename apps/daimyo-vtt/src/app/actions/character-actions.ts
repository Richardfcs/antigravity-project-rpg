"use server";

export async function setActiveCharacterAction(input: {
  sessionCode: string;
  characterId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { getInfraReadiness } = await import("@/lib/env");
  const { requireSessionViewer } = await import("@/lib/session/access");
  const { listSessionCharacters, updateSessionCharacterProfile } = await import("@/lib/characters/repository");

  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    
    const allCharacters = await listSessionCharacters(session.id);
    const myCharacters = allCharacters.filter(c => c.ownerParticipantId === viewer.participantId);
    
    if (!myCharacters.some(c => c.id === input.characterId)) {
      throw new Error("Você não possui permissão para ativar esta ficha.");
    }

    await Promise.all(myCharacters.map(c => {
      const isPrimary = c.id === input.characterId;
      const nextRaw = { ...(c.sheetProfile?.raw || {}), isPrimary };
      return updateSessionCharacterProfile({
        characterId: c.id,
        sheetProfile: {
          ...(c.sheetProfile || { version: 1, attributes: { st: 10, dx: 10, iq: 10, ht: 10, hpMax: 10, fpMax: 10, will: 10, per: 10 }, derived: { basicSpeed: 5, move: 5, encumbranceLevel: 0 }, defenses: { dodge: 8, parry: 8, block: 0 }, style: { name: "Básico" }, skills: [], techniques: [], weapons: [], armor: [], notes: [], conditions: [], combat: { currentHp: 10, currentFp: 10, activeWeaponId: null, activeWeaponModeId: null, loadoutTechniqueIds: [], posture: "standing", shock: 0, bleeding: 0, evaluateBonus: 0 } }),
          raw: nextRaw
        }
      });
    }));

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao ativar a ficha."
    };
  }
}

import {
  adjustCharacterInitiative,
  adjustCharacterResource,
  createSessionCharacter,
  deleteSessionCharacter,
  findSessionCharacterById,
  updateSessionCharacterProfile,
  updateCharacterResource
} from "@/lib/characters/repository";
import {
  buildSheetProfileFromBaseTemplate,
  deriveSummaryFromSheetProfile
} from "@/lib/combat/sheet-profile";
import { findBaseArchetypeById, loadBaseCatalog } from "@/lib/content-bridge/base-loader";
import { getInfraReadiness } from "@/lib/env";
import { requireSessionViewer } from "@/lib/session/access";
import { findParticipantById } from "@/lib/session/repository";
import { findSessionAssetById } from "@/lib/assets/repository";
import type { SessionCharacterRecord, CharacterType, CharacterTier } from "@/types/character";
import type { SessionCharacterSheetProfile } from "@/types/combat";

interface CharacterActionResult {
  ok: boolean;
  character?: SessionCharacterRecord;
  message?: string;
}

interface CreateCharacterInput {
  sessionCode: string;
  name: string;
  type: CharacterType;
  tier: CharacterTier;
  ownerParticipantId?: string | null;
  assetId?: string | null;
  hpMax: number;
  fpMax: number;
  initiative?: number;
  sheetProfile?: SessionCharacterSheetProfile | null;
}

interface AdjustCharacterResourceInput {
  sessionCode: string;
  characterId: string;
  resource: "hp" | "fp";
  delta: number;
}

interface UpdateCharacterResourceInput {
  sessionCode: string;
  characterId: string;
  resource: "hp" | "fp";
  value: number;
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
  tier?: CharacterTier;
  ownerParticipantId?: string | null;
  assetId?: string | null;
  sheetProfile?: SessionCharacterSheetProfile | null;
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
      tier: input.tier,
      ownerParticipantId,
      assetId: input.assetId ?? null,
      hpMax: input.hpMax,
      fpMax: input.fpMax,
      initiative: input.initiative ?? 0,
      sheetProfile: input.sheetProfile ?? null
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

export async function updateCharacterResourceAction(
  input: UpdateCharacterResourceInput
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

    const updated = await updateCharacterResource({
      characterId: input.characterId,
      resource: input.resource,
      value: input.value
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
      tier: input.tier ?? character.tier,
      ownerParticipantId: nextOwnerParticipantId,
      assetId: input.assetId,
      sheetProfile: input.sheetProfile
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

export async function deleteCharacterAction(input: {
  sessionCode: string;
  characterId: string;
}): Promise<CharacterActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const character = await findSessionCharacterById(input.characterId);

    if (!character || character.sessionId !== session.id) {
      throw new Error("Ficha nao encontrada nesta sessao.");
    }

    const removed = await deleteSessionCharacter(input.characterId);

    return { ok: true, character: removed };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao remover a ficha."
    };
  }
}

export async function applyBaseArchetypeAction(input: {
  sessionCode: string;
  characterId: string;
  archetypeId: string;
}): Promise<CharacterActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const character = await findSessionCharacterById(input.characterId);

    if (!character || character.sessionId !== session.id) {
      throw new Error("Ficha não encontrada nesta sessão.");
    }

    const archetype = await findBaseArchetypeById(input.archetypeId);
    if (!archetype) {
      throw new Error("Arquétipo não encontrado.");
    }

    const sheetProfile = buildSheetProfileFromBaseTemplate(archetype);

    const updated = await updateSessionCharacterProfile({
      characterId: character.id,
      sheetProfile
    });

    return { ok: true, character: updated };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao aplicar arquétipo."
    };
  }
}

export async function getBaseArchetypesAction(input: {
  sessionCode: string;
}): Promise<{ ok: boolean; archetypes: any[]; message?: string }> {
  try {
    await requireSessionViewer(input.sessionCode, "gm");
    const catalog = await loadBaseCatalog();
    return { ok: true, archetypes: catalog.archetypes };
  } catch (error) {
    return {
      ok: false,
      archetypes: [],
      message: error instanceof Error ? error.message : "Falha ao carregar arquétipos."
    };
  }
}
