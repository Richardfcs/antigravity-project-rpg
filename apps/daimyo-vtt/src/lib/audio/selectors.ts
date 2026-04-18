import type { SessionAudioStateRecord, SessionAudioTrackRecord } from "@/types/audio";

export function findActiveAudioTrack(
  tracks: SessionAudioTrackRecord[],
  playback: SessionAudioStateRecord | null
) {
  if (!playback?.trackId) {
    return null;
  }

  return tracks.find((track) => track.id === playback.trackId) ?? null;
}

export function getExpectedPlaybackPosition(playback: SessionAudioStateRecord | null) {
  if (!playback) {
    return 0;
  }

  if (playback.status !== "playing" || !playback.startedAt) {
    return playback.positionSeconds;
  }

  const startedAt = Date.parse(playback.startedAt);

  if (Number.isNaN(startedAt)) {
    return playback.positionSeconds;
  }

  const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
  return playback.positionSeconds + elapsed;
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
