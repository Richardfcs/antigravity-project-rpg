"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useSessionStore } from "@/stores/session-store";
import type { PresentationMode, StageMode } from "@/types/session";

interface SessionSnapshotRowPayload {
  id: string;
  name: string;
  active_scene: string;
  active_scene_id?: string | null;
  active_map_id?: string | null;
  active_atlas_map_id?: string | null;
  active_stage_mode: StageMode;
  presentation_mode: PresentationMode;
  scene_mood: string;
}

interface UseSessionSnapshotOptions {
  sessionId: string;
  enabled?: boolean;
}

export function useSessionSnapshot({
  sessionId,
  enabled = true
}: UseSessionSnapshotOptions) {
  const patchSnapshot = useSessionStore((state) => state.patchSnapshot);
  const setSyncState = useSessionStore((state) => state.setSyncState);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    let client;

    try {
      client = createBrowserSupabaseClient();
    } catch {
      setSyncState("degraded");
      return;
    }

    const syncFromRow = (row: SessionSnapshotRowPayload) => {
      patchSnapshot({
        campaignName: row.name,
        activeScene: row.active_scene,
        activeSceneId: row.active_scene_id ?? null,
        activeMapId: row.active_map_id ?? null,
        activeAtlasMapId: row.active_atlas_map_id ?? null,
        stageMode: row.active_stage_mode,
        presentationMode: row.presentation_mode,
        sceneMood: row.scene_mood
      });
    };

    const readSnapshot = async () => {
      const nextSelect =
        "id,name,active_scene,active_scene_id,active_map_id,active_atlas_map_id,active_stage_mode,presentation_mode,scene_mood";
      const fallbackSelect =
        "id,name,active_scene,active_stage_mode,presentation_mode,scene_mood";
      const nextResult = await client
        .from("sessions")
        .select(nextSelect)
        .eq("id", sessionId)
        .maybeSingle();

      if (!nextResult.error && nextResult.data) {
        return nextResult.data as SessionSnapshotRowPayload;
      }

      const fallbackResult = await client
        .from("sessions")
        .select(fallbackSelect)
        .eq("id", sessionId)
        .maybeSingle();

      if (!fallbackResult.error && fallbackResult.data) {
        return fallbackResult.data as SessionSnapshotRowPayload;
      }

      return null;
    };

    return subscribeToSlice({
      client,
      channelName: `session-snapshot:${sessionId}`,
      pollMs: 2500,
      maxPollMs: 7000,
      onHealthChange: (health) => {
        setSyncState(health === "live" ? "connected" : "degraded");
      },
      reconcile: async () => {
        const data = await readSnapshot();

        if (data) {
          syncFromRow(data);
        }
      },
      register: (channel) =>
        channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sessions",
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            if (!payload.new) {
              return;
            }

            syncFromRow(payload.new as SessionSnapshotRowPayload);
          }
        )
    });
  }, [enabled, patchSnapshot, sessionId, setSyncState]);
}
