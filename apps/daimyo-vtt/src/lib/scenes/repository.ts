import "server-only";

import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SceneCastRecord,
  SceneLayoutMode,
  SessionSceneRecord
} from "@/types/scene";

interface SceneRow {
  id: string;
  session_id: string;
  name: string;
  background_asset_id: string | null;
  mood_label: string;
  layout_mode: SceneLayoutMode;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SceneCastRow {
  id: string;
  session_id: string;
  scene_id: string;
  character_id: string;
  slot_order: number;
  is_spotlighted: boolean;
  created_at: string;
}

function getSceneTable() {
  return createSupabaseAdminClient().from("session_scenes");
}

function getSceneCastTable() {
  return createSupabaseAdminClient().from("scene_cast");
}

function mapSceneRow(row: SceneRow): SessionSceneRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    backgroundAssetId: row.background_asset_id,
    moodLabel: row.mood_label,
    layoutMode: row.layout_mode ?? "line",
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSceneCastRow(row: SceneCastRow): SceneCastRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    sceneId: row.scene_id,
    characterId: row.character_id,
    slotOrder: row.slot_order,
    isSpotlighted: row.is_spotlighted,
    createdAt: row.created_at
  };
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || message.includes("column");
}

async function syncSessionMirror(input: {
  sessionId: string;
  sceneName: string;
  moodLabel: string;
  sceneId: string | null;
}) {
  const sessions = createSupabaseAdminClient().from("sessions");
  const nextPatch = {
    active_scene: input.sceneName,
    scene_mood: input.moodLabel,
    active_scene_id: input.sceneId
  };
  const fallbackPatch = {
    active_scene: input.sceneName,
    scene_mood: input.moodLabel
  };

  const { error } = await sessions
    .update(nextPatch)
    .eq("id", input.sessionId);

  if (error && isMissingColumnError(error)) {
    const { error: fallbackError } = await sessions
      .update(fallbackPatch)
      .eq("id", input.sessionId);

    if (fallbackError) {
      throw fallbackError;
    }

    return;
  }

  if (error) {
    throw error;
  }
}

export async function listSessionScenes(sessionId: string) {
  const { data, error } = await getSceneTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<SceneRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapSceneRow);
}

export async function findSessionSceneById(sceneId: string) {
  const { data, error } = await getSceneTable()
    .select("*")
    .eq("id", sceneId)
    .maybeSingle<SceneRow>();

  if (error) {
    throw error;
  }

  return data ? mapSceneRow(data) : null;
}

export async function findSessionSceneByBackgroundAssetId(sessionId: string, assetId: string) {
  const { data, error } = await getSceneTable()
    .select("*")
    .eq("session_id", sessionId)
    .eq("background_asset_id", assetId)
    .maybeSingle<SceneRow>();

  if (error) {
    throw error;
  }

  return data ? mapSceneRow(data) : null;
}

export async function listSceneCast(sessionId: string) {
  const { data, error } = await getSceneCastTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("slot_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<SceneCastRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapSceneCastRow);
}

export async function findSceneCastById(sceneCastId: string) {
  const { data, error } = await getSceneCastTable()
    .select("*")
    .eq("id", sceneCastId)
    .maybeSingle<SceneCastRow>();

  if (error) {
    throw error;
  }

  return data ? mapSceneCastRow(data) : null;
}

export async function createSessionScene(input: {
  sessionId: string;
  name: string;
  moodLabel?: string;
  backgroundAssetId?: string | null;
  layoutMode?: SceneLayoutMode;
}) {
  const name = sanitizeName(input.name, 72);
  const moodLabel = sanitizeName(input.moodLabel ?? "", 72);

  if (!name) {
    throw new Error("Informe um nome valido para a cena.");
  }

  const currentScenes = await listSessionScenes(input.sessionId);
  const nextSortOrder =
    currentScenes.length > 0
      ? Math.max(...currentScenes.map((scene) => scene.sortOrder)) + 1
      : 0;
  const shouldActivate = currentScenes.length === 0;

  const { data, error } = await getSceneTable()
    .insert({
      session_id: input.sessionId,
      name,
      background_asset_id: input.backgroundAssetId ?? null,
      mood_label: moodLabel,
      layout_mode: input.layoutMode ?? "line",
      is_active: shouldActivate,
      sort_order: nextSortOrder
    })
    .select("*")
    .single<SceneRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar a cena.");
  }

  const scene = mapSceneRow(data);

  if (scene.isActive) {
    await syncSessionMirror({
      sessionId: scene.sessionId,
      sceneName: scene.name,
      moodLabel: scene.moodLabel,
      sceneId: scene.id
    });
  }

  return scene;
}

export async function updateSessionSceneLayout(input: {
  sessionId: string;
  sceneId: string;
  layoutMode: SceneLayoutMode;
}) {
  const current = await findSessionSceneById(input.sceneId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Cena nao encontrada nesta sessao.");
  }

  const { data, error } = await getSceneTable()
    .update({ layout_mode: input.layoutMode })
    .eq("id", input.sceneId)
    .select("*")
    .single<SceneRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o layout da cena.");
  }

  return mapSceneRow(data);
}

export async function activateSessionScene(input: {
  sessionId: string;
  sceneId: string;
}) {
  const scene = await findSessionSceneById(input.sceneId);

  if (!scene || scene.sessionId !== input.sessionId) {
    throw new Error("Cena nao encontrada nesta sessao.");
  }

  const { error: clearError } = await getSceneTable()
    .update({ is_active: false })
    .eq("session_id", input.sessionId)
    .eq("is_active", true);

  if (clearError) {
    throw clearError;
  }

  const { data, error } = await getSceneTable()
    .update({ is_active: true })
    .eq("id", input.sceneId)
    .select("*")
    .single<SceneRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao ativar a cena.");
  }

  const activeScene = mapSceneRow(data);

  await syncSessionMirror({
    sessionId: input.sessionId,
    sceneName: activeScene.name,
    moodLabel: activeScene.moodLabel,
    sceneId: activeScene.id
  });

  return activeScene;
}

export async function createSceneCastEntry(input: {
  sessionId: string;
  sceneId: string;
  characterId: string;
}) {
  const currentEntries = await listSceneCast(input.sessionId);
  const sceneEntries = currentEntries.filter((entry) => entry.sceneId === input.sceneId);
  const nextSlotOrder =
    sceneEntries.length > 0
      ? Math.max(...sceneEntries.map((entry) => entry.slotOrder)) + 1
      : 0;

  const { data, error } = await getSceneCastTable()
    .insert({
      session_id: input.sessionId,
      scene_id: input.sceneId,
      character_id: input.characterId,
      slot_order: nextSlotOrder,
      is_spotlighted: sceneEntries.length === 0
    })
    .select("*")
    .single<SceneCastRow>();

  if (isUniqueViolation(error)) {
    throw new Error("Esse personagem ja esta escalado nessa cena.");
  }

  if (error || !data) {
    throw error ?? new Error("Falha ao adicionar o personagem na cena.");
  }

  return mapSceneCastRow(data);
}

export async function deleteSceneCastEntry(sceneCastId: string) {
  const current = await findSceneCastById(sceneCastId);

  if (!current) {
    throw new Error("Entrada de palco nao encontrada.");
  }

  const { error } = await getSceneCastTable().delete().eq("id", sceneCastId);

  if (error) {
    throw error;
  }

  return current;
}

export async function setSceneSpotlight(input: {
  sessionId: string;
  sceneId: string;
  sceneCastId: string;
}) {
  const current = await findSceneCastById(input.sceneCastId);

  if (
    !current ||
    current.sessionId !== input.sessionId ||
    current.sceneId !== input.sceneId
  ) {
    throw new Error("Entrada de palco nao encontrada nesta cena.");
  }

  const { error: clearError } = await getSceneCastTable()
    .update({ is_spotlighted: false })
    .eq("scene_id", input.sceneId)
    .eq("is_spotlighted", true);

  if (clearError) {
    throw clearError;
  }

  const { data, error } = await getSceneCastTable()
    .update({ is_spotlighted: true })
    .eq("id", input.sceneCastId)
    .select("*")
    .single<SceneCastRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao destacar o personagem.");
  }

  return mapSceneCastRow(data);
}

export async function moveSceneCastEntry(input: {
  sessionId: string;
  sceneCastId: string;
  direction: "up" | "down";
}) {
  const current = await findSceneCastById(input.sceneCastId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Entrada de palco nao encontrada.");
  }

  const sceneEntries = (await listSceneCast(input.sessionId)).filter(
    (entry) => entry.sceneId === current.sceneId
  );
  const currentIndex = sceneEntries.findIndex((entry) => entry.id === current.id);

  if (currentIndex === -1) {
    throw new Error("Entrada de palco nao encontrada.");
  }

  const targetIndex =
    input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const neighbor = sceneEntries[targetIndex];

  if (!neighbor) {
    return [current];
  }

  const { error: currentError } = await getSceneCastTable()
    .update({ slot_order: neighbor.slotOrder })
    .eq("id", current.id);

  if (currentError) {
    throw currentError;
  }

  const { error: neighborError } = await getSceneCastTable()
    .update({ slot_order: current.slotOrder })
    .eq("id", neighbor.id);

  if (neighborError) {
    throw neighborError;
  }

  const updatedEntries = await Promise.all([
    findSceneCastById(current.id),
    findSceneCastById(neighbor.id)
  ]);

  return updatedEntries.filter(Boolean) as SceneCastRecord[];
}

export async function updateSessionScene(input: {
  sessionId: string;
  sceneId: string;
  name?: string;
  moodLabel?: string;
  backgroundAssetId?: string | null;
}) {
  const current = await findSessionSceneById(input.sceneId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Cena nao encontrada nesta sessao.");
  }

  const patch: Partial<SceneRow> = {};
  if (input.name !== undefined) patch.name = sanitizeName(input.name, 72);
  if (input.moodLabel !== undefined) patch.mood_label = sanitizeName(input.moodLabel, 72);
  if (input.backgroundAssetId !== undefined) patch.background_asset_id = input.backgroundAssetId;

  const { data, error } = await getSceneTable()
    .update(patch)
    .eq("id", input.sceneId)
    .select("*")
    .single<SceneRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar a cena.");
  }

  const updated = mapSceneRow(data);

  if (updated.isActive) {
    await syncSessionMirror({
      sessionId: updated.sessionId,
      sceneName: updated.name,
      moodLabel: updated.moodLabel,
      sceneId: updated.id
    });
  }

  return updated;
}

export async function deleteSessionScene(input: {
  sessionId: string;
  sceneId: string;
}) {
  const current = await findSessionSceneById(input.sceneId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Cena nao encontrada nesta sessao.");
  }

  if (current.isActive) {
    throw new Error("Nao e possivel apagar a cena ativa. Mude de cena primeiro.");
  }

  // Cast entries are deleted by cascade in DB usually, but let's be explicit if needed or just trust DB
  // For safety and logic, we check if it's the only scene? No, just delete.
  
  const { error } = await getSceneTable()
    .delete()
    .eq("id", input.sceneId);

  if (error) {
    throw error;
  }

  return current;
}
