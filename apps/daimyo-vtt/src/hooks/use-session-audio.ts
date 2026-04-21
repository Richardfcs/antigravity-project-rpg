"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAudioStore } from "@/stores/audio-store";
import type {
  AudioPlaybackStatus,
  AudioSourceType,
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";

interface AudioTrackRowPayload {
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

interface AudioStateRowPayload {
  session_id: string;
  track_id: string | null;
  status: AudioPlaybackStatus;
  volume: number;
  loop_enabled?: boolean | null;
  started_at: string | null;
  position_seconds: number;
  updated_at: string;
}

interface UseSessionAudioOptions {
  sessionId: string;
  initialTracks: SessionAudioTrackRecord[];
  initialPlayback: SessionAudioStateRecord | null;
  enabled?: boolean;
}

function mapTrackPayload(row: AudioTrackRowPayload): SessionAudioTrackRecord {
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

function mapPlaybackPayload(row: AudioStateRowPayload): SessionAudioStateRecord {
  return {
    sessionId: row.session_id,
    trackId: row.track_id,
    status: row.status,
    volume: Number(row.volume),
    loopEnabled: Boolean(row.loop_enabled),
    startedAt: row.started_at,
    positionSeconds: Number(row.position_seconds),
    updatedAt: row.updated_at
  };
}

export function useSessionAudio({
  sessionId,
  initialTracks,
  initialPlayback,
  enabled = true
}: UseSessionAudioOptions) {
  const setTracks = useAudioStore((state) => state.setTracks);
  const upsertTrack = useAudioStore((state) => state.upsertTrack);
  const removeTrack = useAudioStore((state) => state.removeTrack);
  const setPlayback = useAudioStore((state) => state.setPlayback);

  useEffect(() => {
    setTracks(initialTracks);
    setPlayback(initialPlayback);
  }, [initialPlayback, initialTracks, setPlayback, setTracks]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    let client;

    try {
      client = createBrowserSupabaseClient();
    } catch {
      return;
    }

    return subscribeToSlice({
      client,
      channelName: `session-audio:${sessionId}`,
      pollMs: 3000,
      maxPollMs: 9000,
      reconcile: async () => {
        const [tracksResult, stateResult] = await Promise.all([
          client
            .from("session_audio_tracks")
            .select(
              "id,session_id,title,source_type,source_url,source_public_id,cloudinary_resource_type,mime_type,original_filename,duration_seconds,playlist_name,sort_order,created_at"
            )
            .eq("session_id", sessionId)
            .order("playlist_name", { ascending: true })
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          client
            .from("session_audio_state")
            .select(
              "session_id,track_id,status,volume,loop_enabled,started_at,position_seconds,updated_at"
            )
            .eq("session_id", sessionId)
            .maybeSingle()
        ]);

        if (!tracksResult.error && tracksResult.data) {
          setTracks((tracksResult.data as AudioTrackRowPayload[]).map(mapTrackPayload));
        }

        if (!stateResult.error) {
          setPlayback(
            stateResult.data ? mapPlaybackPayload(stateResult.data as AudioStateRowPayload) : null
          );
        }
      },
      register: (channel) =>
        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "session_audio_tracks",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeTrack(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertTrack(mapTrackPayload(payload.new as AudioTrackRowPayload));
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "session_audio_state",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                setPlayback(null);
                return;
              }

              if (payload.new) {
                setPlayback(mapPlaybackPayload(payload.new as AudioStateRowPayload));
              }
            }
          )
    });
  }, [enabled, removeTrack, sessionId, setPlayback, setTracks, upsertTrack]);
}
