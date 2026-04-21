import type { SessionAudioStateRecord, SessionAudioTrackRecord } from "@/types/audio";

export function clampPlaybackPosition(
  value: number,
  durationSeconds?: number | null
) {
  const normalized = Number.isFinite(value) ? Math.max(0, Number(value)) : 0;

  if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
    return normalized;
  }

  return Math.min(normalized, Math.max(0, Number(durationSeconds)));
}

export function findActiveAudioTrack(
  tracks: SessionAudioTrackRecord[],
  playback: SessionAudioStateRecord | null
) {
  if (!playback?.trackId) {
    return null;
  }

  return tracks.find((track) => track.id === playback.trackId) ?? null;
}

export function getExpectedPlaybackPosition(
  playback: SessionAudioStateRecord | null,
  durationSeconds?: number | null
) {
  if (!playback) {
    return 0;
  }

  if (playback.status !== "playing" || !playback.startedAt) {
    return clampPlaybackPosition(playback.positionSeconds, durationSeconds);
  }

  const startedAt = Date.parse(playback.startedAt);

  if (Number.isNaN(startedAt)) {
    return clampPlaybackPosition(playback.positionSeconds, durationSeconds);
  }

  const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
  const progressedPosition = playback.positionSeconds + elapsed;

  if (
    playback.loopEnabled &&
    durationSeconds != null &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
  ) {
    const normalizedDuration = Math.max(0, Number(durationSeconds));
    return normalizedDuration > 0
      ? progressedPosition % normalizedDuration
      : 0;
  }

  return clampPlaybackPosition(progressedPosition, durationSeconds);
}

export function groupTracksByPlaylist(tracks: SessionAudioTrackRecord[]) {
  const groups = new Map<string, SessionAudioTrackRecord[]>();

  for (const track of tracks) {
    const key = track.playlistName || "Geral";
    const current = groups.get(key) ?? [];
    current.push(track);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([playlistName, entries]) => ({
    playlistName,
    tracks: entries.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt.localeCompare(right.createdAt);
    })
  }));
}
