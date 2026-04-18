"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useSceneStore } from "@/stores/scene-store";
import type {
  SceneCastRecord,
  SceneLayoutMode,
  SessionSceneRecord
} from "@/types/scene";

interface SceneRowPayload {
  id: string;
  session_id: string;
  name: string;
  background_asset_id: string | null;
  mood_label: string;
  layout_mode: SceneLayoutMode;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SceneCastRowPayload {
  id: string;
  session_id: string;
  scene_id: string;
  character_id: string;
  slot_order: number;
  is_spotlighted: boolean;
  created_at: string;
}

interface UseSessionScenesOptions {
  sessionId: string;
  initialScenes: SessionSceneRecord[];
  initialSceneCast: SceneCastRecord[];
  enabled?: boolean;
}

function mapScenePayload(row: SceneRowPayload): SessionSceneRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    backgroundAssetId: row.background_asset_id,
    moodLabel: row.mood_label,
    layoutMode: row.layout_mode ?? "line",
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSceneCastPayload(row: SceneCastRowPayload): SceneCastRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    sceneId: row.scene_id,
    characterId: row.character_id,
    slotOrder: row.slot_order,
    isSpotlighted: row.is_spotlighted,
    createdAt: row.created_at
  };
}

export function useSessionScenes({
  sessionId,
  initialScenes,
  initialSceneCast,
  enabled = true
}: UseSessionScenesOptions) {
  const setScenes = useSceneStore((state) => state.setScenes);
  const upsertScene = useSceneStore((state) => state.upsertScene);
  const removeScene = useSceneStore((state) => state.removeScene);
  const setSceneCast = useSceneStore((state) => state.setSceneCast);
  const upsertSceneCast = useSceneStore((state) => state.upsertSceneCast);
  const removeSceneCast = useSceneStore((state) => state.removeSceneCast);

  useEffect(() => {
    setScenes(initialScenes);
    setSceneCast(initialSceneCast);
  }, [initialSceneCast, initialScenes, setSceneCast, setScenes]);

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
      channelName: `session-scenes:${sessionId}`,
      reconcile: async () => {
        const [scenesResult, sceneCastResult] = await Promise.all([
          client
            .from("session_scenes")
            .select(
              "id,session_id,name,background_asset_id,mood_label,layout_mode,is_active,sort_order,created_at,updated_at"
            )
            .eq("session_id", sessionId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          client
            .from("scene_cast")
            .select(
              "id,session_id,scene_id,character_id,slot_order,is_spotlighted,created_at"
            )
            .eq("session_id", sessionId)
            .order("slot_order", { ascending: true })
            .order("created_at", { ascending: true })
        ]);

        if (!scenesResult.error && scenesResult.data) {
          setScenes((scenesResult.data as SceneRowPayload[]).map(mapScenePayload));
        }

        if (!sceneCastResult.error && sceneCastResult.data) {
          setSceneCast(
            (sceneCastResult.data as SceneCastRowPayload[]).map(mapSceneCastPayload)
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
              table: "session_scenes",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeScene(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertScene(mapScenePayload(payload.new as SceneRowPayload));
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "scene_cast",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeSceneCast(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertSceneCast(mapSceneCastPayload(payload.new as SceneCastRowPayload));
              }
            }
          )
    });
  }, [
    enabled,
    removeScene,
    removeSceneCast,
    sessionId,
    setSceneCast,
    setScenes,
    upsertScene,
    upsertSceneCast
  ]);
}
