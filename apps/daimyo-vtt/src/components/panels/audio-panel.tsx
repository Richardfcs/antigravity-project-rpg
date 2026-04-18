"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  AudioLines,
  LoaderCircle,
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
import {
  findActiveAudioTrack,
  getExpectedPlaybackPosition,
  groupTracksByPlaylist
} from "@/lib/audio/selectors";
import { useAudioStore } from "@/stores/audio-store";
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
  const [visibleCount, setVisibleCount] = useState(10);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const groupedTracks = useMemo(() => groupTracksByPlaylist(tracks), [tracks]);
  const filteredGroups = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return groupedTracks
      .filter(
        (group) => playlistFilter === "all" || group.playlistName === playlistFilter
      )
      .map((group) => ({
        ...group,
        tracks: group.tracks.filter((track) => {
          if (!normalizedQuery) {
            return true;
          }

          return `${track.title} ${track.originalFilename ?? ""} ${group.playlistName}`
            .toLowerCase()
            .includes(normalizedQuery);
        })
      }))
      .filter((group) => group.tracks.length > 0);
  }, [deferredSearchQuery, groupedTracks, playlistFilter]);
  const displayedGroups = filteredGroups.map((group) => ({
    ...group,
    tracks: group.tracks.slice(0, visibleCount)
  }));
  const activeTrack = useMemo(() => findActiveAudioTrack(tracks, playback), [tracks, playback]);
  const canManage = viewer?.role === "gm";

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
      const positionSeconds =
        runtimePositionSeconds > 0
          ? runtimePositionSeconds
          : playback
            ? getExpectedPlaybackPosition(playback)
            : 0;
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
        positionSeconds: playback ? getExpectedPlaybackPosition(playback) : runtimePositionSeconds,
        volume: nextValue
      });

      if (!result.ok || !result.playback) {
        setFeedback(result.error ?? "Falha ao atualizar o volume.");
        return;
      }

      setPlayback(result.playback);
    });
  };

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)] p-4">
      <header className="border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
            <AudioLines size={18} />
          </div>
          <div>
            <p className="section-label">Trilhas</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Tambores de guerra</h3>
          </div>
        </div>
      </header>

      <div className="mt-4 rounded-[20px] border border-white/10 bg-black/18 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">Faixa ativa</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {activeTrack?.title ?? "nenhuma"}
            </p>
            <p className="mt-1 text-xs text-[color:var(--ink-3)]">
              {playbackStatusLabel(playback?.status)} · {formatSeconds(getExpectedPlaybackPosition(playback))}
            </p>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTransport("playing")}
                disabled={isPending || !playback?.trackId}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
              >
                {pendingKey === "transport:playing" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                play
              </button>
              <button
                type="button"
                onClick={() => handleTransport("paused")}
                disabled={isPending || !playback?.trackId}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
              >
                {pendingKey === "transport:paused" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Pause size={16} />
                )}
                pause
              </button>
              <button
                type="button"
                onClick={() => handleTransport("stopped")}
                disabled={isPending || !playback?.trackId}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
              >
                {pendingKey === "transport:stopped" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Square size={16} />
                )}
                stop
              </button>
            </div>
          )}
        </div>

        {canManage && (
          <label className="mt-4 block">
            <div className="mb-2 flex items-center gap-2 text-sm text-[color:var(--ink-2)]">
              <Volume2 size={16} />
              volume global
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playback?.volume ?? 0.72}
              onChange={(event) => handleVolumeChange(Number(event.target.value))}
              disabled={isPending}
              className="w-full"
            />
          </label>
        )}

        {runtimeError && <p className="mt-3 text-sm text-amber-100">{runtimeError}</p>}
      </div>

      {canManage && (
        <div className="mt-4 rounded-[20px] border border-white/10 bg-black/18 p-4">
          <p className="section-label">Nova faixa</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="Tambor do cerco"
            />

            <input
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="Geral"
            />

            <label className="lg:col-span-2 block">
              <span className="section-label">Arquivo</span>
              <input
                type="file"
                accept=".mp3,.m4a,.mp4,audio/mpeg,audio/mp4,video/mp4"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[color:var(--ink-2)] file:mr-3 file:rounded-xl file:border-0 file:bg-amber-300/14 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-100"
              />
            </label>
          </div>

          <p className="mt-3 text-xs leading-5 text-[color:var(--ink-3)]">
            Priorize MP3. M4A/MP4 de audio entra como compatibilidade e sobe pela rota de midia do Cloudinary.
          </p>

          <button
            type="button"
            onClick={handleCreateTrack}
            disabled={isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingKey === "create-track" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <UploadCloud size={16} />
            )}
            enviar faixa
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-white/10 bg-black/18 p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="section-label">Biblioteca de trilhas</p>
          <p className="mt-1 break-words text-sm leading-6 text-[color:var(--ink-2)]">
            Busque por faixa, playlist ou arquivo e carregue por blocos.
          </p>
        </div>
        <div className="grid w-full gap-3 md:max-w-[520px] md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setVisibleCount(10);
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
            placeholder="buscar trilha ou arquivo..."
          />
          <select
            value={playlistFilter}
            onChange={(event) => {
              setPlaylistFilter(event.target.value);
              setVisibleCount(10);
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
          >
            <option value="all">todas as playlists</option>
            {groupedTracks.map((group) => (
              <option key={group.playlistName} value={group.playlistName}>
                {group.playlistName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="scrollbar-thin mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {groupedTracks.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm text-[color:var(--ink-2)]">
            Nenhuma faixa cadastrada ainda.
          </div>
        )}

        {groupedTracks.length > 0 && filteredGroups.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm text-[color:var(--ink-2)]">
            Nenhuma faixa corresponde aos filtros atuais.
          </div>
        )}

        {displayedGroups.map((group) => (
          <section key={group.playlistName} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{group.playlistName}</p>
                <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                  {group.tracks.length} faixa(s)
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {group.tracks.map((track) => {
                const isCurrent = playback?.trackId === track.id;

                return (
                  <article
                    key={track.id}
                    className={`rounded-[18px] border px-4 py-3 ${isCurrent ? "border-amber-300/20 bg-amber-300/10" : "border-white/10 bg-black/18"}`}
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{track.title}</p>
                        <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                          {track.originalFilename ?? "arquivo enviado"}
                          {track.durationSeconds != null ? ` - ${formatSeconds(track.durationSeconds)}` : ""}
                        </p>
                      </div>

                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectTrack(track.id)}
                            disabled={isPending}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                          >
                            {pendingKey === `select:${track.id}` ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : isCurrent ? (
                              "armada"
                            ) : (
                              "selecionar"
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTrack(track.id)}
                            disabled={isPending}
                            className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
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
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {filteredGroups.some((group) => group.tracks.length > visibleCount) && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 10)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            carregar mais trilhas
          </button>
        )}
      </div>

      {feedback && <p className="mt-3 text-sm text-amber-100">{feedback}</p>}
    </section>
  );
}

