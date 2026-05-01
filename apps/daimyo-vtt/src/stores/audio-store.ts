"use client";

import { create } from "zustand";

import type {
  SessionAudioStateRecord,
  SessionAudioTrackRecord
} from "@/types/audio";

function sortTracks(tracks: SessionAudioTrackRecord[]) {
  return [...tracks].sort((left, right) => {
    const playlistOrder = left.playlistName.localeCompare(right.playlistName);

    if (playlistOrder !== 0) {
      return playlistOrder;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

interface AudioState {
  scopeKey: string | null;
  tracks: SessionAudioTrackRecord[];
  playback: SessionAudioStateRecord | null;
  runtimePositionSeconds: number;
  runtimeError: string | null;
  unlockRequired: boolean;
  unlockNonce: number;
  hasHydrated: boolean;
  hydrateForScope: (
    scopeKey: string,
    tracks: SessionAudioTrackRecord[],
    playback: SessionAudioStateRecord | null
  ) => void;
  setTracks: (tracks: SessionAudioTrackRecord[]) => void;
  upsertTrack: (track: SessionAudioTrackRecord) => void;
  removeTrack: (trackId: string) => void;
  setPlayback: (playback: SessionAudioStateRecord | null) => void;
  setRuntimePosition: (seconds: number) => void;
  setRuntimeError: (message: string | null) => void;
  setUnlockRequired: (unlockRequired: boolean) => void;
  requestUnlock: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  scopeKey: null,
  tracks: [],
  playback: null,
  runtimePositionSeconds: 0,
  runtimeError: null,
  unlockRequired: false,
  unlockNonce: 0,
  hasHydrated: false,
  hydrateForScope: (scopeKey, tracks, playback) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        tracks: sortTracks(tracks),
        playback,
        runtimePositionSeconds: playback?.positionSeconds ?? 0,
        runtimeError: null,
        unlockRequired: false,
        unlockNonce: state.unlockNonce,
        hasHydrated: true
      };
    }),
  setTracks: (tracks) =>
    set((state) => ({ ...state, tracks: sortTracks(tracks), hasHydrated: true })),
  upsertTrack: (track) =>
    set((state) => ({
      ...state,
      tracks: sortTracks([...state.tracks.filter((item) => item.id !== track.id), track]),
      hasHydrated: true
    })),
  removeTrack: (trackId) =>
    set((state) => ({
      ...state,
      tracks: state.tracks.filter((track) => track.id !== trackId),
      playback:
        state.playback?.trackId === trackId
          ? { ...state.playback, trackId: null, status: "stopped", positionSeconds: 0, startedAt: null }
          : state.playback,
      hasHydrated: true
    })),
  setPlayback: (playback) =>
    set((state) => {
      const previous = state.playback;
      const shouldResetRuntimePosition =
        !playback ||
        !previous ||
        previous.trackId !== playback.trackId ||
        previous.status !== playback.status ||
        previous.startedAt !== playback.startedAt ||
        Math.abs(previous.positionSeconds - playback.positionSeconds) > 0.75;

      return {
        ...state,
        playback,
        runtimePositionSeconds: shouldResetRuntimePosition
          ? playback?.positionSeconds ?? 0
          : state.runtimePositionSeconds,
        unlockRequired: playback?.status === "playing" ? state.unlockRequired : false,
        hasHydrated: true
      };
    }),
  setRuntimePosition: (seconds) =>
    set((state) => ({ ...state, runtimePositionSeconds: seconds })),
  setRuntimeError: (message) => set((state) => ({ ...state, runtimeError: message })),
  setUnlockRequired: (unlockRequired) =>
    set((state) => ({ ...state, unlockRequired })),
  requestUnlock: () =>
    set((state) => ({
      ...state,
      unlockNonce: state.unlockNonce + 1,
      runtimeError: null
    }))
}));
