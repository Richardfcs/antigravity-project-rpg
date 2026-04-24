"use client";

import { useEffect } from "react";

import { useSessionMemoryStore } from "@/stores/session-memory-store";
import type { SessionMemoryRecord } from "@/types/session-memory";

interface UseSessionMemoryOptions {
  sessionCode: string;
  initialEvents: SessionMemoryRecord[];
  enabled?: boolean;
}

export function useSessionMemory({
  sessionCode,
  initialEvents,
  enabled = true
}: UseSessionMemoryOptions) {
  const setEvents = useSessionMemoryStore((state) => state.setEvents);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents, setEvents]);

  useEffect(() => {
    if (!enabled || !sessionCode) {
      return;
    }

    let cancelled = false;

    const reconcile = async () => {
      try {
        const response = await fetch(`/api/session/${sessionCode}/memory`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { events?: SessionMemoryRecord[] };

        if (!cancelled && payload.events) {
          setEvents(payload.events);
        }
      } catch {
        // O slice e apenas de apoio narrativo; seguimos com a ultima fotografia local.
      }
    };

    void reconcile();

    return () => {
      cancelled = true;
    };
  }, [enabled, sessionCode, setEvents]);
}
