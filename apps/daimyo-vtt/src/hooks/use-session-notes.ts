"use client";

import { useEffect } from "react";

import { useSessionNoteStore } from "@/stores/session-note-store";
import type { SessionNoteRecord } from "@/types/note";

interface UseSessionNotesOptions {
  sessionCode: string;
  initialNotes: SessionNoteRecord[];
  enabled?: boolean;
}

export function useSessionNotes({
  sessionCode,
  initialNotes,
  enabled = true
}: UseSessionNotesOptions) {
  const setNotes = useSessionNoteStore((state) => state.setNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, setNotes]);

  useEffect(() => {
    if (!enabled || !sessionCode) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const reconcile = async () => {
      try {
        const response = await fetch(`/api/session/${sessionCode}/notes`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { notes?: SessionNoteRecord[] };

        if (!cancelled && payload.notes) {
          setNotes(payload.notes);
        }
      } catch {
        // A sincronizacao das notas e best-effort para manter o slice privado.
      }
    };

    void reconcile();
    intervalId = window.setInterval(() => {
      void reconcile();
    }, 4000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, sessionCode, setNotes]);
}
