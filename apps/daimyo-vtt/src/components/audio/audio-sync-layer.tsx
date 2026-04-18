"use client";

import { useEffect, useRef } from "react";

import { findActiveAudioTrack, getExpectedPlaybackPosition } from "@/lib/audio/selectors";
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
        audio.currentTime = pendingPositionRef.current;
      }

      if (pendingStatusRef.current === "paused" || pendingStatusRef.current === "stopped") {
        audio.pause();
      }

      setRuntimePosition(audio.currentTime);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
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
      if (audio.currentTime !== 0) {
        audio.currentTime = 0;
      }
      setUnlockRequired(false);
      setRuntimeError(null);
      return;
    }

    setRuntimeError(null);

    if (audio.src !== activeTrack.sourceUrl) {
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

    const targetPosition =
      playback.status === "stopped" ? 0 : getExpectedPlaybackPosition(playback);

    pendingPositionRef.current = targetPosition;
    pendingStatusRef.current = playback.status;

    if (
      audio.readyState >= 1 &&
      Number.isFinite(targetPosition) &&
      Math.abs(audio.currentTime - targetPosition) > 0.2
    ) {
      audio.currentTime = targetPosition;
    }

    if (!activeTrack || activeTrack.sourceType !== "upload") {
      audio.pause();
      return;
    }

    if (playback.status === "playing") {
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
      return;
    }

    if (playback.status === "paused") {
      audio.pause();
      setUnlockRequired(false);
      return;
    }

    audio.pause();
    setUnlockRequired(false);

    if (audio.readyState >= 1 && audio.currentTime !== 0) {
      audio.currentTime = 0;
    }
  }, [
    activeTrack,
    playback,
    playback?.updatedAt,
    setRuntimeError,
    setUnlockRequired,
    unlockNonce
  ]);

  return <audio ref={audioRef} preload="auto" className="hidden" />;
}
