import "server-only";

import { sanitizeName } from "@/lib/session/codes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AudioPlaybackStatus,
  AudioSourceType,
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";

interface AudioTrackRow {
  id: string;
  session_id: string;
  title: string;
  source_type: AudioSourceType;
  source_url: string;
  source_public_id: string;
  cloudinary_resource_type: "video";
  mime_type: string | null;
  original_filename: string | null;
  duration_seconds: number | null;
  playlist_name: string;
  sort_order: number;
  created_at: string;
}

interface AudioStateRow {
  session_id: string;
  track_id: string | null;
  status: AudioPlaybackStatus;
  volume: number;
  started_at: string | null;
  position_seconds: number;
  updated_at: string;
}

function getTrackTable() {
  return createSupabaseAdminClient().from("session_audio_tracks");
}

function getAudioStateTable() {
  return createSupabaseAdminClient().from("session_audio_state");
}

function normalizeVolume(value: number) {
  const parsed = Number.isFinite(value) ? Number(value) : 0.72;
  return Number(Math.min(1, Math.max(0, parsed)).toFixed(3));
}

function normalizePosition(value: number) {
  const parsed = Number.isFinite(value) ? Number(value) : 0;
  return Number(Math.max(0, parsed).toFixed(3));
}

function mapTrackRow(row: AudioTrackRow): SessionAudioTrackRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    sourcePublicId: row.source_public_id,
    cloudinaryResourceType: row.cloudinary_resource_type,
    mimeType: row.mime_type,
    originalFilename: row.original_filename,
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    playlistName: row.playlist_name,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function mapAudioStateRow(row: AudioStateRow): SessionAudioStateRecord {
  return {
    sessionId: row.session_id,
    trackId: row.track_id,
    status: row.status,
    volume: Number(row.volume),
    startedAt: row.started_at,
    positionSeconds: Number(row.position_seconds),
    updatedAt: row.updated_at
  };
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("could not find the table") === true ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

export async function listSessionAudioTracks(sessionId: string) {
  const { data, error } = await getTrackTable()
    .select("*")
    .eq("session_id", sessionId)
    .order("playlist_name", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AudioTrackRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapTrackRow);
}

export async function findSessionAudioTrackById(trackId: string) {
  const { data, error } = await getTrackTable()
    .select("*")
    .eq("id", trackId)
    .maybeSingle<AudioTrackRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapTrackRow(data) : null;
}

export async function getSessionAudioState(sessionId: string) {
  const { data, error } = await getAudioStateTable()
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle<AudioStateRow>();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return data ? mapAudioStateRow(data) : null;
}

export async function createSessionAudioTrack(input: {
  sessionId: string;
  title: string;
  sourceUrl: string;
  sourcePublicId: string;
  mimeType?: string | null;
  originalFilename?: string | null;
  durationSeconds?: number | null;
  playlistName?: string;
}) {
  const title = sanitizeName(input.title, 96);
  const sourceUrl = input.sourceUrl.trim().slice(0, 1500);
  const sourcePublicId = input.sourcePublicId.trim().slice(0, 200);
  const playlistName = sanitizeName(input.playlistName ?? "Geral", 72) || "Geral";

  if (!title || !sourceUrl || !sourcePublicId) {
    throw new Error("Informe um titulo e envie o arquivo antes de salvar a faixa.");
  }

  const currentTracks = await listSessionAudioTracks(input.sessionId);
  const playlistTracks = currentTracks.filter(
    (track) => track.playlistName.toLowerCase() === playlistName.toLowerCase()
  );
  const sortOrder =
    playlistTracks.length > 0
      ? Math.max(...playlistTracks.map((track) => track.sortOrder)) + 1
      : 0;

  const { data, error } = await getTrackTable()
    .insert({
      session_id: input.sessionId,
      title,
      source_type: "upload",
      source_url: sourceUrl,
      source_public_id: sourcePublicId,
      cloudinary_resource_type: "video",
      mime_type: input.mimeType ?? null,
      original_filename: input.originalFilename?.trim().slice(0, 160) || null,
      duration_seconds:
        input.durationSeconds != null ? normalizePosition(input.durationSeconds) : null,
      playlist_name: playlistName,
      sort_order: sortOrder
    })
    .select("*")
    .single<AudioTrackRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao registrar a faixa.");
  }

  return mapTrackRow(data);
}

export async function deleteSessionAudioTrack(trackId: string) {
  const current = await findSessionAudioTrackById(trackId);

  if (!current) {
    throw new Error("Faixa nao encontrada.");
  }

  const { error } = await getTrackTable().delete().eq("id", trackId);

  if (error) {
    throw error;
  }

  return current;
}

export async function upsertSessionAudioState(input: {
  sessionId: string;
  trackId?: string | null;
  status: AudioPlaybackStatus;
  volume?: number;
  positionSeconds?: number;
  startedAt?: string | null;
}) {
  const { data, error } = await getAudioStateTable()
    .upsert(
      {
        session_id: input.sessionId,
        track_id: input.trackId ?? null,
        status: input.status,
        volume: normalizeVolume(input.volume ?? 0.72),
        position_seconds: normalizePosition(input.positionSeconds ?? 0),
        started_at:
          input.status === "playing" ? input.startedAt ?? new Date().toISOString() : null
      },
      {
        onConflict: "session_id"
      }
    )
    .select("*")
    .single<AudioStateRow>();

  if (error || !data) {
    throw error ?? new Error("Falha ao sincronizar o player.");
  }

  return mapAudioStateRow(data);
}
