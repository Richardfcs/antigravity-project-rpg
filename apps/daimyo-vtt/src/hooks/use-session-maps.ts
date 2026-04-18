"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useMapStore } from "@/stores/map-store";
import type { MapTokenRecord, SessionMapRecord } from "@/types/map";

interface SessionMapRowPayload {
  id: string;
  session_id: string;
  name: string;
  background_asset_id: string | null;
  default_ally_asset_id: string | null;
  default_enemy_asset_id: string | null;
  default_neutral_asset_id: string | null;
  grid_enabled: boolean;
  grid_size: number;
  width: number;
  height: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MapTokenRowPayload {
  id: string;
  session_id: string;
  map_id: string;
  character_id: string | null;
  label: string;
  asset_id: string | null;
  faction: MapTokenRecord["faction"];
  status_effects: MapTokenRecord["statusEffects"] | null;
  x: number;
  y: number;
  scale: number;
  is_visible_to_players: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSessionMapsOptions {
  sessionId: string;
  initialMaps: SessionMapRecord[];
  initialMapTokens: MapTokenRecord[];
  enabled?: boolean;
}

function mapSessionMapPayload(row: SessionMapRowPayload): SessionMapRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    backgroundAssetId: row.background_asset_id,
    defaultAllyAssetId: row.default_ally_asset_id ?? null,
    defaultEnemyAssetId: row.default_enemy_asset_id ?? null,
    defaultNeutralAssetId: row.default_neutral_asset_id ?? null,
    gridEnabled: row.grid_enabled,
    gridSize: row.grid_size,
    width: row.width,
    height: row.height,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTokenPayload(row: MapTokenRowPayload): MapTokenRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    mapId: row.map_id,
    characterId: row.character_id,
    label: row.label,
    assetId: row.asset_id,
    faction: row.faction ?? null,
    statusEffects: row.status_effects ?? [],
    x: Number(row.x),
    y: Number(row.y),
    scale: Number(row.scale),
    isVisibleToPlayers: row.is_visible_to_players,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function useSessionMaps({
  sessionId,
  initialMaps,
  initialMapTokens,
  enabled = true
}: UseSessionMapsOptions) {
  const setMaps = useMapStore((state) => state.setMaps);
  const upsertMap = useMapStore((state) => state.upsertMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const setMapTokens = useMapStore((state) => state.setMapTokens);
  const upsertMapToken = useMapStore((state) => state.upsertMapToken);
  const removeMapToken = useMapStore((state) => state.removeMapToken);

  useEffect(() => {
    setMaps(initialMaps);
    setMapTokens(initialMapTokens);
  }, [initialMapTokens, initialMaps, setMapTokens, setMaps]);

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
      channelName: `session-maps:${sessionId}`,
      reconcile: async () => {
        const [mapsResult, tokensResult] = await Promise.all([
          client
            .from("session_maps")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true }),
          client
            .from("map_tokens")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })
        ]);

        if (!mapsResult.error && mapsResult.data) {
          setMaps((mapsResult.data as SessionMapRowPayload[]).map(mapSessionMapPayload));
        }

        if (!tokensResult.error && tokensResult.data) {
          setMapTokens((tokensResult.data as MapTokenRowPayload[]).map(mapTokenPayload));
        }
      },
      register: (channel) =>
        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "session_maps",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeMap(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertMap(mapSessionMapPayload(payload.new as SessionMapRowPayload));
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "map_tokens",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeMapToken(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertMapToken(mapTokenPayload(payload.new as MapTokenRowPayload));
              }
            }
          )
    });
  }, [
    enabled,
    removeMap,
    removeMapToken,
    sessionId,
    setMapTokens,
    setMaps,
    upsertMap,
    upsertMapToken
  ]);
}
