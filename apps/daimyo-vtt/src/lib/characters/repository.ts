import "server-only";

import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionCharacterRecord, CharacterType } from "@/types/character";

interface CharacterRow {
  id: string;
  session_id: string;
  name: string;
  type: CharacterType;
  owner_participant_id: string | null;
  asset_id: string | null;
  hp: number;
  hp_max: number;
  fp: number;
  fp_max: number;
  initiative: number;
  created_at: string;
  updated_at: string;
}

function getCharacterTable() {
  return createSupabaseAdminClient().from("session_characters");
}

function clampResource(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeMax(value: number, fallback: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : fallback;
  return clampResource(parsed, 1, 999);
}

function normalizeInitiative(value: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(999, Math.max(-99, parsed));
}

function mapCharacterRow(row: CharacterRow): SessionCharacterRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    type: row.type,
    ownerParticipantId: row.owner_participant_id,
    assetId: row.asset_id,
    hp: row.hp,
    hpMax: row.hp_max,
    fp: row.fp,
    fpMax: row.fp_max,
    initiative: row.initiative,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listSessionCharacters(sessionId: string) {
  const { data, error } = await getCharacterTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("initiative", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<CharacterRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCharacterRow);
}

export async function findSessionCharacterById(characterId: string) {
  const { data, error } = await getCharacterTable()
    .select("*")
    .eq("id", characterId)
    .maybeSingle<CharacterRow>();

  if (error) {
    throw error;
  }

  return data ? mapCharacterRow(data) : null;
}

export async function findSessionCharacterByAssetId(
  sessionId: string,
  assetId: string
) {
  const { data, error } = await getCharacterTable()
    .select("*")
    .eq("session_id", sessionId)
    .eq("asset_id", assetId)
    .maybeSingle<CharacterRow>();

  if (error) {
    throw error;
  }

  return data ? mapCharacterRow(data) : null;
}

export async function createSessionCharacter(input: {
  sessionId: string;
  name: string;
  type: CharacterType;
  ownerParticipantId?: string | null;
  assetId?: string | null;
  hpMax: number;
  fpMax: number;
  initiative?: number;
}) {
  const name = sanitizeName(input.name, 64);

  if (!name) {
    throw new Error("Informe um nome válido para o personagem.");
  }

  const hpMax = normalizeMax(input.hpMax, 10);
  const fpMax = normalizeMax(input.fpMax, 10);

  const { data, error } = await getCharacterTable()
    .insert({
      session_id: input.sessionId,
      name,
      type: input.type,
      owner_participant_id: input.ownerParticipantId ?? null,
      asset_id: input.assetId ?? null,
      hp: hpMax,
      hp_max: hpMax,
      fp: fpMax,
      fp_max: fpMax,
      initiative: normalizeInitiative(input.initiative ?? 0)
    })
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar o personagem.");
  }

  return mapCharacterRow(data);
}

export async function updateSessionCharacterProfile(input: {
  characterId: string;
  name?: string;
  type?: CharacterType;
  ownerParticipantId?: string | null;
  assetId?: string | null;
}) {
  const patch: Record<string, string | null> = {};

  if (input.name !== undefined) {
    const name = sanitizeName(input.name, 64);

    if (!name) {
      throw new Error("Informe um nome valido para a ficha.");
    }

    patch.name = name;
  }

  if (input.type !== undefined) {
    patch.type = input.type;
  }

  if (input.ownerParticipantId !== undefined) {
    patch.owner_participant_id = input.ownerParticipantId;
  }

  if (input.assetId !== undefined) {
    patch.asset_id = input.assetId;
  }

  const { data, error } = await getCharacterTable()
    .update(patch)
    .eq("id", input.characterId)
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar a ficha.");
  }

  return mapCharacterRow(data);
}

export async function adjustCharacterResource(input: {
  characterId: string;
  resource: "hp" | "fp";
  delta: number;
}) {
  const current = await findSessionCharacterById(input.characterId);

  if (!current) {
    throw new Error("Personagem não encontrado.");
  }

  const maxKey = input.resource === "hp" ? "hpMax" : "fpMax";
  const currentValue = current[input.resource];
  const maxValue = current[maxKey];
  const nextValue = clampResource(currentValue + input.delta, 0, maxValue);

  const patch =
    input.resource === "hp"
      ? { hp: nextValue }
      : { fp: nextValue };

  const { data, error } = await getCharacterTable()
    .update(patch)
    .eq("id", input.characterId)
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar o recurso do personagem.");
  }

  return mapCharacterRow(data);
}

export async function adjustCharacterInitiative(input: {
  characterId: string;
  delta: number;
}) {
  const current = await findSessionCharacterById(input.characterId);

  if (!current) {
    throw new Error("Personagem não encontrado.");
  }

  const { data, error } = await getCharacterTable()
    .update({
      initiative: normalizeInitiative(current.initiative + input.delta)
    })
    .eq("id", input.characterId)
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao atualizar a iniciativa.");
  }

  return mapCharacterRow(data);
}
