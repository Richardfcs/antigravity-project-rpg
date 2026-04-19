"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAtlasStore } from "@/stores/atlas-store";
import type {
  SessionAtlasMapRecord,
  SessionAtlasPinCharacterRecord,
  SessionAtlasPinRecord
} from "@/types/atlas";

interface AtlasMapRowPayload {
  id: string;
  session_id: string;
  name: string;
  asset_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AtlasPinRowPayload {
  id: string;
  session_id: string;
  atlas_map_id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  image_asset_id: string | null;
  submap_asset_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AtlasPinCharacterRowPayload {
  id: string;
  session_id: string;
  pin_id: string;
  character_id: string;
  sort_order: number;
  created_at: string;
}

interface UseSessionAtlasOptions {
  sessionId: string;
  initialAtlasMaps: SessionAtlasMapRecord[];
  initialAtlasPins: SessionAtlasPinRecord[];
  initialAtlasPinCharacters: SessionAtlasPinCharacterRecord[];
  enabled?: boolean;
}

function mapAtlasMapPayload(row: AtlasMapRowPayload): SessionAtlasMapRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    assetId: row.asset_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAtlasPinPayload(row: AtlasPinRowPayload): SessionAtlasPinRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    atlasMapId: row.atlas_map_id,
    title: row.title,
    description: row.description,
    x: Number(row.x),
    y: Number(row.y),
    imageAssetId: row.image_asset_id,
    submapAssetId: row.submap_asset_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAtlasPinCharacterPayload(
  row: AtlasPinCharacterRowPayload
): SessionAtlasPinCharacterRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    pinId: row.pin_id,
    characterId: row.character_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

export function useSessionAtlas({
  sessionId,
  initialAtlasMaps,
  initialAtlasPins,
  initialAtlasPinCharacters,
  enabled = true
}: UseSessionAtlasOptions) {
  const setAtlasMaps = useAtlasStore((state) => state.setAtlasMaps);
  const upsertAtlasMap = useAtlasStore((state) => state.upsertAtlasMap);
  const removeAtlasMap = useAtlasStore((state) => state.removeAtlasMap);
  const setAtlasPins = useAtlasStore((state) => state.setAtlasPins);
  const upsertAtlasPin = useAtlasStore((state) => state.upsertAtlasPin);
  const removeAtlasPin = useAtlasStore((state) => state.removeAtlasPin);
  const setAtlasPinCharacters = useAtlasStore((state) => state.setAtlasPinCharacters);
  const upsertAtlasPinCharacter = useAtlasStore((state) => state.upsertAtlasPinCharacter);
  const removeAtlasPinCharacter = useAtlasStore((state) => state.removeAtlasPinCharacter);

  useEffect(() => {
    setAtlasMaps(initialAtlasMaps);
    setAtlasPins(initialAtlasPins);
    setAtlasPinCharacters(initialAtlasPinCharacters);
  }, [
    initialAtlasMaps,
    initialAtlasPinCharacters,
    initialAtlasPins,
    setAtlasMaps,
    setAtlasPinCharacters,
    setAtlasPins
  ]);

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
      channelName: `session-atlas:${sessionId}`,
      pollMs: 4500,
      maxPollMs: 12000,
      reconcile: async () => {
        const [mapsResult, pinsResult, linksResult] = await Promise.all([
          client
            .from("session_atlas_maps")
            .select("id,session_id,name,asset_id,is_active,created_at,updated_at")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true }),
          client
            .from("session_atlas_pins")
            .select(
              "id,session_id,atlas_map_id,title,description,x,y,image_asset_id,submap_asset_id,created_at,updated_at"
            )
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true }),
          client
            .from("session_atlas_pin_characters")
            .select("id,session_id,pin_id,character_id,sort_order,created_at")
            .eq("session_id", sessionId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
        ]);

        if (!mapsResult.error && mapsResult.data) {
          setAtlasMaps((mapsResult.data as AtlasMapRowPayload[]).map(mapAtlasMapPayload));
        }

        if (!pinsResult.error && pinsResult.data) {
          setAtlasPins((pinsResult.data as AtlasPinRowPayload[]).map(mapAtlasPinPayload));
        }

        if (!linksResult.error && linksResult.data) {
          setAtlasPinCharacters(
            (linksResult.data as AtlasPinCharacterRowPayload[]).map(
              mapAtlasPinCharacterPayload
            )
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
              table: "session_atlas_maps",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeAtlasMap(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertAtlasMap(mapAtlasMapPayload(payload.new as AtlasMapRowPayload));
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "session_atlas_pins",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeAtlasPin(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertAtlasPin(mapAtlasPinPayload(payload.new as AtlasPinRowPayload));
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "session_atlas_pin_characters",
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                if (payload.old && typeof payload.old.id === "string") {
                  removeAtlasPinCharacter(payload.old.id);
                }

                return;
              }

              if (payload.new) {
                upsertAtlasPinCharacter(
                  mapAtlasPinCharacterPayload(payload.new as AtlasPinCharacterRowPayload)
                );
              }
            }
          )
    });
  }, [
    enabled,
    removeAtlasMap,
    removeAtlasPinCharacter,
    removeAtlasPin,
    sessionId,
    setAtlasMaps,
    setAtlasPinCharacters,
    setAtlasPins,
    upsertAtlasMap,
    upsertAtlasPinCharacter,
    upsertAtlasPin
  ]);
}
