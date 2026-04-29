"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  AudioLines,
  LoaderCircle,
  Repeat,
  Pause,
  Play,
  Square,
  Trash2,
  UploadCloud,
  Volume2
} from "lucide-react";

import {
  deleteAudioTrackAction,
  registerUploadedAudioTrackAction,
  selectAudioTrackAction,
  syncAudioPlaybackAction
} from "@/app/actions/audio-actions";
import { cn } from "@/lib/utils";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import {
  clampPlaybackPosition,
  findActiveAudioTrack,
  getExpectedPlaybackPosition,
  groupTracksByPlaylist
} from "@/lib/audio/selectors";
import {
  filterLibraryItems,
  filterLibraryItemsByStatus,
  sliceLibraryItems,
  sortLibraryItems
} from "@/lib/library/query";
import {
  selectLibraryFlags,
  useLibraryOrganizationStore
} from "@/stores/library-organization-store";
import { useAudioStore } from "@/stores/audio-store";
import type { LibrarySortMode, LibraryStatusFilter } from "@/types/library";
import type { SessionAudioStateRecord } from "@/types/audio";
import type { SessionViewerIdentity } from "@/types/session";

interface AudioPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

interface CloudinarySignPayload {
  ok?: boolean;
  message?: string;
  cloudName: string;
  apiKey: string;
  resourceType: "image" | "video" | "auto";
  timestamp: number;
  folder: string;
  signature: string;
  tags?: string[];
  context?: string | null;
  publicId?: string | null;
}

function formatSeconds(value: number) {
  const safe = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildSessionTag(sessionCode: string) {
  return sessionCode.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function buildTrackTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").slice(0, 96);
}

function playbackStatusLabel(status?: string | null) {
  switch (status) {
    case "playing":
      return "tocando";
    case "paused":
      return "pausada";
    case "stopped":
      return "silencio";
    default:
      return "silencio";
  }
}

function getWritablePlaybackPosition(options: {
  playback: SessionAudioStateRecord | null;
  runtimePositionSeconds: number;
  durationSeconds?: number | null;
}) {
  const { playback, runtimePositionSeconds, durationSeconds } = options;
  const runtimePosition = clampPlaybackPosition(runtimePositionSeconds, durationSeconds);

  if (!playback) {
    return runtimePosition;
  }

  if (playback.status === "playing") {
    return runtimePosition > 0
      ? runtimePosition
      : getExpectedPlaybackPosition(playback, durationSeconds);
  }

  const persistedPosition = clampPlaybackPosition(playback.positionSeconds, durationSeconds);
  return Math.abs(runtimePosition - persistedPosition) <= 0.75
    ? runtimePosition
    : persistedPosition;
}

export function AudioPanel({ sessionCode, viewer }: AudioPanelProps) {
  const tracks = useAudioStore((state) => state.tracks);
  const playback = useAudioStore((state) => state.playback);
  const runtimePositionSeconds = useAudioStore((state) => state.runtimePositionSeconds);
  const runtimeError = useAudioStore((state) => state.runtimeError);
  const upsertTrack = useAudioStore((state) => state.upsertTrack);
  const removeTrack = useAudioStore((state) => state.removeTrack);
  const setPlayback = useAudioStore((state) => state.setPlayback);
  const [title, setTitle] = useState("");
  const [playlistName, setPlaylistName] = useState("Geral");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playlistFilter, setPlaylistFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("name");
  const [visibleCount, setVisibleCount] = useState(10);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const groupedTracks = useMemo(() => groupTracksByPlaylist(tracks), [tracks]);
  const audioLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "audio")
  );
  const toggleLibraryFlag = useLibraryOrganizationStore((state) => state.toggleFlag);
  const setLibraryFlag = useLibraryOrganizationStore((state) => state.setFlag);
  const touchLibraryItem = useLibraryOrganizationStore((state) => state.touchItem);
  const filteredGroups = useMemo(() => {
    return groupedTracks
      .filter(
        (group) => playlistFilter === "all" || group.playlistName === playlistFilter
      )
      .map((group) => ({
        ...group,
        tracks: sortLibraryItems(
          filterLibraryItemsByStatus(
            filterLibraryItems(
              group.tracks,
              deferredSearchQuery,
              (track) => `${track.title} ${track.originalFilename ?? ""} ${group.playlistName}`
            ),
            statusFilter,
            (track) => audioLibraryFlags[track.id]
          ),
          {
            sortMode,
            getLabel: (track) => track.title,
            getFlags: (track) => audioLibraryFlags[track.id]
          }
        )
      }))
      .filter((group) => group.tracks.length > 0);
  }, [audioLibraryFlags, deferredSearchQuery, groupedTracks, playlistFilter, sortMode, statusFilter]);
  const displayedGroups = filteredGroups.map((group) => ({
    ...group,
    tracks: sliceLibraryItems(group.tracks, visibleCount)
  }));
  const activeTrack = useMemo(() => findActiveAudioTrack(tracks, playback), [tracks, playback]);
  const canManage = viewer?.role === "gm";
  const activeTrackDuration = activeTrack?.durationSeconds ?? null;
  const displayedPosition = getExpectedPlaybackPosition(playback, activeTrackDuration);

  const runAsync = (key: string, task: () => Promise<void>) => {
    setPendingKey(key);
    setFeedback(null);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingKey(null);
      }
    });
  };

  const handleFileChange = (file: File | null) => {
    setAudioFile(file);

    if (file && !title.trim()) {
      setTitle(buildTrackTitle(file.name));
    }
  };

  const handleCreateTrack = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode montar playlists.");
      return;
    }

    if (!audioFile) {
      setFeedback("Anexe um MP3 ou M4A/MP4 de audio antes de salvar.");
      return;
    }

    if (!title.trim()) {
      setFeedback("Informe o titulo da faixa.");
      return;
    }

    runAsync("create-track", async () => {
      try {
        const signResponse = await fetch("/api/cloudinary/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionCode,
            resourceType: "video",
            folder: `daimyo-vtt/${buildSessionTag(sessionCode)}/audio`,
            tags: [`session:${buildSessionTag(sessionCode)}`, "kind:audio"],
            context: {
              label: title.trim(),
              session: sessionCode
            }
          })
        });

        const signPayload = (await signResponse.json()) as CloudinarySignPayload;

        if (!signResponse.ok || !signPayload.ok) {
          throw new Error(signPayload.message || "Falha ao assinar o upload de audio.");
        }

        const uploadFormData = new FormData();
        uploadFormData.append("file", audioFile);
        uploadFormData.append("api_key", signPayload.apiKey);
        uploadFormData.append("timestamp", String(signPayload.timestamp));
        uploadFormData.append("folder", signPayload.folder);
        uploadFormData.append("signature", signPayload.signature);

        if (signPayload.tags?.length) {
          uploadFormData.append("tags", signPayload.tags.join(","));
        }

        if (signPayload.context) {
          uploadFormData.append("context", signPayload.context);
        }

        if (signPayload.publicId) {
          uploadFormData.append("public_id", signPayload.publicId);
        }

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signPayload.cloudName}/video/upload`,
          {
            method: "POST",
            body: uploadFormData
          }
        );

        const uploadPayload = (await uploadResponse.json()) as {
          secure_url?: string;
          public_id?: string;
          duration?: number;
          original_filename?: string;
          resource_type?: "video";
          error?: { message?: string };
        };

        if (!uploadResponse.ok || !uploadPayload.secure_url || !uploadPayload.public_id) {
          throw new Error(
            uploadPayload.error?.message || "Falha ao enviar o audio para o Cloudinary."
          );
        }

        const result = await registerUploadedAudioTrackAction({
          sessionCode,
          title: title.trim(),
          playlistName,
          sourceUrl: uploadPayload.secure_url,
          sourcePublicId: uploadPayload.public_id,
          mimeType: audioFile.type || null,
          originalFilename: uploadPayload.original_filename || audioFile.name,
          durationSeconds: uploadPayload.duration ?? null
        });

        if (!result.ok || !result.track) {
          throw new Error(result.error || "Falha ao registrar a faixa.");
        }

        upsertTrack(result.track);
        setTitle("");
        setPlaylistName("Geral");
        setAudioFile(null);
        setLibraryFlag(sessionCode, "audio", result.track.id, "prepared", true);
        touchLibraryItem(sessionCode, "audio", result.track.id);
        setFeedback("Faixa enviada e pronta para sincronizar.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Falha ao salvar a faixa.");
      }
    });
  };

  const handleSelectTrack = (trackId: string) => {
    runAsync(`select:${trackId}`, async () => {
      const result = await selectAudioTrackAction({
        sessionCode,
        trackId
      });

      if (!result.ok || !result.playback) {
        setFeedback(result.error ?? "Falha ao preparar a faixa.");
        return;
      }

      if (result.track) {
        upsertTrack(result.track);
      }

      setPlayback(result.playback);
      setLibraryFlag(sessionCode, "audio", trackId, "usedToday", true);
      touchLibraryItem(sessionCode, "audio", trackId);
    });
  };

  const handleDeleteTrack = (trackId: string) => {
    runAsync(`delete:${trackId}`, async () => {
      const result = await deleteAudioTrackAction({
        sessionCode,
        trackId
      });

      if (!result.ok || !result.track) {
        setFeedback(result.error ?? "Falha ao remover a faixa.");
        return;
      }

      removeTrack(result.track.id);
    });
  };

  const handleTransport = (status: "playing" | "paused" | "stopped") => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode controlar o audio.");
      return;
    }

    runAsync(`transport:${status}`, async () => {
      const positionSeconds = getWritablePlaybackPosition({
        playback,
        runtimePositionSeconds,
        durationSeconds: activeTrackDuration
      });
      const result = await syncAudioPlaybackAction({
        sessionCode,
        status,
        trackId: playback?.trackId ?? activeTrack?.id ?? null,
        positionSeconds: status === "stopped" ? 0 : positionSeconds,
        volume: playback?.volume ?? 0.72
      });

      if (!result.ok || !result.playback) {
        setFeedback(result.error ?? "Falha ao sincronizar o transporte.");
        return;
      }

      setPlayback(result.playback);
    });
  };

  const handleVolumeChange = (nextValue: number) => {
    if (!canManage) {
      return;
    }

    runAsync("volume", async () => {
      const result = await syncAudioPlaybackAction({
        sessionCode,
        status: playback?.status ?? "paused",
        trackId: playback?.trackId ?? activeTrack?.id ?? null,
        volume: nextValue
      });

      if (!result.ok || !result.playback) {
        setFeedback(result.error ?? "Falha ao atualizar o volume.");
        return;
      }

      setPlayback(result.playback);
    });
  };

  const handleLoopToggle = () => {
    if (!canManage) {
      return;
    }

    runAsync("loop", async () => {
      const result = await syncAudioPlaybackAction({
        sessionCode,
        status: playback?.status ?? "paused",
        trackId: playback?.trackId ?? activeTrack?.id ?? null,
        loopEnabled: !(playback?.loopEnabled ?? false)
      });

      if (!result.ok || !result.playback) {
        setFeedback(result.error ?? "Falha ao alternar o looping.");
        return;
      }

      setPlayback(result.playback);
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-6 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--gold)]/10 text-[color:var(--gold)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.1)]">
              <AudioLines size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[color:var(--text-primary)] uppercase">Sinfonia de Guerra</h3>
              <p className="text-xs text-[color:var(--text-muted)]">Dite o ritmo do destino e a harmonia das cenas.</p>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-4 rounded-2xl bg-[var(--bg-card)] px-4 py-2 border border-[var(--border-panel)]">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">
                <Volume2 size={14} />
                Volume
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={playback?.volume ?? 0.72}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                disabled={isPending}
                className="w-32 accent-[color:var(--gold)]"
              />
            </div>
          )}
        </header>

        <div className="rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-card)]/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--gold)]/50 mb-2">Transmissão Ativa</p>
              <h4 className="text-2xl font-bold text-[color:var(--text-primary)] truncate leading-tight">
                {activeTrack?.title ?? "Silêncio Narrativo"}
              </h4>
              <div className="mt-2 flex items-center gap-3 text-xs font-bold text-[color:var(--text-muted)]">
                <span className="uppercase tracking-widest">{playbackStatusLabel(playback?.status)}</span>
                <span className="h-1 w-1 rounded-full bg-[color:var(--gold)]/20"></span>
                <span className="tabular-nums">{formatSeconds(displayedPosition)}</span>
                {playback?.loopEnabled && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-[color:var(--gold)]/20"></span>
                    <span className="text-emerald-500 uppercase tracking-tighter">Loop Ativo</span>
                  </>
                )}
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTransport("playing")}
                  disabled={isPending || !playback?.trackId}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl border transition-all disabled:opacity-20",
                    playback?.status === "playing" 
                      ? "border-[color:var(--gold)]/50 bg-[color:var(--mist)] text-[color:var(--gold)] shadow-[0_0_20px_rgba(var(--gold-rgb),0.2)]" 
                      : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-primary)] hover:border-[color:var(--gold)]/20"
                  )}
                >
                  {pendingKey === "transport:playing" ? (
                    <LoaderCircle size={20} className="animate-spin" />
                  ) : (
                    <Play size={24} className="fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleTransport("paused")}
                  disabled={isPending || !playback?.trackId}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-primary)] transition-all hover:border-[color:var(--gold)]/20 disabled:opacity-20"
                >
                  {pendingKey === "transport:paused" ? (
                    <LoaderCircle size={20} className="animate-spin" />
                  ) : (
                    <Pause size={24} className="fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleTransport("stopped")}
                  disabled={isPending || !playback?.trackId}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:border-rose-500/40 disabled:opacity-20"
                >
                  {pendingKey === "transport:stopped" ? (
                    <LoaderCircle size={20} className="animate-spin" />
                  ) : (
                    <Square size={20} className="fill-current" />
                  )}
                </button>
                <div className="w-px h-10 bg-[var(--border-panel)] mx-2"></div>
                <button
                  type="button"
                  onClick={handleLoopToggle}
                  disabled={isPending || !playback?.trackId}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl border transition-all disabled:opacity-20",
                    playback?.loopEnabled
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-[var(--border-panel)] bg-[var(--bg-input)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                  )}
                >
                  {pendingKey === "loop" ? (
                    <LoaderCircle size={20} className="animate-spin" />
                  ) : (
                    <Repeat size={20} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {canManage && (
          <div className="rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-input)] p-5">
            <header className="flex items-center gap-2 mb-4">
              <UploadCloud size={14} className="text-[color:var(--text-muted)]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Anexar Novo Registro Sonoro</h4>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Identificação da Faixa</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                  placeholder="Ex: Marcha do Shogun"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Playlist de Destino</label>
                <input
                  value={playlistName}
                  onChange={(event) => setPlaylistName(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                  placeholder="Ex: Batalha, Ambiente, Horror"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Arquivo de Mídia</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".mp3,.m4a,.mp4,audio/mpeg,audio/mp4,video/mp4"
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-xs text-[color:var(--text-muted)] outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-[color:var(--gold)]/20 file:px-4 file:py-1 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-[color:var(--gold)] group-hover:bg-[var(--bg-card)]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-[10px] font-medium text-[color:var(--text-muted)] italic">Formatos ideais: MP3, M4A ou MP4 (áudio).</p>
              <button
                type="button"
                onClick={handleCreateTrack}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--mist)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--gold)] transition hover:bg-[color:var(--gold)]/20 disabled:opacity-20 shadow-sm"
              >
                {pendingKey === "create-track" ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <UploadCloud size={14} />
                )}
                Sincronizar com Nuvem
              </button>
            </div>
          </div>
        )}

        {runtimeError && (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
            {runtimeError}
          </div>
        )}
      </section>

      <div className="space-y-4">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2">
            <AudioLines size={14} className="text-[color:var(--text-muted)]/50" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Arquivo Sonoro da Mesa</h4>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setVisibleCount(10);
              }}
              className="w-48 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-1.5 text-[11px] text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
              placeholder="Buscar sinfonia..."
            />
            <select
              value={playlistFilter}
              onChange={(event) => {
                setPlaylistFilter(event.target.value);
                setVisibleCount(10);
              }}
              className="rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-1.5 text-[11px] text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
            >
              <option value="all">Todas Playlists</option>
              {groupedTracks.map((group) => (
                <option key={group.playlistName} value={group.playlistName}>
                  {group.playlistName}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <LibraryFilterPills value={statusFilter} onChange={setStatusFilter} />
              <LibrarySortSelect value={sortMode} onChange={setSortMode} />
            </div>
          </div>
        </header>

        <div className="grid gap-6">
          {groupedTracks.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-input)]/50 px-6 py-12 text-center">
              <p className="text-sm text-[color:var(--text-muted)] font-medium italic">O silêncio absoluto reina na biblioteca.</p>
            </div>
          )}

          {displayedGroups.map((group) => (
            <section key={group.playlistName} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <span className="h-px flex-1 bg-[var(--border-panel)]"></span>
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--text-muted)]/60">{group.playlistName}</h5>
                <span className="h-px flex-1 bg-[var(--border-panel)]"></span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.tracks.map((track) => {
                  const isCurrent = playback?.trackId === track.id;

                  return (
                    <article
                      key={track.id}
                      className={cn(
                        "group relative overflow-hidden rounded-[24px] border p-4 transition-all",
                        isCurrent 
                          ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] shadow-[0_0_20px_rgba(var(--gold-rgb),0.05)]" 
                          : "border-[var(--border-panel)] bg-[var(--bg-card)] hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]/80"
                      )}
                    >
                      <div className="flex flex-col h-full justify-between gap-4">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h6 className={cn(
                              "text-sm font-bold truncate transition-colors",
                              isCurrent ? "text-[color:var(--gold)]" : "text-[color:var(--text-primary)] group-hover:text-[color:var(--gold)]/80"
                            )}>
                              {track.title}
                            </h6>
                            {isCurrent && <div className="h-2 w-2 rounded-full bg-[color:var(--gold)] animate-pulse mt-1.5" />}
                          </div>
                          <p className="mt-1 text-[10px] font-medium text-[color:var(--text-muted)] truncate">
                            {track.originalFilename ?? "Arquivo Sincronizado"}
                          </p>
                          <div className="mt-3">
                            <LibraryFlagControls
                              flags={audioLibraryFlags[track.id]}
                              canManage={canManage}
                              onToggle={(flag) =>
                                toggleLibraryFlag(sessionCode, "audio", track.id, flag)
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-panel)] pt-3">
                          <span className="text-[10px] font-bold tabular-nums text-[color:var(--text-muted)]">
                            {track.durationSeconds != null ? formatSeconds(track.durationSeconds) : "--:--"}
                          </span>

                          {canManage && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectTrack(track.id)}
                                disabled={isPending}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                                  isCurrent
                                    ? "bg-[color:var(--gold)] text-[color:var(--bg-deep)]"
                                    : "bg-[var(--bg-input)] text-[color:var(--text-muted)] hover:bg-[var(--bg-panel)] hover:text-[color:var(--text-primary)] border border-[var(--border-panel)]"
                                )}
                              >
                                {pendingKey === `select:${track.id}` ? (
                                  <LoaderCircle size={14} className="animate-spin" />
                                ) : isCurrent ? (
                                  "Armada"
                                ) : (
                                  "Armar"
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTrack(track.id)}
                                disabled={isPending}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 opacity-40 transition-all hover:opacity-100 hover:bg-rose-500/20"
                              >
                                {pendingKey === `delete:${track.id}` ? (
                                  <LoaderCircle size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {filteredGroups.some((group) => group.tracks.length > visibleCount) && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 10)}
            className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-card)] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition hover:border-[color:var(--gold)]/20 hover:text-[color:var(--text-primary)]"
          >
            Expandir Arquivo Sonoro
          </button>
        )}
      </div>

      {feedback && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-6 py-4 text-xs font-medium text-amber-200/80">
          {feedback}
        </div>
      )}
    </div>
  );
}
