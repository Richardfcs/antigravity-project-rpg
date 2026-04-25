"use server";

import { findSessionAssetById } from "@/lib/assets/repository";
import {
  createSessionCharacter,
  findSessionCharacterByAssetId,
  findSessionCharacterById
} from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import {
  activateSessionMap,
  createMapTokenEntry,
  createSessionMap,
  deleteSessionMapEntry,
  deleteMapTokenEntry,
  findMapTokenById,
  findSessionMapById,
  updateSessionMapEntry,
  updateMapTokenEntry,
  updateMapTokenPosition
} from "@/lib/maps/repository";
import { requireSessionViewer } from "@/lib/session/access";
import type {
  MapTokenRecord,
  SessionMapRecord,
  TokenFaction,
  TokenStatusPreset
} from "@/types/map";

interface MapActionResult {
  ok: boolean;
  map?: SessionMapRecord;
  token?: MapTokenRecord;
  message?: string;
}

const tacticalMapKinds = new Set(["grid", "map"]);
const tokenAssetKinds = new Set(["token", "portrait", "npc"]);
const allowedFactions = new Set<TokenFaction>(["ally", "enemy", "neutral"]);
const allowedTokenStatuses = new Set<TokenStatusPreset>([
  "dead",
  "poisoned",
  "sleeping",
  "wounded",
  "stunned",
  "hidden",
  "burning",
  "cursed",
  "collapsed",
  "below_zero"
]);

function buildInfraError(): MapActionResult {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  };
}

export async function createMapAction(input: {
  sessionCode: string;
  name: string;
  backgroundAssetId?: string | null;
  defaultAllyAssetId?: string | null;
  defaultEnemyAssetId?: string | null;
  defaultNeutralAssetId?: string | null;
  gridEnabled?: boolean;
  gridSize?: number;
  width?: number;
  height?: number;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    let resolvedWidth = input.width;
    let resolvedHeight = input.height;
    const defaultAssetIds = [
      input.defaultAllyAssetId,
      input.defaultEnemyAssetId,
      input.defaultNeutralAssetId
    ].filter((value): value is string => Boolean(value));

    if (input.backgroundAssetId) {
      const asset = await findSessionAssetById(input.backgroundAssetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O mapa selecionado nao pertence a esta sessao.");
      }

      if (!tacticalMapKinds.has(asset.kind)) {
        throw new Error("Selecione um asset do tipo grid ou map para o campo tatico.");
      }

      if (!resolvedWidth && asset.width) {
        resolvedWidth = asset.width;
      }

      if (!resolvedHeight && asset.height) {
        resolvedHeight = asset.height;
      }
    }

    for (const assetId of defaultAssetIds) {
      const asset = await findSessionAssetById(assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("Um dos retratos padrao nao pertence a esta sessao.");
      }

      if (!tokenAssetKinds.has(asset.kind)) {
        throw new Error("Use assets token, portrait ou npc como retratos padrao do mapa.");
      }
    }

    const map = await createSessionMap({
      sessionId: session.id,
      name: input.name,
      backgroundAssetId: input.backgroundAssetId ?? null,
      defaultAllyAssetId: input.defaultAllyAssetId ?? null,
      defaultEnemyAssetId: input.defaultEnemyAssetId ?? null,
      defaultNeutralAssetId: input.defaultNeutralAssetId ?? null,
      gridEnabled: input.gridEnabled ?? true,
      gridSize: input.gridSize ?? 64,
      width: resolvedWidth,
      height: resolvedHeight
    });

    return { ok: true, map };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao criar o mapa."
    };
  }
}

export async function updateMapAction(input: {
  sessionCode: string;
  mapId: string;
  name?: string;
  backgroundAssetId?: string | null;
  defaultAllyAssetId?: string | null;
  defaultEnemyAssetId?: string | null;
  defaultNeutralAssetId?: string | null;
  gridEnabled?: boolean;
  gridSize?: number;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const map = await findSessionMapById(input.mapId);

    if (!map || map.sessionId !== session.id) {
      throw new Error("Mapa nao encontrado nesta sessao.");
    }

    const assetIds = [
      input.backgroundAssetId,
      input.defaultAllyAssetId,
      input.defaultEnemyAssetId,
      input.defaultNeutralAssetId
    ].filter((value): value is string => Boolean(value));

    for (const assetId of assetIds) {
      const asset = await findSessionAssetById(assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("Um dos assets selecionados nao pertence a esta sessao.");
      }
    }

    if (input.backgroundAssetId) {
      const asset = await findSessionAssetById(input.backgroundAssetId);

      if (!asset || !tacticalMapKinds.has(asset.kind)) {
        throw new Error("Selecione um asset do tipo grid ou map para o fundo do mapa.");
      }
    }

    const defaultAssets = [
      input.defaultAllyAssetId,
      input.defaultEnemyAssetId,
      input.defaultNeutralAssetId
    ].filter((value): value is string => Boolean(value));

    for (const assetId of defaultAssets) {
      const asset = await findSessionAssetById(assetId);

      if (!asset || !tokenAssetKinds.has(asset.kind)) {
        throw new Error("Os retratos padrao precisam ser token, portrait ou npc.");
      }
    }

    const updated = await updateSessionMapEntry({
      mapId: map.id,
      name: input.name,
      backgroundAssetId: input.backgroundAssetId,
      defaultAllyAssetId: input.defaultAllyAssetId,
      defaultEnemyAssetId: input.defaultEnemyAssetId,
      defaultNeutralAssetId: input.defaultNeutralAssetId,
      gridEnabled: input.gridEnabled,
      gridSize: input.gridSize
    });

    return { ok: true, map: updated };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao atualizar o mapa."
    };
  }
}

export async function deleteMapAction(input: {
  sessionCode: string;
  mapId: string;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const map = await findSessionMapById(input.mapId);

    if (!map || map.sessionId !== session.id) {
      throw new Error("Mapa nao encontrado nesta sessao.");
    }

    const removed = await deleteSessionMapEntry(map.id);

    return { ok: true, map: removed };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao remover o mapa."
    };
  }
}

export async function activateMapAction(input: {
  sessionCode: string;
  mapId: string;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const map = await activateSessionMap({
      sessionId: session.id,
      mapId: input.mapId
    });

    return { ok: true, map };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao ativar o mapa."
    };
  }
}

export async function addTokenToMapAction(input: {
  sessionCode: string;
  mapId: string;
  characterId: string;
  faction?: TokenFaction | null;
  statusEffects?: TokenStatusPreset[];
  x?: number;
  y?: number;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const [map, character] = await Promise.all([
      findSessionMapById(input.mapId),
      findSessionCharacterById(input.characterId)
    ]);

    if (input.faction !== undefined && input.faction !== null && !allowedFactions.has(input.faction)) {
      throw new Error("Faccao invalida para o token.");
    }

    if (input.statusEffects?.some((status) => !allowedTokenStatuses.has(status))) {
      throw new Error("Um dos status do token nao e suportado.");
    }

    if (!map || map.sessionId !== session.id) {
      throw new Error("Mapa nao encontrado nesta sessao.");
    }

    if (!character || character.sessionId !== session.id) {
      throw new Error("Personagem nao encontrado nesta sessao.");
    }

    const token = await createMapTokenEntry({
      sessionId: session.id,
      mapId: input.mapId,
      characterId: input.characterId,
      label: character.name,
      assetId: character.assetId,
      faction: input.faction ?? null,
      statusEffects: input.statusEffects,
      x: input.x,
      y: input.y
    });

    return { ok: true, token };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao adicionar o token."
    };
  }
}

export async function addAssetNpcToMapAction(input: {
  sessionCode: string;
  mapId: string;
  assetId: string;
  faction?: TokenFaction | null;
  statusEffects?: TokenStatusPreset[];
  x?: number;
  y?: number;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const [map, asset] = await Promise.all([
      findSessionMapById(input.mapId),
      findSessionAssetById(input.assetId)
    ]);

    if (input.faction !== undefined && input.faction !== null && !allowedFactions.has(input.faction)) {
      throw new Error("Faccao invalida para o token.");
    }

    if (input.statusEffects?.some((status) => !allowedTokenStatuses.has(status))) {
      throw new Error("Um dos status do token nao e suportado.");
    }

    if (!map || map.sessionId !== session.id) {
      throw new Error("Mapa nao encontrado nesta sessao.");
    }

    if (!asset || asset.sessionId !== session.id) {
      throw new Error("Asset nao encontrado nesta sessao.");
    }

    if (!tokenAssetKinds.has(asset.kind)) {
      throw new Error("Use assets do tipo token, portrait ou npc para o mapa.");
    }

    const character =
      (await findSessionCharacterByAssetId(session.id, asset.id)) ??
      (await createSessionCharacter({
        sessionId: session.id,
        name: asset.label,
        type: "npc",
        tier: "summary",
        assetId: asset.id,
        hpMax: 10,
        fpMax: 10,
        initiative: 0
      }));

    const token = await createMapTokenEntry({
      sessionId: session.id,
      mapId: input.mapId,
      characterId: character.id,
      label: character.name,
      assetId: asset.id,
      faction: input.faction ?? null,
      statusEffects: input.statusEffects,
      x: input.x,
      y: input.y
    });

    return { ok: true, token };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao puxar o NPC para o mapa."
    };
  }
}

export async function createAdHocMapTokenAction(input: {
  sessionCode: string;
  mapId: string;
  label: string;
  assetId?: string | null;
  faction?: TokenFaction | null;
  statusEffects?: TokenStatusPreset[];
  x?: number;
  y?: number;
  scale?: number;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const map = await findSessionMapById(input.mapId);

    if (!map || map.sessionId !== session.id) {
      throw new Error("Mapa nao encontrado nesta sessao.");
    }

    if (input.faction !== undefined && input.faction !== null && !allowedFactions.has(input.faction)) {
      throw new Error("Faccao invalida para o token.");
    }

    if (input.statusEffects?.some((status) => !allowedTokenStatuses.has(status))) {
      throw new Error("Um dos status do token nao e suportado.");
    }

    if (input.assetId) {
      const asset = await findSessionAssetById(input.assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O asset do token nao pertence a esta sessao.");
      }

      if (!tokenAssetKinds.has(asset.kind)) {
        throw new Error("Use assets do tipo token, portrait ou npc para um token livre.");
      }
    }

    const resolvedAssetId =
      input.assetId ??
      (input.faction === "ally"
        ? map.defaultAllyAssetId
        : input.faction === "enemy"
          ? map.defaultEnemyAssetId
          : input.faction === "neutral"
            ? map.defaultNeutralAssetId
            : null);

    const token = await createMapTokenEntry({
      sessionId: session.id,
      mapId: input.mapId,
      label: input.label,
      assetId: resolvedAssetId ?? null,
      faction: input.faction ?? null,
      statusEffects: input.statusEffects,
      x: input.x,
      y: input.y,
      scale: input.scale ?? 1
    });

    return { ok: true, token };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao criar o token."
    };
  }
}

export async function moveMapTokenAction(input: {
  sessionCode: string;
  tokenId: string;
  x: number;
  y: number;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const token = await findMapTokenById(input.tokenId);

    if (!token || token.sessionId !== session.id) {
      throw new Error("Token nao encontrado nesta sessao.");
    }

    if (!token.characterId) {
      if (viewer.role !== "gm") {
        throw new Error("Voce so pode mover tokens vinculados a sua ficha.");
      }

      const updated = await updateMapTokenPosition({
        tokenId: token.id,
        x: input.x,
        y: input.y
      });

      return { ok: true, token: updated };
    }

    const character = await findSessionCharacterById(token.characterId);

    if (!character || character.sessionId !== session.id) {
      throw new Error("Personagem do token nao encontrado.");
    }

    const ownsToken = character.ownerParticipantId === viewer.participantId;

    if (viewer.role !== "gm" && !ownsToken) {
      throw new Error("Voce so pode mover o seu proprio token.");
    }

    const updated = await updateMapTokenPosition({
      tokenId: token.id,
      x: input.x,
      y: input.y
    });

    return { ok: true, token: updated };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao mover o token."
    };
  }
}

export async function removeMapTokenAction(input: {
  sessionCode: string;
  tokenId: string;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const token = await findMapTokenById(input.tokenId);

    if (!token || token.sessionId !== session.id) {
      throw new Error("Token nao encontrado nesta sessao.");
    }

    const removed = await deleteMapTokenEntry(token.id);

    return { ok: true, token: removed };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao remover o token."
    };
  }
}

export async function updateMapTokenAction(input: {
  sessionCode: string;
  tokenId: string;
  label?: string;
  assetId?: string | null;
  faction?: TokenFaction | null;
  statusEffects?: TokenStatusPreset[];
  scale?: number;
  isVisibleToPlayers?: boolean;
}): Promise<MapActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const token = await findMapTokenById(input.tokenId);

    if (!token || token.sessionId !== session.id) {
      throw new Error("Token nao encontrado nesta sessao.");
    }

    if (input.assetId !== undefined && input.assetId !== null) {
      const asset = await findSessionAssetById(input.assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O asset selecionado nao pertence a esta sessao.");
      }

      if (!tokenAssetKinds.has(asset.kind)) {
        throw new Error("Use assets do tipo token, portrait ou npc para o token.");
      }
    }

    if (input.faction !== undefined && input.faction !== null && !allowedFactions.has(input.faction)) {
      throw new Error("Faccao invalida para o token.");
    }

    if (input.statusEffects?.some((status) => !allowedTokenStatuses.has(status))) {
      throw new Error("Um dos status do token nao e suportado.");
    }

    const updated = await updateMapTokenEntry({
      tokenId: token.id,
      label: input.label,
      assetId: input.assetId,
      faction: input.faction,
      statusEffects: input.statusEffects,
      scale: input.scale,
      isVisibleToPlayers: input.isVisibleToPlayers
    });

    return { ok: true, token: updated };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao atualizar o token."
    };
  }
}
