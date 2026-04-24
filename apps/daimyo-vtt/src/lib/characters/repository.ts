import "server-only";

import {
  createEmptySheetProfile,
  deriveSummaryFromSheetProfile,
  mirrorSummaryIntoSheetProfile,
  normalizeSheetProfile
} from "@/lib/combat/sheet-profile";
import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionCharacterRecord, CharacterType, CharacterTier } from "@/types/character";
import type { SessionCharacterSheetProfile } from "@/types/combat";

interface CharacterRow {
  id: string;
  session_id: string;
  name: string;
  type: CharacterType;
  tier: CharacterTier;
  owner_participant_id: string | null;
  asset_id: string | null;
  hp: number;
  hp_max: number;
  fp: number;
  fp_max: number;
  initiative: number;
  sheet_profile?: unknown | null;
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

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function buildSheetProfileMigrationError() {
  return new Error(
    "A migration da ficha completa ainda nao foi aplicada no Supabase."
  );
}

function resolveSheetProfile(row: CharacterRow) {
  const fallback = createEmptySheetProfile({
    name: row.name,
    attributes: {
      hpMax: row.hp_max,
      fpMax: row.fp_max
    }
  });

  return mirrorSummaryIntoSheetProfile(
    normalizeSheetProfile(row.sheet_profile, fallback),
    {
      hp: row.hp,
      hpMax: row.hp_max,
      fp: row.fp,
      fpMax: row.fp_max
    }
  );
}

function mapCharacterRow(row: CharacterRow): SessionCharacterRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    type: row.type,
    tier: row.tier,
    ownerParticipantId: row.owner_participant_id,
    assetId: row.asset_id,
    hp: row.hp,
    hpMax: row.hp_max,
    fp: row.fp,
    fpMax: row.fp_max,
    initiative: row.initiative,
    sheetProfile: resolveSheetProfile(row),
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
  tier: CharacterTier;
  ownerParticipantId?: string | null;
  assetId?: string | null;
  hpMax: number;
  fpMax: number;
  initiative?: number;
  sheetProfile?: SessionCharacterSheetProfile | null;
}) {
  const name = sanitizeName(input.name, 64);

  if (!name) {
    throw new Error("Informe um nome válido para o personagem.");
  }

  const profile = normalizeSheetProfile(
    input.sheetProfile,
    createEmptySheetProfile({
      name,
      attributes: {
        hpMax: normalizeMax(input.hpMax, 10),
        fpMax: normalizeMax(input.fpMax, 10)
      }
    })
  );
  const summary = deriveSummaryFromSheetProfile(profile);

  const { data, error } = await getCharacterTable()
    .insert({
      session_id: input.sessionId,
      name,
      type: input.type,
      tier: input.tier,
      owner_participant_id: input.ownerParticipantId ?? null,
      asset_id: input.assetId ?? null,
      hp: summary.hp,
      hp_max: summary.hpMax,
      fp: summary.fp,
      fp_max: summary.fpMax,
      initiative: normalizeInitiative(input.initiative ?? summary.initiative),
      sheet_profile: profile
    })
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    if (isMissingColumnError(error)) {
      throw buildSheetProfileMigrationError();
    }

    throw error ?? new Error("Falha ao criar o personagem.");
  }

  return mapCharacterRow(data);
}

export async function updateSessionCharacterProfile(input: {
  characterId: string;
  name?: string;
  type?: CharacterType;
  tier?: CharacterTier;
  ownerParticipantId?: string | null;
  assetId?: string | null;
  sheetProfile?: SessionCharacterSheetProfile | null;
}) {
  const patch: Record<string, unknown> = {};

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

  if (input.tier !== undefined) {
    patch.tier = input.tier;
  }

  if (input.ownerParticipantId !== undefined) {
    patch.owner_participant_id = input.ownerParticipantId;
  }

  if (input.assetId !== undefined) {
    patch.asset_id = input.assetId;
  }

  if (input.sheetProfile !== undefined) {
    const current = await findSessionCharacterById(input.characterId);

    if (!current) {
      throw new Error("Ficha nao encontrada para atualizar o perfil completo.");
    }

    const normalizedProfile = normalizeSheetProfile(
      input.sheetProfile,
      current.sheetProfile ??
        createEmptySheetProfile({
          name: input.name ?? current.name,
          attributes: {
            hpMax: current.hpMax,
            fpMax: current.fpMax
          }
        })
    );
    const summary = deriveSummaryFromSheetProfile(normalizedProfile);

    patch.sheet_profile = normalizedProfile;
    patch.hp = summary.hp;
    patch.hp_max = summary.hpMax;
    patch.fp = summary.fp;
    patch.fp_max = summary.fpMax;
    patch.initiative = normalizeInitiative(summary.initiative);
  }

  const { data, error } = await getCharacterTable()
    .update(patch)
    .eq("id", input.characterId)
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    if (isMissingColumnError(error)) {
      throw buildSheetProfileMigrationError();
    }

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
      ? {
          hp: nextValue,
          sheet_profile: mirrorSummaryIntoSheetProfile(
            current.sheetProfile ?? createEmptySheetProfile({ name: current.name }),
            {
              hp: nextValue,
              hpMax: current.hpMax,
              fp: current.fp,
              fpMax: current.fpMax
            }
          )
        }
      : {
          fp: nextValue,
          sheet_profile: mirrorSummaryIntoSheetProfile(
            current.sheetProfile ?? createEmptySheetProfile({ name: current.name }),
            {
              hp: current.hp,
              hpMax: current.hpMax,
              fp: nextValue,
              fpMax: current.fpMax
            }
          )
        };

  const { data, error } = await getCharacterTable()
    .update(patch)
    .eq("id", input.characterId)
    .select("*")
    .single<CharacterRow>();

  if (error || !data) {
    if (isMissingColumnError(error)) {
      throw buildSheetProfileMigrationError();
    }

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

export async function deleteSessionCharacter(characterId: string) {
  const current = await findSessionCharacterById(characterId);

  if (!current) {
    throw new Error("Personagem não encontrado.");
  }

  const { error } = await getCharacterTable()
    .delete()
    .eq("id", characterId);

  if (error) {
    throw error;
  }

  return current;
}
