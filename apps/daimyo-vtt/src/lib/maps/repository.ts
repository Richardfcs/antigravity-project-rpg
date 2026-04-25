import "server-only";

import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MapTokenRecord,
  SessionMapRecord,
  TokenFaction,
  TokenStatusPreset
} from "@/types/map";

interface SessionMapRow {
  id: string;
  session_id: string;
  name: string;
  background_asset_id: string | null;
  default_ally_asset_id: string | null;
  default_enemy_asset_id: string | null;
  default_neutral_asset_id: string | null;
  grid_enabled: boolean;
  grid_size: number;
  width: number;
  height: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MapTokenRow {
  id: string;
  session_id: string;
  map_id: string;
  character_id: string | null;
  label: string;
  asset_id: string | null;
  faction: TokenFaction | null;
  status_effects: TokenStatusPreset[] | null;
  x: number;
  y: number;
  scale: number;
  is_visible_to_players: boolean;
  created_at: string;
  updated_at: string;
}

function getMapTable() {
  return createSupabaseAdminClient().from("session_maps");
}

function getMapTokenTable() {
  return createSupabaseAdminClient().from("map_tokens");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMapSize(value: number, fallback: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : fallback;
  return clamp(parsed, 320, 8192);
}

function normalizeGridSize(value: number, fallback: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : fallback;
  return clamp(parsed, 16, 256);
}

function normalizePercent(value: number, fallback: number) {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Number(clamp(parsed, 0, 100).toFixed(3));
}

function normalizeScale(value: number, fallback: number) {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Number(clamp(parsed, 0.3, 3).toFixed(3));
}

function mapSessionMapRow(row: SessionMapRow): SessionMapRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    backgroundAssetId: row.background_asset_id,
    defaultAllyAssetId: row.default_ally_asset_id ?? null,
    defaultEnemyAssetId: row.default_enemy_asset_id ?? null,
    defaultNeutralAssetId: row.default_neutral_asset_id ?? null,
    gridEnabled: row.grid_enabled,
    gridSize: row.grid_size,
    width: row.width,
    height: row.height,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMapTokenRow(row: MapTokenRow): MapTokenRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    mapId: row.map_id,
    characterId: row.character_id,
    label: row.label,
    assetId: row.asset_id,
    faction: row.faction ?? null,
    statusEffects: row.status_effects ?? [],
    x: Number(row.x),
    y: Number(row.y),
    scale: Number(row.scale),
    isVisibleToPlayers: row.is_visible_to_players,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
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

function sanitizeStatusEffects(statusEffects?: TokenStatusPreset[]) {
  if (!statusEffects) {
    return undefined;
  }

  const allowed = new Set<TokenStatusPreset>([
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

  return [...new Set(statusEffects.filter((status) => allowed.has(status)))];
}

async function syncSessionMapMirror(input: {
  sessionId: string;
  mapId: string | null;
}) {
  const sessions = createSupabaseAdminClient().from("sessions");
  const { error } = await sessions
    .update({
      active_map_id: input.mapId
    })
    .eq("id", input.sessionId);

  if (error && isMissingColumnError(error)) {
    return;
  }

  if (error) {
    throw error;
  }
}

export async function listSessionMaps(sessionId: string) {
  const { data, error } = await getMapTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<SessionMapRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapSessionMapRow);
}

export async function findSessionMapById(mapId: string) {
  const { data, error } = await getMapTable()
    .select("*")
    .eq("id", mapId)
    .maybeSingle<SessionMapRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapSessionMapRow(data) : null;
}

export async function listMapTokens(sessionId: string) {
  const { data, error } = await getMapTokenTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<MapTokenRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapMapTokenRow);
}

export async function findMapTokenById(tokenId: string) {
  const { data, error } = await getMapTokenTable()
    .select("*")
    .eq("id", tokenId)
    .maybeSingle<MapTokenRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapMapTokenRow(data) : null;
}

export async function createSessionMap(input: {
  sessionId: string;
  name: string;
  backgroundAssetId?: string | null;
  defaultAllyAssetId?: string | null;
  defaultEnemyAssetId?: string | null;
  defaultNeutralAssetId?: string | null;
  gridEnabled?: boolean;
  gridSize?: number;
  width?: number;
  height?: number;
}) {
  const name = sanitizeName(input.name, 72);

  if (!name) {
    throw new Error("Informe um nome valido para o mapa.");
  }

  const currentMaps = await listSessionMaps(input.sessionId);
  const shouldActivate = currentMaps.length === 0;

  const { data, error } = await getMapTable()
    .insert({
      session_id: input.sessionId,
      name,
      background_asset_id: input.backgroundAssetId ?? null,
      default_ally_asset_id: input.defaultAllyAssetId ?? null,
      default_enemy_asset_id: input.defaultEnemyAssetId ?? null,
      default_neutral_asset_id: input.defaultNeutralAssetId ?? null,
      grid_enabled: input.gridEnabled ?? true,
      grid_size: normalizeGridSize(input.gridSize ?? 64, 64),
      width: normalizeMapSize(input.width ?? 1600, 1600),
      height: normalizeMapSize(input.height ?? 900, 900),
      is_active: shouldActivate
    })
    .select("*")
    .single<SessionMapRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar o mapa.");
  }

  const map = mapSessionMapRow(data);

  if (map.isActive) {
    await syncSessionMapMirror({
      sessionId: map.sessionId,
      mapId: map.id
    });
  }

  return map;
}

export async function updateSessionMapEntry(input: {
  mapId: string;
  name?: string;
  backgroundAssetId?: string | null;
  defaultAllyAssetId?: string | null;
  defaultEnemyAssetId?: string | null;
  defaultNeutralAssetId?: string | null;
  gridEnabled?: boolean;
  gridSize?: number;
}) {
  const patch: Record<string, string | number | boolean | null> = {};

  if (input.name !== undefined) {
    const name = sanitizeName(input.name, 72);

    if (!name) {
      throw new Error("Informe um nome valido para o mapa.");
    }

    patch.name = name;
  }

  if (input.backgroundAssetId !== undefined) {
    patch.background_asset_id = input.backgroundAssetId;
  }

  if (input.defaultAllyAssetId !== undefined) {
    patch.default_ally_asset_id = input.defaultAllyAssetId;
  }

  if (input.defaultEnemyAssetId !== undefined) {
    patch.default_enemy_asset_id = input.defaultEnemyAssetId;
  }

  if (input.defaultNeutralAssetId !== undefined) {
    patch.default_neutral_asset_id = input.defaultNeutralAssetId;
  }

  if (input.gridEnabled !== undefined) {
    patch.grid_enabled = input.gridEnabled;
  }

  if (input.gridSize !== undefined) {
    patch.grid_size = normalizeGridSize(input.gridSize, 64);
  }

  const { data, error } = await getMapTable()
    .update(patch)
    .eq("id", input.mapId)
    .select("*")
    .single<SessionMapRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o mapa.");
  }

  return mapSessionMapRow(data);
}

export async function activateSessionMap(input: {
  sessionId: string;
  mapId: string;
}) {
  const current = await findSessionMapById(input.mapId);

  if (!current || current.sessionId !== input.sessionId) {
    throw new Error("Mapa nao encontrado nesta sessao.");
  }

  const { error: clearError } = await getMapTable()
    .update({ is_active: false })
    .eq("session_id", input.sessionId)
    .eq("is_active", true);

  if (clearError) {
    throw clearError;
  }

  const { data, error } = await getMapTable()
    .update({ is_active: true })
    .eq("id", input.mapId)
    .select("*")
    .single<SessionMapRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao ativar o mapa.");
  }

  const map = mapSessionMapRow(data);

  await syncSessionMapMirror({
    sessionId: input.sessionId,
    mapId: map.id
  });

  return map;
}

export async function deleteSessionMapEntry(mapId: string) {
  const current = await findSessionMapById(mapId);

  if (!current) {
    throw new Error("Mapa nao encontrado.");
  }

  const { error } = await getMapTable().delete().eq("id", mapId);

  if (error) {
    throw error;
  }

  if (current.isActive) {
    const remainingMaps = await listSessionMaps(current.sessionId);
    const nextActiveMap = remainingMaps.find((map) => map.id !== current.id) ?? null;

    if (nextActiveMap) {
      const { error: activateError } = await getMapTable()
        .update({ is_active: true })
        .eq("id", nextActiveMap.id);

      if (activateError) {
        throw activateError;
      }
    }

    await syncSessionMapMirror({
      sessionId: current.sessionId,
      mapId: nextActiveMap?.id ?? null
    });
  }

  return current;
}

export async function createMapTokenEntry(input: {
  sessionId: string;
  mapId: string;
  characterId?: string | null;
  label?: string;
  assetId?: string | null;
  faction?: TokenFaction | null;
  statusEffects?: TokenStatusPreset[];
  x?: number;
  y?: number;
  scale?: number;
  isVisibleToPlayers?: boolean;
}) {
  const label = sanitizeName(input.label ?? "", 64);

  if (!input.characterId && !label) {
    throw new Error("Informe um nome para o token livre.");
  }

  const { data, error } = await getMapTokenTable()
    .insert({
      session_id: input.sessionId,
      map_id: input.mapId,
      character_id: input.characterId ?? null,
      label,
      asset_id: input.assetId ?? null,
      faction: input.faction ?? null,
      status_effects: sanitizeStatusEffects(input.statusEffects) ?? [],
      x: normalizePercent(input.x ?? 50, 50),
      y: normalizePercent(input.y ?? 50, 50),
      scale: normalizeScale(input.scale ?? 1, 1),
      is_visible_to_players: input.isVisibleToPlayers ?? true
    })
    .select("*")
    .single<MapTokenRow>();

  if (isUniqueViolation(error)) {
    throw new Error("Esse personagem ja esta presente neste mapa.");
  }

  if (error || !data) {
    throw error ?? new Error("Falha ao adicionar o token.");
  }

  return mapMapTokenRow(data);
}

export async function updateMapTokenPosition(input: {
  tokenId: string;
  x: number;
  y: number;
  scale?: number;
}) {
  const { data, error } = await getMapTokenTable()
    .update({
      x: normalizePercent(input.x, 50),
      y: normalizePercent(input.y, 50),
      ...(input.scale != null
        ? { scale: normalizeScale(input.scale, 1) }
        : {})
    })
    .eq("id", input.tokenId)
    .select("*")
    .single<MapTokenRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o token.");
  }

  return mapMapTokenRow(data);
}

export async function updateMapTokenEntry(input: {
  tokenId: string;
  label?: string;
  assetId?: string | null;
  faction?: TokenFaction | null;
  statusEffects?: TokenStatusPreset[];
  x?: number;
  y?: number;
  scale?: number;
  isVisibleToPlayers?: boolean;
}) {
  const patch: Record<string, string | number | boolean | string[] | null> = {};

  if (input.label !== undefined) {
    const label = sanitizeName(input.label, 64);

    if (!label) {
      throw new Error("Informe um nome valido para o token.");
    }

    patch.label = label;
  }

  if (input.assetId !== undefined) {
    patch.asset_id = input.assetId;
  }

  if (input.faction !== undefined) {
    patch.faction = input.faction;
  }

  if (input.statusEffects !== undefined) {
    patch.status_effects = sanitizeStatusEffects(input.statusEffects) ?? [];
  }

  if (input.x !== undefined) {
    patch.x = normalizePercent(input.x, 50);
  }

  if (input.y !== undefined) {
    patch.y = normalizePercent(input.y, 50);
  }

  if (input.scale !== undefined) {
    patch.scale = normalizeScale(input.scale, 1);
  }

  if (input.isVisibleToPlayers !== undefined) {
    patch.is_visible_to_players = input.isVisibleToPlayers;
  }

  const { data, error } = await getMapTokenTable()
    .update(patch)
    .eq("id", input.tokenId)
    .select("*")
    .single<MapTokenRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o token.");
  }

  return mapMapTokenRow(data);
}

export async function deleteMapTokenEntry(tokenId: string) {
  const current = await findMapTokenById(tokenId);

  if (!current) {
    throw new Error("Token nao encontrado.");
  }

  const { error } = await getMapTokenTable().delete().eq("id", tokenId);

  if (error) {
    throw error;
  }

  return current;
}
