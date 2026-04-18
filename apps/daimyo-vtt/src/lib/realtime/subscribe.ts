"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type SliceHealth = "live" | "degraded";

interface SubscribeToSliceOptions {
  client: SupabaseClient;
  channelName: string;
  register: (channel: RealtimeChannel) => RealtimeChannel;
  reconcile?: () => Promise<void> | void;
  onHealthChange?: (health: SliceHealth) => void;
  pollMs?: number;
}

export function subscribeToSlice({
  client,
  channelName,
  register,
  reconcile,
  onHealthChange,
  pollMs = 2000
}: SubscribeToSliceOptions) {
  let cancelled = false;
  let health: SliceHealth = "degraded";
  let reconcileInFlight = false;
  let pollTimer: number | null = null;

  const runReconcile = async () => {
    if (!reconcile || cancelled || reconcileInFlight) {
      return;
    }

    reconcileInFlight = true;

    try {
      await reconcile();
    } catch {
      // A reconciliacao e best-effort. O slice segue com a ultima fotografia local.
    } finally {
      reconcileInFlight = false;
    }
  };

  const stopPolling = () => {
    if (pollTimer != null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPolling = () => {
    if (pollTimer != null || cancelled) {
      return;
    }

    void runReconcile();
    pollTimer = window.setInterval(() => {
      void runReconcile();
    }, pollMs);
  };

  const setHealth = (nextHealth: SliceHealth) => {
    if (health !== nextHealth) {
      health = nextHealth;
      onHealthChange?.(nextHealth);
    }

    if (nextHealth === "live") {
      stopPolling();
      void runReconcile();
      return;
    }

    startPolling();
  };

  const channel = register(client.channel(channelName));
  void runReconcile();

  channel.subscribe((status) => {
    if (cancelled) {
      return;
    }

    if (status === "SUBSCRIBED") {
      setHealth("live");
      return;
    }

    if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT" ||
      status === "CLOSED"
    ) {
      setHealth("degraded");
    }
  });

  return () => {
    cancelled = true;
    stopPolling();
    void client.removeChannel(channel);
  };
}
