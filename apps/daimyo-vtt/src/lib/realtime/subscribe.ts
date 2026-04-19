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
  maxPollMs?: number;
  backoffFactor?: number;
}

export function subscribeToSlice({
  client,
  channelName,
  register,
  reconcile,
  onHealthChange,
  pollMs = 3000,
  maxPollMs = 12000,
  backoffFactor = 1.7
}: SubscribeToSliceOptions) {
  let cancelled = false;
  let health: SliceHealth = "degraded";
  let reconcileInFlight = false;
  let pollTimer: number | null = null;
  let currentPollMs = pollMs;

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
      window.clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  const scheduleNextPoll = () => {
    if (cancelled || pollTimer != null) {
      return;
    }

    pollTimer = window.setTimeout(() => {
      pollTimer = null;
      void runReconcile();
      currentPollMs = Math.min(
        maxPollMs,
        Math.round(currentPollMs * backoffFactor)
      );
      scheduleNextPoll();
    }, currentPollMs);
  };

  const startPolling = () => {
    if (pollTimer != null || cancelled) {
      return;
    }

    void runReconcile();
    scheduleNextPoll();
  };

  const setHealth = (nextHealth: SliceHealth) => {
    if (health !== nextHealth) {
      health = nextHealth;
      onHealthChange?.(nextHealth);
    }

    if (nextHealth === "live") {
      stopPolling();
      currentPollMs = pollMs;
      void runReconcile();
      return;
    }

    currentPollMs = pollMs;
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
