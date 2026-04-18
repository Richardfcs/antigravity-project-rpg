import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SessionEffectLayerRecord,
  SessionEffectPreset
} from "@/types/immersive-event";

interface EffectLayerRow {
  id: string;
  session_id: string;
  target_participant_id: string | null;
  source_participant_id: string | null;
  preset: SessionEffectPreset;
  note: string;
  intensity: number;
  duration_ms: number | null;
  expires_at: string | null;
  created_at: string;
}

function getEffectLayerTable() {
  return createSupabaseAdminClient().from("session_effect_layers");
}

function mapEffectLayerRow(row: EffectLayerRow): SessionEffectLayerRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    targetParticipantId: row.target_participant_id,
    sourceParticipantId: row.source_participant_id,
    preset: row.preset,
    note: row.note,
    intensity: Number(row.intensity),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("could not find the table") === true ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function listSessionEffectLayers(sessionId: string) {
  const { data, error } = await getEffectLayerTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<EffectLayerRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapEffectLayerRow);
}

export async function findSessionEffectLayerById(effectId: string) {
  const { data, error } = await getEffectLayerTable()
    .select("*")
    .eq("id", effectId)
    .maybeSingle<EffectLayerRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapEffectLayerRow(data) : null;
}

export async function createSessionEffectLayer(input: {
  sessionId: string;
  targetParticipantId?: string | null;
  sourceParticipantId?: string | null;
  preset: SessionEffectPreset;
  note?: string;
  intensity?: number;
  durationMs?: number | null;
}) {
  const durationMs =
    input.durationMs === null || input.durationMs === undefined
      ? null
      : clamp(Math.round(input.durationMs), 1500, 120000);

  const expiresAt =
    durationMs === null ? null : new Date(Date.now() + durationMs).toISOString();

  const { data, error } = await getEffectLayerTable()
    .insert({
      session_id: input.sessionId,
      target_participant_id: input.targetParticipantId ?? null,
      source_participant_id: input.sourceParticipantId ?? null,
      preset: input.preset,
      note: (input.note ?? "").trim().slice(0, 240),
      intensity: clamp(Math.round(input.intensity ?? 3), 1, 5),
      duration_ms: durationMs,
      expires_at: expiresAt
    })
    .select("*")
    .single<EffectLayerRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao criar o efeito.");
  }

  return mapEffectLayerRow(data);
}

export async function deleteSessionEffectLayer(effectId: string) {
  const current = await findSessionEffectLayerById(effectId);

  if (!current) {
    throw new Error("Efeito nao encontrado.");
  }

  const { error } = await getEffectLayerTable().delete().eq("id", effectId);

  if (error) {
    throw error;
  }

  return current;
}
