"use client";

import { startTransition, useEffect } from "react";

import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useSessionStore } from "@/stores/session-store";
import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";
import type { OnlinePresence } from "@/types/presence";
import type {
  SessionShellSnapshot,
  SessionViewerIdentity,
  SyncState
} from "@/types/session";

interface UseSessionBootstrapOptions {
  snapshot: SessionShellSnapshot;
  members: OnlinePresence[];
  assets: SessionAssetRecord[];
  characters: SessionCharacterRecord[];
  viewer: SessionViewerIdentity | null;
  initialSyncState: SyncState;
  initialLatencyLabel?: string;
}

export function useSessionBootstrap({
  snapshot,
  members,
  assets,
  characters,
  viewer,
  initialSyncState,
  initialLatencyLabel
}: UseSessionBootstrapOptions) {
  const sessionScopeKey = `${snapshot.code}:${viewer?.role ?? "guest"}`;
  const hydrateAssets = useAssetStore((state) => state.hydrateForScope);
  const hydrateCharacters = useCharacterStore((state) => state.hydrateForScope);
  const hydrateSession = useSessionStore((state) => state.hydrateForScope);
  const hydrateMembers = usePresenceStore((state) => state.hydrateForScope);

  useEffect(() => {
    startTransition(() => {
      hydrateSession({
        scopeKey: sessionScopeKey,
        snapshot,
        viewer,
        initialSyncState,
        initialLatencyLabel
      });
      hydrateMembers(sessionScopeKey, members);
      hydrateAssets(sessionScopeKey, assets);
      hydrateCharacters(sessionScopeKey, characters);
    });
  }, [
    assets,
    characters,
    hydrateAssets,
    hydrateCharacters,
    hydrateMembers,
    hydrateSession,
    initialLatencyLabel,
    initialSyncState,
    members,
    sessionScopeKey,
    snapshot,
    viewer
  ]);
}
