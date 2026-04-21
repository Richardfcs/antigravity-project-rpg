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
  tracks: SessionAudioTrackRecord[];
  playback: SessionAudioStateRecord | null;
  runtimePositionSeconds: number;
  runtimeError: string | null;
  unlockRequired: boolean;
  unlockNonce: number;
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
  tracks: [],
  playback: null,
  runtimePositionSeconds: 0,
  runtimeError: null,
  unlockRequired: false,
  unlockNonce: 0,
  setTracks: (tracks) => set({ tracks: sortTracks(tracks) }),
  upsertTrack: (track) =>
    set((state) => ({
      tracks: sortTracks([...state.tracks.filter((item) => item.id !== track.id), track])
    })),
  removeTrack: (trackId) =>
    set((state) => ({
      tracks: state.tracks.filter((track) => track.id !== trackId),
      playback:
        state.playback?.trackId === trackId
          ? { ...state.playback, trackId: null, status: "stopped", positionSeconds: 0, startedAt: null }
          : state.playback
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
        playback,
        runtimePositionSeconds: shouldResetRuntimePosition
          ? playback?.positionSeconds ?? 0
          : state.runtimePositionSeconds,
        unlockRequired: playback?.status === "playing" ? state.unlockRequired : false
      };
    }),
  setRuntimePosition: (seconds) => set({ runtimePositionSeconds: seconds }),
  setRuntimeError: (message) => set({ runtimeError: message }),
  setUnlockRequired: (unlockRequired) => set({ unlockRequired }),
  requestUnlock: () =>
    set((state) => ({
      unlockNonce: state.unlockNonce + 1,
      runtimeError: null
    }))
}));
