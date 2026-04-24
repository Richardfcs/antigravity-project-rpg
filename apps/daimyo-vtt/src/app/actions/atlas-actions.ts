"use server";

import { findSessionAssetById } from "@/lib/assets/repository";
import {
  activateSessionAtlasMap,
  createSessionAtlasMap,
  createSessionAtlasPin,
  deleteSessionAtlasMapEntry,
  deleteSessionAtlasPinEntry,
  findSessionAtlasMapById,
  findSessionAtlasPinById,
  updateSessionAtlasPinDetails,
  updateSessionAtlasPinPosition,
  updateSessionAtlasMap
} from "@/lib/atlas/repository";
import { findSessionCharacterById } from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import { createSessionMemoryEvent } from "@/lib/session/memory-repository";
import { requireSessionViewer } from "@/lib/session/access";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";

interface AtlasActionResult {
  ok: boolean;
  atlasMap?: SessionAtlasMapRecord;
  pin?: SessionAtlasPinRecord;
  pinCharacters?: SessionAtlasPinCharacterRecord[];
  message?: string;
}

const atlasAssetKinds = new Set(["map"]);
const atlasPaintingKinds = new Set(["background"]);

function buildInfraError(): AtlasActionResult {
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
    // O atlas continua operando mesmo se o historico falhar.
  }
}

function describeAtlasRevealChange(input: {
  previousNameVisible: boolean;
  nextNameVisible: boolean;
  previousDetailsVisible: boolean;
  nextDetailsVisible: boolean;
  previousQuestMarked: boolean;
  nextQuestMarked: boolean;
  pinTitle: string;
}) {
  if (!input.previousDetailsVisible && input.nextDetailsVisible) {
    return {
      title: "Detalhes revelados",
      detail: `Os detalhes de ${input.pinTitle} foram abertos aos jogadores.`
    };
  }

  if (input.previousDetailsVisible && !input.nextDetailsVisible) {
    return {
      title: "Detalhes velados",
      detail: `Os detalhes de ${input.pinTitle} voltaram a ficar ocultos.`
    };
  }

  if (!input.previousNameVisible && input.nextNameVisible) {
    return {
      title: "Nome revelado",
      detail: `O nome de ${input.pinTitle} agora pode ser visto pelos jogadores.`
    };
  }

  if (input.previousNameVisible && !input.nextNameVisible) {
    return {
      title: "Nome velado",
      detail: `O nome de ${input.pinTitle} voltou a ficar oculto.`
    };
  }

  if (!input.previousQuestMarked && input.nextQuestMarked) {
    return {
      title: "Pista marcada",
      detail: `${input.pinTitle} recebeu uma marca de pista.`
    };
  }

  if (input.previousQuestMarked && !input.nextQuestMarked) {
    return {
      title: "Pista recolhida",
      detail: `${input.pinTitle} deixou de marcar uma pista.`
    };
  }

  return null;
}

export async function createAtlasMapAction(input: {
  sessionCode: string;
  name: string;
  assetId?: string | null;
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    if (input.assetId) {
      const asset = await findSessionAssetById(input.assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O mapa-base selecionado nao pertence a esta sessao.");
      }

      if (!atlasAssetKinds.has(asset.kind)) {
        throw new Error("Selecione um asset do tipo map para o atlas.");
      }
    }

    const atlasMap = await createSessionAtlasMap({
      sessionId: session.id,
      name: input.name,
      assetId: input.assetId ?? null
    });

    return { ok: true, atlasMap };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao criar o atlas."
    };
  }
}

export async function activateAtlasMapAction(input: {
  sessionCode: string;
  atlasMapId: string;
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const atlasMap = await activateSessionAtlasMap({
      sessionId: session.id,
      atlasMapId: input.atlasMapId
    });

    return { ok: true, atlasMap };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao ativar o atlas."
    };
  }
}

export async function deleteAtlasMapAction(input: {
  sessionCode: string;
  atlasMapId: string;
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const atlasMap = await findSessionAtlasMapById(input.atlasMapId);

    if (!atlasMap || atlasMap.sessionId !== session.id) {
      throw new Error("Atlas nao encontrado nesta sessao.");
    }

    const removed = await deleteSessionAtlasMapEntry(atlasMap.id);
    return { ok: true, atlasMap: removed };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao remover o atlas."
    };
  }
}

export async function updateAtlasMapAction(input: {
  sessionCode: string;
  atlasMapId: string;
  name?: string;
  assetId?: string | null;
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    
    if (input.assetId) {
      const asset = await findSessionAssetById(input.assetId);
      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O mapa-base selecionado nao pertence a esta sessao.");
      }
    }

    const atlasMap = await updateSessionAtlasMap({
      sessionId: session.id,
      atlasMapId: input.atlasMapId,
      name: input.name,
      assetId: input.assetId
    });

    return { ok: true, atlasMap };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao atualizar o atlas."
    };
  }
}

export async function createAtlasPinAction(input: {
  sessionCode: string;
  atlasMapId: string;
  title: string;
  description?: string;
  isVisibleToPlayers?: boolean;
  isNameVisibleToPlayers?: boolean;
  isQuestMarked?: boolean;
  x: number;
  y: number;
  imageAssetId?: string | null;
  submapAssetId?: string | null;
  characterIds?: string[];
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const atlasMap = await findSessionAtlasMapById(input.atlasMapId);

    if (!atlasMap || atlasMap.sessionId !== session.id) {
      throw new Error("Atlas nao encontrado nesta sessao.");
    }

    if (input.imageAssetId) {
      const imageAsset = await findSessionAssetById(input.imageAssetId);

      if (!imageAsset || imageAsset.sessionId !== session.id) {
        throw new Error("A imagem do local nao pertence a esta sessao.");
      }

      if (!atlasPaintingKinds.has(imageAsset.kind)) {
        throw new Error("Use apenas pinturas do tipo background para ilustrar o local.");
      }
    }

    if (input.submapAssetId) {
      const submapAsset = await findSessionAssetById(input.submapAssetId);

      if (!submapAsset || submapAsset.sessionId !== session.id) {
        throw new Error("O submapa nao pertence a esta sessao.");
      }

      if (!atlasAssetKinds.has(submapAsset.kind)) {
        throw new Error("O submapa deve usar um asset do tipo map.");
      }
    }

    if (input.characterIds?.length) {
      for (const characterId of input.characterIds) {
        const character = await findSessionCharacterById(characterId);

        if (!character || character.sessionId !== session.id) {
          throw new Error("Um dos personagens vinculados nao pertence a esta sessao.");
        }
      }
    }

    const result = await createSessionAtlasPin({
      sessionId: session.id,
      atlasMapId: input.atlasMapId,
      title: input.title,
      description: input.description,
      isVisibleToPlayers: input.isVisibleToPlayers ?? false,
      isNameVisibleToPlayers: input.isNameVisibleToPlayers ?? false,
      isQuestMarked: input.isQuestMarked ?? false,
      x: input.x,
      y: input.y,
      imageAssetId: input.imageAssetId ?? null,
      submapAssetId: input.submapAssetId ?? null,
      characterIds: input.characterIds ?? []
    });

    return { ok: true, pin: result.pin, pinCharacters: result.pinCharacters };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao criar o pin."
    };
  }
}

export async function deleteAtlasPinAction(input: {
  sessionCode: string;
  pinId: string;
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const pin = await findSessionAtlasPinById(input.pinId);

    if (!pin || pin.sessionId !== session.id) {
      throw new Error("Pin nao encontrado nesta sessao.");
    }

    const removed = await deleteSessionAtlasPinEntry(pin.id);
    return { ok: true, pin: removed };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao remover o pin."
    };
  }
}

export async function updateAtlasPinPositionAction(input: {
  sessionCode: string;
  pinId: string;
  x: number;
  y: number;
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const pin = await updateSessionAtlasPinPosition({
      sessionId: session.id,
      pinId: input.pinId,
      x: input.x,
      y: input.y
    });

    return { ok: true, pin };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao mover o pin."
    };
  }
}

export async function updateAtlasPinDetailsAction(input: {
  sessionCode: string;
  pinId: string;
  title?: string;
  description?: string;
  isVisibleToPlayers?: boolean;
  isNameVisibleToPlayers?: boolean;
  isQuestMarked?: boolean;
  imageAssetId?: string | null;
  submapAssetId?: string | null;
  characterIds?: string[];
}): Promise<AtlasActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    const pin = await findSessionAtlasPinById(input.pinId);

    if (!pin || pin.sessionId !== session.id) {
      throw new Error("Pin nao encontrado nesta sessao.");
    }

    if (input.imageAssetId) {
      const imageAsset = await findSessionAssetById(input.imageAssetId);

      if (!imageAsset || imageAsset.sessionId !== session.id) {
        throw new Error("A imagem do pin nao pertence a esta sessao.");
      }

      if (!atlasPaintingKinds.has(imageAsset.kind)) {
        throw new Error("Use apenas pinturas do tipo background para ilustrar o local.");
      }
    }

    if (input.submapAssetId) {
      const submapAsset = await findSessionAssetById(input.submapAssetId);

      if (!submapAsset || submapAsset.sessionId !== session.id) {
        throw new Error("O submapa nao pertence a esta sessao.");
      }

      if (!atlasAssetKinds.has(submapAsset.kind)) {
        throw new Error("O submapa deve usar um asset do tipo map.");
      }
    }

    if (input.characterIds?.length) {
      for (const characterId of input.characterIds) {
        const character = await findSessionCharacterById(characterId);

        if (!character || character.sessionId !== session.id) {
          throw new Error("Um dos personagens vinculados nao pertence a esta sessao.");
        }
      }
    }

    const updated = await updateSessionAtlasPinDetails({
      sessionId: session.id,
      pinId: input.pinId,
      title: input.title,
      description: input.description,
      isVisibleToPlayers: input.isVisibleToPlayers,
      isNameVisibleToPlayers: input.isNameVisibleToPlayers,
      isQuestMarked: input.isQuestMarked,
      imageAssetId: input.imageAssetId,
      submapAssetId: input.submapAssetId,
      characterIds: input.characterIds
    });

    const revealChange = describeAtlasRevealChange({
      previousNameVisible: pin.isNameVisibleToPlayers,
      nextNameVisible: updated.pin.isNameVisibleToPlayers,
      previousDetailsVisible: pin.isVisibleToPlayers,
      nextDetailsVisible: updated.pin.isVisibleToPlayers,
      previousQuestMarked: pin.isQuestMarked,
      nextQuestMarked: updated.pin.isQuestMarked,
      pinTitle: updated.pin.title
    });

    if (revealChange) {
      await recordSessionMemory({
        sessionId: session.id,
        actorParticipantId: viewer.participantId,
        category: "atlas",
        title: revealChange.title,
        detail: revealChange.detail,
        atlasMapId: updated.pin.atlasMapId,
        atlasPinId: updated.pin.id,
        stageMode: "atlas"
      });
    }

    return {
      ok: true,
      pin: updated.pin,
      pinCharacters: updated.pinCharacters
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao atualizar o pin."
    };
  }
}
