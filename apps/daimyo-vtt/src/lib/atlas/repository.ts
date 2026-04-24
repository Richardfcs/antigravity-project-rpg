import "server-only";

import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";

interface AtlasMapRow {
  id: string;
  session_id: string;
  name: string;
  asset_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AtlasPinRow {
  id: string;
  session_id: string;
  atlas_map_id: string;
  title: string;
  description: string;
  is_visible_to_players: boolean | null;
  is_name_visible_to_players: boolean | null;
  is_quest_marked: boolean | null;
  x: number;
  y: number;
  image_asset_id: string | null;
  submap_asset_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AtlasPinCharacterRow {
  id: string;
  session_id: string;
  pin_id: string;
  character_id: string;
  sort_order: number;
  created_at: string;
}

function getAtlasMapTable() {
  return createSupabaseAdminClient().from("session_atlas_maps");
}

function getAtlasPinTable() {
  return createSupabaseAdminClient().from("session_atlas_pins");
}

function getAtlasPinCharacterTable() {
  return createSupabaseAdminClient().from("session_atlas_pin_characters");
}

function mapAtlasMapRow(row: AtlasMapRow): SessionAtlasMapRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    assetId: row.asset_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAtlasPinRow(row: AtlasPinRow): SessionAtlasPinRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    atlasMapId: row.atlas_map_id,
    title: row.title,
    description: row.description,
    isVisibleToPlayers: Boolean(row.is_visible_to_players),
    isNameVisibleToPlayers: Boolean(row.is_name_visible_to_players),
    isQuestMarked: Boolean(row.is_quest_marked),
    x: Number(row.x),
    y: Number(row.y),
    imageAssetId: row.image_asset_id,
    submapAssetId: row.submap_asset_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAtlasPinCharacterRow(
  row: AtlasPinCharacterRow
): SessionAtlasPinCharacterRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    pinId: row.pin_id,
    characterId: row.character_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePercent(value: number, fallback: number) {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Number(clamp(parsed, 0, 100).toFixed(3));
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("could not find the table") === true ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || message.includes("column");
}

async function syncSessionAtlasMirror(input: {
  sessionId: string;
  atlasName: string;
  atlasMapId: string | null;
}) {
  const sessions = createSupabaseAdminClient().from("sessions");
  const nextPatch = {
    active_scene: input.atlasName,
    scene_mood: "atlas macro",
    active_atlas_map_id: input.atlasMapId
  };
  const fallbackPatch = {
    active_scene: input.atlasName,
    scene_mood: "atlas macro"
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

export async function listSessionAtlasMaps(sessionId: string) {
  const { data, error } = await getAtlasMapTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<AtlasMapRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapAtlasMapRow);
}

export async function findSessionAtlasMapById(atlasMapId: string) {
  const { data, error } = await getAtlasMapTable()
    .select("*")
    .eq("id", atlasMapId)
    .maybeSingle<AtlasMapRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapAtlasMapRow(data) : null;
}

export async function listSessionAtlasPins(sessionId: string) {
  const { data, error } = await getAtlasPinTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<AtlasPinRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapAtlasPinRow);
}

export async function listSessionAtlasPinCharacters(sessionId: string) {
  const { data, error } = await getAtlasPinCharacterTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AtlasPinCharacterRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapAtlasPinCharacterRow);
}

export async function findSessionAtlasPinById(pinId: string) {
  const { data, error } = await getAtlasPinTable()
    .select("*")
    .eq("id", pinId)
    .maybeSingle<AtlasPinRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapAtlasPinRow(data) : null;
}

export async function replaceSessionAtlasPinCharacters(input: {
  sessionId: string;
  pinId: string;
  characterIds: string[];
}) {
  const currentPin = await findSessionAtlasPinById(input.pinId);

  if (!currentPin || currentPin.sessionId !== input.sessionId) {
    throw new Error("Pin nao encontrado nesta sessao.");
  }

  const { error: deleteError } = await getAtlasPinCharacterTable()
    .delete()
    .eq("pin_id", input.pinId);

  if (deleteError) {
    throw deleteError;
  }

  if (input.characterIds.length === 0) {
    return [] satisfies SessionAtlasPinCharacterRecord[];
  }

  const rows = input.characterIds.map((characterId, index) => ({
    session_id: input.sessionId,
    pin_id: input.pinId,
    character_id: characterId,
    sort_order: index
  }));

  const { data, error } = await getAtlasPinCharacterTable()
    .insert(rows)
    .select("*")
    .returns<AtlasPinCharacterRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAtlasPinCharacterRow);
}

export async function createSessionAtlasMap(input: {
  sessionId: string;
  name: string;
  assetId?: string | null;
}) {
  const name = sanitizeName(input.name, 72);

  if (!name) {
    throw new Error("Informe um nome valido para o atlas.");
  }

  const currentMaps = await listSessionAtlasMaps(input.sessionId);
  const shouldActivate = currentMaps.length === 0;

  const { data, error } = await getAtlasMapTable()
    .insert({
      session_id: input.sessionId,
      name,
      asset_id: input.assetId ?? null,
      is_active: shouldActivate
    })
    .select("*")
    .single<AtlasMapRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar o atlas.");
  }

  const map = mapAtlasMapRow(data);

  if (map.isActive) {
    await syncSessionAtlasMirror({
      sessionId: map.sessionId,
      atlasName: map.name,
      atlasMapId: map.id
    });
  }

  return map;
}

export async function activateSessionAtlasMap(input: {
  sessionId: string;
  atlasMapId: string;
}) {
  const current = await findSessionAtlasMapById(input.atlasMapId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Atlas nao encontrado nesta sessao.");
  }

  const { error: clearError } = await getAtlasMapTable()
    .update({ is_active: false })
    .eq("session_id", input.sessionId)
    .eq("is_active", true);

  if (clearError) {
    throw clearError;
  }

  const { data, error } = await getAtlasMapTable()
    .update({ is_active: true })
    .eq("id", input.atlasMapId)
    .select("*")
    .single<AtlasMapRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao ativar o atlas.");
  }

  const map = mapAtlasMapRow(data);

  await syncSessionAtlasMirror({
    sessionId: input.sessionId,
    atlasName: map.name,
    atlasMapId: map.id
  });

  return map;
}

export async function updateSessionAtlasMap(input: {
  sessionId: string;
  atlasMapId: string;
  name?: string;
  assetId?: string | null;
}) {
  const current = await findSessionAtlasMapById(input.atlasMapId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Atlas nao encontrado nesta sessao.");
  }

  const patch: Partial<AtlasMapRow> = {};
  if (input.name !== undefined) {
    const name = sanitizeName(input.name, 72);
    if (!name) throw new Error("Informe um nome valido.");
    patch.name = name;
  }
  if (input.assetId !== undefined) {
    patch.asset_id = input.assetId;
  }

  const { data, error } = await getAtlasMapTable()
    .update(patch)
    .eq("id", input.atlasMapId)
    .select("*")
    .single<AtlasMapRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o atlas.");
  }

  const updated = mapAtlasMapRow(data);

  if (updated.isActive) {
    await syncSessionAtlasMirror({
      sessionId: updated.sessionId,
      atlasName: updated.name,
      atlasMapId: updated.id
    });
  }

  return updated;
}

export async function deleteSessionAtlasMapEntry(atlasMapId: string) {
  const current = await findSessionAtlasMapById(atlasMapId);

  if (!current) {
    throw new Error("Atlas nao encontrado.");
  }

  const { error } = await getAtlasMapTable().delete().eq("id", atlasMapId);

  if (error) {
    throw error;
  }

  if (current.isActive) {
    const remainingMaps = await listSessionAtlasMaps(current.sessionId);
    const nextActiveAtlas = remainingMaps.find((map) => map.id !== current.id) ?? null;

    if (nextActiveAtlas) {
      const { error: activateError } = await getAtlasMapTable()
        .update({ is_active: true })
        .eq("id", nextActiveAtlas.id);

      if (activateError) {
        throw activateError;
      }
    }

    await syncSessionAtlasMirror({
      sessionId: current.sessionId,
      atlasName: nextActiveAtlas?.name ?? current.name,
      atlasMapId: nextActiveAtlas?.id ?? null
    });
  }

  return current;
}

export async function createSessionAtlasPin(input: {
  sessionId: string;
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
}) {
  const title = sanitizeName(input.title, 72);
  const description = (input.description ?? "").trim().slice(0, 600);

  if (!title) {
    throw new Error("Informe um titulo para o pin.");
  }

  const { data, error } = await getAtlasPinTable()
    .insert({
      session_id: input.sessionId,
      atlas_map_id: input.atlasMapId,
      title,
      description,
      is_visible_to_players: input.isVisibleToPlayers ?? false,
      is_name_visible_to_players: input.isNameVisibleToPlayers ?? false,
      is_quest_marked: input.isQuestMarked ?? false,
      x: normalizePercent(input.x, 50),
      y: normalizePercent(input.y, 50),
      image_asset_id: input.imageAssetId ?? null,
      submap_asset_id: input.submapAssetId ?? null
    })
    .select("*")
    .single<AtlasPinRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar o pin do atlas.");
  }

  const pin = mapAtlasPinRow(data);
  const pinCharacters = await replaceSessionAtlasPinCharacters({
    sessionId: input.sessionId,
    pinId: pin.id,
    characterIds: input.characterIds ?? []
  });

  return {
    pin,
    pinCharacters
  };
}

export async function deleteSessionAtlasPinEntry(pinId: string) {
  const current = await findSessionAtlasPinById(pinId);

  if (!current) {
    throw new Error("Pin nao encontrado.");
  }

  const { error } = await getAtlasPinTable().delete().eq("id", pinId);

  if (error) {
    throw error;
  }

  return current;
}

export async function updateSessionAtlasPinPosition(input: {
  sessionId: string;
  pinId: string;
  x: number;
  y: number;
}) {
  const current = await findSessionAtlasPinById(input.pinId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Pin nao encontrado nesta sessao.");
  }

  const { data, error } = await getAtlasPinTable()
    .update({
      x: normalizePercent(input.x, current.x),
      y: normalizePercent(input.y, current.y)
    })
    .eq("id", input.pinId)
    .select("*")
    .single<AtlasPinRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao mover o pin do atlas.");
  }

  return mapAtlasPinRow(data);
}

export async function updateSessionAtlasPinDetails(input: {
  sessionId: string;
  pinId: string;
  title?: string;
  description?: string;
  isVisibleToPlayers?: boolean;
  isNameVisibleToPlayers?: boolean;
  isQuestMarked?: boolean;
  imageAssetId?: string | null;
  submapAssetId?: string | null;
  characterIds?: string[];
}) {
  const current = await findSessionAtlasPinById(input.pinId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Pin nao encontrado nesta sessao.");
  }

  const patch: Record<string, string | boolean | null> = {};

  if (input.title !== undefined) {
    const title = sanitizeName(input.title, 72);

    if (!title) {
      throw new Error("Informe um titulo valido para o pin.");
    }

    patch.title = title;
  }

  if (input.description !== undefined) {
    patch.description = input.description.trim().slice(0, 600);
  }

  if (input.imageAssetId !== undefined) {
    patch.image_asset_id = input.imageAssetId;
  }

  if (input.submapAssetId !== undefined) {
    patch.submap_asset_id = input.submapAssetId;
  }

  if (input.isVisibleToPlayers !== undefined) {
    patch.is_visible_to_players = input.isVisibleToPlayers;
  }

  if (input.isNameVisibleToPlayers !== undefined) {
    patch.is_name_visible_to_players = input.isNameVisibleToPlayers;
  }

  if (input.isQuestMarked !== undefined) {
    patch.is_quest_marked = input.isQuestMarked;
  }

  const { data, error } = await getAtlasPinTable()
    .update(patch)
    .eq("id", input.pinId)
    .select("*")
    .single<AtlasPinRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o pin do atlas.");
  }

  const pin = mapAtlasPinRow(data);
  const pinCharacters =
    input.characterIds !== undefined
      ? await replaceSessionAtlasPinCharacters({
          sessionId: input.sessionId,
          pinId: input.pinId,
          characterIds: input.characterIds
        })
      : await listSessionAtlasPinCharacters(input.sessionId).then((links) =>
          links.filter((link) => link.pinId === input.pinId)
        );

  return {
    pin,
    pinCharacters
  };
}
