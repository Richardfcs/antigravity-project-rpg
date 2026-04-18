"use client";

import { useEffect } from "react";

import {
  buildPresenceChannelName,
  buildPresencePayload,
  mergeRealtimePresence
} from "@/lib/realtime/presence";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { usePresenceStore } from "@/stores/presence-store";
import { useSessionStore } from "@/stores/session-store";
import type { OnlinePresence, SessionPresencePayload } from "@/types/presence";
import type { SessionViewerIdentity } from "@/types/session";

interface UseSessionPresenceOptions {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  initialMembers: OnlinePresence[];
  enabled: boolean;
}

export function useSessionPresence({
  sessionCode,
  viewer,
  initialMembers,
  enabled
}: UseSessionPresenceOptions) {
  const setMembers = usePresenceStore((state) => state.setMembers);
  const setSyncState = useSessionStore((state) => state.setSyncState);
  const setLatencyLabel = useSessionStore((state) => state.setLatencyLabel);

  useEffect(() => {
    if (!enabled || !viewer) {
      return;
    }

    let cancelled = false;
    const handshakeStartedAt = Date.now();
    let supabase;

    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      setSyncState("idle");
      setLatencyLabel("--");
      return;
    }

    const channel = supabase.channel(buildPresenceChannelName(sessionCode), {
      config: {
        presence: {
          key: viewer.participantId
        }
      }
    });

    const syncFromPresence = () => {
      if (cancelled) {
        return;
      }

      const currentMembers = usePresenceStore.getState().members;
      const baseMembers = currentMembers.length > 0 ? currentMembers : initialMembers;
      const realtimeState = channel.presenceState<SessionPresencePayload>();
      const merged = mergeRealtimePresence(baseMembers, realtimeState);
      setMembers(merged);
    };

    channel
      .on("presence", { event: "sync" }, syncFromPresence)
      .on("presence", { event: "join" }, syncFromPresence)
      .on("presence", { event: "leave" }, syncFromPresence);

    channel.subscribe(async (status) => {
      if (cancelled) {
        return;
      }

      if (status === "SUBSCRIBED") {
        setSyncState("connected");
        setLatencyLabel(`${Date.now() - handshakeStartedAt}ms`);
        await channel.track(buildPresencePayload(viewer));
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setSyncState("degraded");
        setLatencyLabel("reconnect");
        return;
      }

      if (status === "CLOSED") {
        setSyncState("idle");
        setLatencyLabel("--");
      }
    });

    const heartbeat = window.setInterval(() => {
      void channel.track(buildPresencePayload(viewer));
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      setSyncState("idle");
      setLatencyLabel("--");
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [
    enabled,
    initialMembers,
    sessionCode,
    setLatencyLabel,
    setMembers,
    setSyncState,
    viewer
  ]);
}
