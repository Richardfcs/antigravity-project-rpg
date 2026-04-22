"use client";

import { useEffect, useRef } from "react";

import { useDiagnosticsStore } from "@/stores/diagnostics-store";
import type { SyncState } from "@/types/session";

interface UseSessionDiagnosticsOptions {
  enabled?: boolean;
  syncState?: SyncState;
}

export function useSessionDiagnostics({
  enabled = true,
  syncState
}: UseSessionDiagnosticsOptions) {
  const pushEntry = useDiagnosticsStore((state) => state.pushEntry);
  const previousSyncState = useRef<SyncState | undefined>(syncState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleWindowError = (event: ErrorEvent) => {
      pushEntry({
        level: "error",
        source: "window",
        message: event.message || "Erro inesperado capturado nesta aba."
      });
    };

    const handlePromiseError = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Promise rejeitada sem detalhe legivel.";

      pushEntry({
        level: "error",
        source: "promise",
        message: reason
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handlePromiseError);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handlePromiseError);
    };
  }, [enabled, pushEntry]);

  useEffect(() => {
    if (!enabled || !syncState || previousSyncState.current === syncState) {
      return;
    }

    if (syncState === "degraded") {
      pushEntry({
        level: "warn",
        source: "session",
        message: "A sincronização da mesa entrou em modo degradado nesta aba."
      });
    }

    if (syncState === "connected" && previousSyncState.current === "degraded") {
      pushEntry({
        level: "info",
        source: "session",
        message: "A sincronização voltou ao modo conectado."
      });
    }

    previousSyncState.current = syncState;
  }, [enabled, pushEntry, syncState]);
}
