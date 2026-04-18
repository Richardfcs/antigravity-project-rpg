"use client";

import { useEffect } from "react";

import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useImmersiveEventStore } from "@/stores/immersive-event-store";
import type { SessionPrivateEventRecord, PrivateEventKind } from "@/types/immersive-event";

interface PrivateEventRowPayload {
  id: string;
  session_id: string;
  target_participant_id: string;
  source_participant_id: string | null;
  kind: PrivateEventKind;
  title: string;
  body: string;
  image_asset_id: string | null;
  intensity: number;
  duration_ms: number;
  is_consumed: boolean;
  created_at: string;
}

interface UsePrivateEventsOptions {
  sessionId: string;
  participantId?: string | null;
  initialEvents: SessionPrivateEventRecord[];
  enabled?: boolean;
}

function mapPrivateEventPayload(row: PrivateEventRowPayload): SessionPrivateEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    targetParticipantId: row.target_participant_id,
    sourceParticipantId: row.source_participant_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    imageAssetId: row.image_asset_id,
    intensity: Number(row.intensity),
    durationMs: Number(row.duration_ms),
    isConsumed: row.is_consumed,
    createdAt: row.created_at
  };
}

export function usePrivateEvents({
  sessionId,
  participantId,
  initialEvents,
  enabled = true
}: UsePrivateEventsOptions) {
  const setEvents = useImmersiveEventStore((state) => state.setEvents);
  const upsertEvent = useImmersiveEventStore((state) => state.upsertEvent);
  const removeEvent = useImmersiveEventStore((state) => state.removeEvent);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents, setEvents]);

  useEffect(() => {
    if (!enabled || !sessionId || !participantId) {
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
      channelName: `private-events:${sessionId}:${participantId}`,
      reconcile: async () => {
        const { data, error } = await client
          .from("session_private_events")
          .select(
            "id,session_id,target_participant_id,source_participant_id,kind,title,body,image_asset_id,intensity,duration_ms,is_consumed,created_at"
          )
          .eq("session_id", sessionId)
          .eq("target_participant_id", participantId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setEvents((data as PrivateEventRowPayload[]).map(mapPrivateEventPayload));
        }
      },
      register: (channel) =>
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "session_private_events",
            filter: `target_participant_id=eq.${participantId}`
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              if (payload.old && typeof payload.old.id === "string") {
                removeEvent(payload.old.id);
              }

              return;
            }

            if (payload.new) {
              const event = mapPrivateEventPayload(payload.new as PrivateEventRowPayload);

              if (event.sessionId !== sessionId) {
                return;
              }

              upsertEvent(event);
            }
          }
        )
    });
  }, [enabled, participantId, removeEvent, sessionId, setEvents, upsertEvent]);
}

