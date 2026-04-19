"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import type {
  SessionEffectLayerRecord,
  SessionEffectPreset
} from "@/types/immersive-event";

interface EffectLayerRowPayload {
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

interface UseSessionEffectsOptions {
  sessionId: string;
  initialEffects: SessionEffectLayerRecord[];
  enabled?: boolean;
}

function mapEffectPayload(row: EffectLayerRowPayload): SessionEffectLayerRecord {
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

export function useSessionEffects({
  sessionId,
  initialEffects,
  enabled = true
}: UseSessionEffectsOptions) {
  const effects = useEffectLayerStore((state) => state.effects);
  const setEffects = useEffectLayerStore((state) => state.setEffects);
  const upsertEffect = useEffectLayerStore((state) => state.upsertEffect);
  const removeEffect = useEffectLayerStore((state) => state.removeEffect);
  const pruneExpired = useEffectLayerStore((state) => state.pruneExpired);

  useEffect(() => {
    setEffects(initialEffects);
  }, [initialEffects, setEffects]);

  useEffect(() => {
    if (effects.length === 0) {
      return;
    }

    const nextExpiration = effects
      .map((effect) => effect.expiresAt)
      .filter((expiresAt): expiresAt is string => Boolean(expiresAt))
      .map((expiresAt) => new Date(expiresAt).getTime())
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > Date.now())
      .sort((left, right) => left - right)[0];

    if (!nextExpiration) {
      pruneExpired();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      pruneExpired();
    }, Math.max(100, nextExpiration - Date.now() + 40));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [effects, pruneExpired]);

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
      channelName: `session-effects:${sessionId}`,
      pollMs: 4000,
      maxPollMs: 10000,
      reconcile: async () => {
        const result = await client
          .from("session_effect_layers")
          .select(
            "id,session_id,target_participant_id,source_participant_id,preset,note,intensity,duration_ms,expires_at,created_at"
          )
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (!result.error && result.data) {
          setEffects((result.data as EffectLayerRowPayload[]).map(mapEffectPayload));
        }
      },
      register: (channel) =>
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "session_effect_layers",
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              if (payload.old && typeof payload.old.id === "string") {
                removeEffect(payload.old.id);
              }

              return;
            }

            if (payload.new) {
              upsertEffect(mapEffectPayload(payload.new as EffectLayerRowPayload));
            }
          }
        )
    });
  }, [enabled, removeEffect, sessionId, setEffects, upsertEffect]);
}
