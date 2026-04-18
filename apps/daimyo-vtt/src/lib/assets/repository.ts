import "server-only";

import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AssetKind, SessionAssetRecord } from "@/types/asset";

interface AssetRow {
  id: string;
  session_id: string;
  owner_participant_id: string | null;
  kind: AssetKind;
  label: string;
  public_id: string;
  secure_url: string;
  width: number | null;
  height: number | null;
  tags: string[] | null;
  created_at: string;
}

function getAssetTable() {
  return createSupabaseAdminClient().from("assets");
}

function cleanTag(value: string) {
  return value.trim().replace(/\s+/g, "-").slice(0, 48);
}

function mapAssetRow(row: AssetRow): SessionAssetRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    ownerParticipantId: row.owner_participant_id,
    kind: row.kind,
    label: row.label,
    publicId: row.public_id,
    secureUrl: row.secure_url,
    width: row.width,
    height: row.height,
    tags: row.tags ?? [],
    createdAt: row.created_at
  };
}

export async function listSessionAssets(sessionId: string) {
  const { data, error } = await getAssetTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .returns<AssetRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAssetRow);
}

export async function findSessionAssetById(assetId: string) {
  const { data, error } = await getAssetTable()
    .select("*")
    .eq("id", assetId)
    .maybeSingle<AssetRow>();

  if (error) {
    throw error;
  }

  return data ? mapAssetRow(data) : null;
}

export async function createSessionAsset(input: {
  sessionId: string;
  ownerParticipantId?: string | null;
  kind: AssetKind;
  label: string;
  publicId: string;
  secureUrl: string;
  width?: number | null;
  height?: number | null;
  tags?: string[];
}) {
  const label = sanitizeName(input.label, 72);

  if (!label || !input.publicId || !input.secureUrl) {
    throw new Error("Asset inválido. Envie a imagem antes de registrar no banco.");
  }

  const { data, error } = await getAssetTable()
    .insert({
      session_id: input.sessionId,
      owner_participant_id: input.ownerParticipantId ?? null,
      kind: input.kind,
      label,
      public_id: input.publicId,
      secure_url: input.secureUrl,
      width: input.width ?? null,
      height: input.height ?? null,
      tags: (input.tags ?? []).map(cleanTag).filter(Boolean)
    })
    .select("*")
    .single<AssetRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao registrar o asset.");
  }

  return mapAssetRow(data);
}
