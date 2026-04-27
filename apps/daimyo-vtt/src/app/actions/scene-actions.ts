"use server";

import { findSessionAssetById } from "@/lib/assets/repository";
import {
  createSessionCharacter,
  findSessionCharacterByAssetId,
  findSessionCharacterById
} from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import {
  activateSessionScene,
  createSceneCastEntry,
  createSessionScene,
  deleteSceneCastEntry,
  findSceneCastById,
  findSessionSceneById,
  findSessionSceneByBackgroundAssetId,
  moveSceneCastEntry,
  setSceneSpotlight,
  updateSessionSceneLayout,
  updateSessionScene,
  deleteSessionScene
} from "@/lib/scenes/repository";
import { createSessionMessage } from "@/lib/chat/repository";
import {
  buildSheetProfileFromBaseTemplate,
  createEmptySheetProfile
} from "@/lib/combat/sheet-profile";
import type { SessionCharacterSheetProfile } from "@/types/combat";
import { loadBaseCatalog } from "@/lib/content-bridge/base-loader";
import { requireSessionViewer } from "@/lib/session/access";
import type { SessionCharacterRecord } from "@/types/character";
import type {
  SceneCastRecord,
  SceneLayoutMode,
  SessionSceneRecord
} from "@/types/scene";

interface SceneActionResult {
  ok: boolean;
  scene?: SessionSceneRecord;
  sceneCast?: SceneCastRecord;
  entries?: SceneCastRecord[];
  character?: SessionCharacterRecord;
  message?: string;
}

const backgroundAssetKinds = new Set(["background", "ambient"]);
const stageNpcAssetKinds = new Set(["npc", "portrait", "token"]);

function buildInfraError() {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  } satisfies SceneActionResult;
}

export async function createSceneAction(input: {
  sessionCode: string;
  name: string;
  moodLabel?: string;
  backgroundAssetId?: string | null;
  layoutMode?: SceneLayoutMode;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    if (input.backgroundAssetId) {
      const asset = await findSessionAssetById(input.backgroundAssetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O background selecionado nao pertence a esta sessao.");
      }

      if (!backgroundAssetKinds.has(asset.kind)) {
        throw new Error("Selecione um asset do tipo background ou ambient para o fundo.");
      }
    }

    const scene = await createSessionScene({
      sessionId: session.id,
      name: input.name,
      moodLabel: input.moodLabel ?? "",
      backgroundAssetId: input.backgroundAssetId ?? null,
      layoutMode: input.layoutMode ?? "line"
    });

    return { ok: true, scene };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao criar a cena."
    };
  }
}

export async function updateSceneLayoutAction(input: {
  sessionCode: string;
  sceneId: string;
  layoutMode: SceneLayoutMode;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const scene = await updateSessionSceneLayout({
      sessionId: session.id,
      sceneId: input.sceneId,
      layoutMode: input.layoutMode
    });

    return { ok: true, scene };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao atualizar o layout da cena."
    };
  }
}

export async function activateSceneAction(input: {
  sessionCode: string;
  sceneId: string;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    const scene = await activateSessionScene({
      sessionId: session.id,
      sceneId: input.sceneId
    });

    // Log Automático do Mestre
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "master-log",
      body: `Ativou a cena: ${scene.name}`,
      isPrivate: true
    });

    return { ok: true, scene };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao ativar a cena."
    };
  }
}

export async function addCharacterToSceneAction(input: {
  sessionCode: string;
  sceneId: string;
  characterId: string;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const [scene, character] = await Promise.all([
      findSessionSceneById(input.sceneId),
      findSessionCharacterById(input.characterId)
    ]);

    if (!scene || scene.sessionId !== session.id) {
      throw new Error("Cena nao encontrada nesta sessao.");
    }

    if (!character || character.sessionId !== session.id) {
      throw new Error("Personagem nao encontrado nesta sessao.");
    }

    const sceneCast = await createSceneCastEntry({
      sessionId: session.id,
      sceneId: input.sceneId,
      characterId: input.characterId
    });

    return { ok: true, sceneCast };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao escalar o personagem."
    };
  }
}

export async function addAssetNpcToSceneAction(input: {
  sessionCode: string;
  sceneId: string;
  assetId: string;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const [scene, asset] = await Promise.all([
      findSessionSceneById(input.sceneId),
      findSessionAssetById(input.assetId)
    ]);

    if (!scene || scene.sessionId !== session.id) {
      throw new Error("Cena nao encontrada nesta sessao.");
    }

    if (!asset || asset.sessionId !== session.id) {
      throw new Error("Asset nao encontrado nesta sessao.");
    }

    if (!stageNpcAssetKinds.has(asset.kind)) {
      throw new Error(
        "Use assets do tipo npc, portrait ou token para escalar atores na cena."
      );
    }

    let character = await findSessionCharacterByAssetId(session.id, asset.id);

    if (!character) {
      // Automação de Alto Nível: Tenta encontrar um arquétipo pelo nome do asset
      const catalog = await loadBaseCatalog();
      const assetLabel = asset.label.toLowerCase();
      const archetype = catalog.archetypes.find(a => 
        assetLabel.includes(a.name.toLowerCase()) || 
        a.name.toLowerCase().includes(assetLabel)
      );

      let sheetProfile: SessionCharacterSheetProfile | null = null;
      let hpMax = 10;
      let fpMax = 10;
      
      if (archetype) {
        sheetProfile = buildSheetProfileFromBaseTemplate(archetype);
        hpMax = sheetProfile.attributes.hpMax;
        fpMax = sheetProfile.attributes.fpMax;
      } else {
        sheetProfile = createEmptySheetProfile({ name: asset.label });
      }

      character = await createSessionCharacter({
        sessionId: session.id,
        name: asset.label,
        type: "npc",
        tier: archetype ? "medium" : "summary",
        assetId: asset.id,
        hpMax,
        fpMax,
        initiative: sheetProfile ? Math.round(sheetProfile.derived.basicSpeed * 100) : 0,
        sheetProfile
      });
    }

    const sceneCast = await createSceneCastEntry({
      sessionId: session.id,
      sceneId: input.sceneId,
      characterId: character.id
    });

    return { ok: true, character, sceneCast };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao puxar o NPC do banco de imagens."
    };
  }
}

export async function removeSceneCastAction(input: {
  sessionCode: string;
  sceneCastId: string;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const sceneCast = await findSceneCastById(input.sceneCastId);

    if (!sceneCast || sceneCast.sessionId !== session.id) {
      throw new Error("Entrada de palco nao encontrada nesta sessao.");
    }

    const removed = await deleteSceneCastEntry(input.sceneCastId);

    return { ok: true, sceneCast: removed };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao remover o personagem da cena."
    };
  }
}

export async function moveSceneCastAction(input: {
  sessionCode: string;
  sceneCastId: string;
  direction: "up" | "down";
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const entries = await moveSceneCastEntry({
      sessionId: session.id,
      sceneCastId: input.sceneCastId,
      direction: input.direction
    });

    return { ok: true, entries };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao reordenar o palco."
    };
  }
}

export async function spotlightSceneCastAction(input: {
  sessionCode: string;
  sceneId: string;
  sceneCastId: string;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    const scene = await findSessionSceneById(input.sceneId);

    if (!scene || scene.sessionId !== session.id) {
      throw new Error("Cena nao encontrada nesta sessao.");
    }

    const sceneCast = await setSceneSpotlight({
      sessionId: session.id,
      sceneId: input.sceneId,
      sceneCastId: input.sceneCastId
    });

    // Log Automático do Mestre
    const entry = await findSceneCastById(input.sceneCastId);
    const character = entry?.characterId ? await findSessionCharacterById(entry.characterId) : null;
    
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "master-log",
      body: `Deu destaque (spotlight) para: ${character?.name || "alguem"}`,
      isPrivate: true
    });

    return { ok: true, sceneCast };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao destacar o personagem."
    };
  }
}

export async function updateSceneAction(input: {
  sessionCode: string;
  sceneId: string;
  name?: string;
  moodLabel?: string;
  backgroundAssetId?: string | null;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    
    if (input.backgroundAssetId) {
      const asset = await findSessionAssetById(input.backgroundAssetId);
      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O background selecionado nao pertence a esta sessao.");
      }
    }

    const scene = await updateSessionScene({
      sessionId: session.id,
      sceneId: input.sceneId,
      name: input.name,
      moodLabel: input.moodLabel,
      backgroundAssetId: input.backgroundAssetId
    });

    return { ok: true, scene };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao atualizar a cena."
    };
  }
}

export async function deleteSceneAction(input: {
  sessionCode: string;
  sceneId: string;
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const scene = await deleteSessionScene({
      sessionId: session.id,
      sceneId: input.sceneId
    });

    return { ok: true, scene };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao apagar a cena."
    };
  }
}

export async function getOrCreateSceneFromAtlasPinAction(input: {
  sessionCode: string;
  pinTitle: string;
  backgroundAssetId: string;
  characterIds?: string[];
}): Promise<SceneActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    // 1. Verificar se já existe uma cena com essa imagem de fundo nesta sessão
    const existing = await findSessionSceneByBackgroundAssetId(session.id, input.backgroundAssetId);

    if (existing) {
      // Se já existe, apenas ativa ela
      const activated = await activateSessionScene({
        sessionId: session.id,
        sceneId: existing.id
      });
      return { ok: true, scene: activated };
    }

    // 2. Se não existe, cria uma nova cena
    const scene = await createSessionScene({
      sessionId: session.id,
      name: input.pinTitle,
      backgroundAssetId: input.backgroundAssetId,
      layoutMode: "line"
    });

    // 3. Adicionar personagens vinculados ao pin na nova cena
    if (input.characterIds?.length) {
      await Promise.all(
        input.characterIds.map(characterId => 
          createSceneCastEntry({
            sessionId: session.id,
            sceneId: scene.id,
            characterId
          })
        )
      );
    }

    // 4. Ativa a nova cena
    const activated = await activateSessionScene({
      sessionId: session.id,
      sceneId: scene.id
    });

    return { ok: true, scene: activated };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao preparar cena do Atlas."
    };
  }
}
