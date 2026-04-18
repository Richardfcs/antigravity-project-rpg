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
  updateSessionAtlasPinPosition
} from "@/lib/atlas/repository";
import { findSessionCharacterById } from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
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

function buildInfraError(): AtlasActionResult {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  };
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
      message: error instanceof Error ? error.message : "Falha ao remover o atlas."
    };
  }
}

export async function createAtlasPinAction(input: {
  sessionCode: string;
  atlasMapId: string;
  title: string;
  description?: string;
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
  imageAssetId?: string | null;
  submapAssetId?: string | null;
  characterIds?: string[];
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

    if (input.imageAssetId) {
      const imageAsset = await findSessionAssetById(input.imageAssetId);

      if (!imageAsset || imageAsset.sessionId !== session.id) {
        throw new Error("A imagem do pin nao pertence a esta sessao.");
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
      imageAssetId: input.imageAssetId,
      submapAssetId: input.submapAssetId,
      characterIds: input.characterIds
    });

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
