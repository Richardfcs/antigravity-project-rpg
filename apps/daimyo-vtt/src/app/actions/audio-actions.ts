"use server";

import { getCloudinaryClient } from "@/lib/cloudinary/config";
import { getInfraReadiness } from "@/lib/env";
import {
  createSessionAudioTrack,
  deleteSessionAudioTrack,
  findSessionAudioTrackById,
  getSessionAudioState,
  upsertSessionAudioState
} from "@/lib/audio/repository";
import { requireSessionViewer } from "@/lib/session/access";
import type {
  AudioPlaybackStatus,
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";

interface AudioActionResult {
  ok: boolean;
  track?: SessionAudioTrackRecord;
  playback?: SessionAudioStateRecord;
  error?: string;
}

function buildInfraError(): AudioActionResult {
  return {
    ok: false,
    error: "O Supabase Service Role ainda nao esta configurado."
  };
}

export async function registerUploadedAudioTrackAction(input: {
  sessionCode: string;
  title: string;
  sourceUrl: string;
  sourcePublicId: string;
  mimeType?: string | null;
  originalFilename?: string | null;
  durationSeconds?: number | null;
  playlistName?: string;
}): Promise<AudioActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const track = await createSessionAudioTrack({
      sessionId: session.id,
      title: input.title,
      sourceUrl: input.sourceUrl,
      sourcePublicId: input.sourcePublicId,
      mimeType: input.mimeType ?? null,
      originalFilename: input.originalFilename ?? null,
      durationSeconds: input.durationSeconds ?? null,
      playlistName: input.playlistName
    });

    return { ok: true, track };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao salvar a faixa."
    };
  }
}

export async function deleteAudioTrackAction(input: {
  sessionCode: string;
  trackId: string;
}): Promise<AudioActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const track = await findSessionAudioTrackById(input.trackId);

    if (!track || track.sessionId !== session.id) {
      throw new Error("Faixa nao encontrada nesta sessao.");
    }

    const removed = await deleteSessionAudioTrack(track.id);

    try {
      const cloudinary = getCloudinaryClient();
      await cloudinary.uploader.destroy(removed.sourcePublicId, {
        resource_type: "video",
        invalidate: true
      });
    } catch {
      // O registro da trilha ja foi removido do app; a limpeza remota e best-effort.
    }

    const playback = await getSessionAudioState(session.id);

    if (playback?.trackId === removed.id) {
      await upsertSessionAudioState({
        sessionId: session.id,
        trackId: null,
        status: "stopped",
        volume: playback.volume,
        positionSeconds: 0
      });
    }

    return { ok: true, track: removed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao remover a faixa."
    };
  }
}

export async function selectAudioTrackAction(input: {
  sessionCode: string;
  trackId: string;
}): Promise<AudioActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const track = await findSessionAudioTrackById(input.trackId);

    if (!track || track.sessionId !== session.id) {
      throw new Error("Faixa nao encontrada nesta sessao.");
    }

    const current = await getSessionAudioState(session.id);
    const playback = await upsertSessionAudioState({
      sessionId: session.id,
      trackId: track.id,
      status: "paused",
      volume: current?.volume ?? 0.72,
      positionSeconds: 0
    });

    return { ok: true, track, playback };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao selecionar a faixa."
    };
  }
}

export async function syncAudioPlaybackAction(input: {
  sessionCode: string;
  status: AudioPlaybackStatus;
  trackId?: string | null;
  positionSeconds?: number;
  volume?: number;
}): Promise<AudioActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const current = await getSessionAudioState(session.id);
    const trackId = input.trackId ?? current?.trackId ?? null;

    if (input.status === "playing" && !trackId) {
      throw new Error("Selecione uma faixa antes de dar play.");
    }

    if (trackId) {
      const track = await findSessionAudioTrackById(trackId);

      if (!track || track.sessionId !== session.id) {
        throw new Error("Faixa nao encontrada nesta sessao.");
      }
    }

    const playback = await upsertSessionAudioState({
      sessionId: session.id,
      trackId,
      status: input.status,
      volume: input.volume ?? current?.volume ?? 0.72,
      positionSeconds: input.positionSeconds ?? current?.positionSeconds ?? 0,
      startedAt: input.status === "playing" ? new Date().toISOString() : null
    });

    return { ok: true, playback };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao sincronizar o audio."
    };
  }
}
