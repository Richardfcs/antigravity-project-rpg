"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAssetStore } from "@/stores/asset-store";
import type { SessionAssetRecord, AssetKind } from "@/types/asset";

interface AssetRowPayload {
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

interface UseSessionAssetsOptions {
  sessionId: string;
  initialAssets: SessionAssetRecord[];
  enabled?: boolean;
}

function mapAssetPayload(row: AssetRowPayload): SessionAssetRecord {
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

export function useSessionAssets({
  sessionId,
  initialAssets,
  enabled = true
}: UseSessionAssetsOptions) {
  const setAssets = useAssetStore((state) => state.setAssets);
  const upsertAsset = useAssetStore((state) => state.upsertAsset);
  const removeAsset = useAssetStore((state) => state.removeAsset);

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets, setAssets]);

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
      channelName: `assets:${sessionId}`,
      pollMs: 7000,
      maxPollMs: 16000,
      reconcile: async () => {
        const { data, error } = await client
          .from("assets")
          .select(
            "id,session_id,owner_participant_id,kind,label,public_id,secure_url,width,height,tags,created_at"
          )
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setAssets((data as AssetRowPayload[]).map(mapAssetPayload));
        }
      },
      register: (channel) =>
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "assets",
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              if (payload.old && typeof payload.old.id === "string") {
                removeAsset(payload.old.id);
              }

              return;
            }

            if (payload.new) {
              upsertAsset(mapAssetPayload(payload.new as AssetRowPayload));
            }
          }
        )
    });
  }, [enabled, removeAsset, sessionId, setAssets, upsertAsset]);
}
