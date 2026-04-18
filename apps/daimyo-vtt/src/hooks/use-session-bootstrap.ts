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
  const setAssets = useAssetStore((state) => state.setAssets);
  const setCharacters = useCharacterStore((state) => state.setCharacters);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const setViewer = useSessionStore((state) => state.setViewer);
  const setSyncState = useSessionStore((state) => state.setSyncState);
  const setLatencyLabel = useSessionStore((state) => state.setLatencyLabel);
  const setMembers = usePresenceStore((state) => state.setMembers);

  useEffect(() => {
    startTransition(() => {
      setSnapshot(snapshot);
      setViewer(viewer);
      setMembers(members);
      setAssets(assets);
      setCharacters(characters);
      setSyncState(initialSyncState);
      if (initialLatencyLabel) {
        setLatencyLabel(initialLatencyLabel);
      }
    });
  }, [
    assets,
    characters,
    initialLatencyLabel,
    initialSyncState,
    members,
    setAssets,
    setCharacters,
    setLatencyLabel,
    setMembers,
    setSnapshot,
    setSyncState,
    setViewer,
    snapshot,
    viewer
  ]);
}
