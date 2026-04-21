"use client";

import { useEffect, useRef } from "react";

import {
  clampPlaybackPosition,
  findActiveAudioTrack,
  getExpectedPlaybackPosition
} from "@/lib/audio/selectors";
import { useAudioStore } from "@/stores/audio-store";

export function AudioSyncLayer() {
  const tracks = useAudioStore((state) => state.tracks);
  const playback = useAudioStore((state) => state.playback);
  const setRuntimePosition = useAudioStore((state) => state.setRuntimePosition);
  const setRuntimeError = useAudioStore((state) => state.setRuntimeError);
  const unlockNonce = useAudioStore((state) => state.unlockNonce);
  const setUnlockRequired = useAudioStore((state) => state.setUnlockRequired);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPositionRef = useRef<number | null>(null);
  const pendingStatusRef = useRef<string | null>(null);
  const lastTransportKeyRef = useRef<string | null>(null);
  const lastUnlockNonceRef = useRef<number>(0);
  const activeTrack = findActiveAudioTrack(tracks, playback);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      setRuntimePosition(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (pendingPositionRef.current != null && Number.isFinite(pendingPositionRef.current)) {
        audio.currentTime = clampPlaybackPosition(
          pendingPositionRef.current,
          Number.isFinite(audio.duration) ? audio.duration : null
        );
      }

      if (pendingStatusRef.current === "paused" || pendingStatusRef.current === "stopped") {
        audio.pause();
      }

      setRuntimePosition(audio.currentTime);
    };

    const handleEnded = () => {
      setRuntimePosition(Number.isFinite(audio.duration) ? audio.duration : audio.currentTime);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [setRuntimePosition]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!activeTrack || activeTrack.sourceType !== "upload") {
      audio.pause();
      pendingPositionRef.current = 0;
      pendingStatusRef.current = "stopped";
      lastTransportKeyRef.current = null;
      if (audio.currentTime !== 0) {
        audio.currentTime = 0;
      }
      setUnlockRequired(false);
      setRuntimeError(null);
      return;
    }

    setRuntimeError(null);

    if (audio.src !== activeTrack.sourceUrl) {
      lastTransportKeyRef.current = null;
      audio.src = activeTrack.sourceUrl;
      audio.load();
    }
  }, [activeTrack, setRuntimeError, setUnlockRequired]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !playback) {
      return;
    }

    audio.volume = playback.volume;
    audio.loop = playback.loopEnabled;
    const durationSeconds =
      activeTrack?.durationSeconds ??
      (Number.isFinite(audio.duration) ? audio.duration : null);
    const targetPosition =
      playback.status === "stopped"
        ? 0
        : getExpectedPlaybackPosition(playback, durationSeconds);
    const transportKey = [
      playback.trackId ?? "none",
      playback.status,
      playback.positionSeconds.toFixed(3),
      playback.startedAt ?? "nostart"
    ].join("|");
    const transportChanged = transportKey !== lastTransportKeyRef.current;
    const unlockRequested = unlockNonce !== lastUnlockNonceRef.current;

    pendingPositionRef.current = targetPosition;
    pendingStatusRef.current = playback.status;

    if (
      transportChanged &&
      audio.readyState >= 1 &&
      Number.isFinite(targetPosition) &&
      Math.abs(audio.currentTime - targetPosition) > 0.35
    ) {
      audio.currentTime = targetPosition;
      setRuntimePosition(audio.currentTime);
    }

    if (!activeTrack || activeTrack.sourceType !== "upload") {
      audio.pause();
      lastTransportKeyRef.current = transportKey;
      lastUnlockNonceRef.current = unlockNonce;
      return;
    }

    if (playback.status === "playing") {
      if (transportChanged || unlockRequested || audio.paused) {
        void audio.play().then(
          () => {
            setUnlockRequired(false);
            setRuntimeError(null);
          },
          () => {
            setUnlockRequired(true);
            setRuntimeError(
              "O navegador bloqueou o audio nesta aba. Use 'Ativar audio' para sincronizar a trilha."
            );
          }
        );
      }

      lastTransportKeyRef.current = transportKey;
      lastUnlockNonceRef.current = unlockNonce;
      return;
    }

    if (playback.status === "paused") {
      audio.pause();
      setUnlockRequired(false);
      lastTransportKeyRef.current = transportKey;
      lastUnlockNonceRef.current = unlockNonce;
      return;
    }

    audio.pause();
    setUnlockRequired(false);

    if (audio.readyState >= 1 && audio.currentTime !== 0) {
      audio.currentTime = 0;
    }

    lastTransportKeyRef.current = transportKey;
    lastUnlockNonceRef.current = unlockNonce;
  }, [
    activeTrack,
    playback,
    setRuntimePosition,
    setRuntimeError,
    setUnlockRequired,
    unlockNonce
  ]);

  return <audio ref={audioRef} preload="auto" className="hidden" />;
}
