"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  BellRing,
  LoaderCircle,
  Play,
  Plus,
  Trash2
} from "lucide-react";

import {
  activateAtlasMapAction,
  createAtlasMapAction,
  deleteAtlasMapAction
} from "@/app/actions/atlas-actions";
import { sendPrivateEventAction } from "@/app/actions/private-event-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { findActiveAtlasMap, listAtlasStagePins } from "@/lib/atlas/selectors";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import type { PrivateEventKind } from "@/types/immersive-event";
import type {
  SessionParticipantRecord,
  SessionViewerIdentity
} from "@/types/session";

interface AtlasPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
}

export function AtlasPanel({
  sessionCode,
  viewer,
  participants
}: AtlasPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const atlasMaps = useAtlasStore((state) => state.atlasMaps);
  const atlasPins = useAtlasStore((state) => state.atlasPins);
  const setAtlasMaps = useAtlasStore((state) => state.setAtlasMaps);
  const upsertAtlasMap = useAtlasStore((state) => state.upsertAtlasMap);
  const removeAtlasMap = useAtlasStore((state) => state.removeAtlasMap);
  const [atlasName, setAtlasName] = useState("");
  const [atlasAssetId, setAtlasAssetId] = useState("");
  const [targetParticipantId, setTargetParticipantId] = useState("");
  const [eventKind, setEventKind] = useState<PrivateEventKind>("secret");
  const [eventTitle, setEventTitle] = useState("");
  const [eventBody, setEventBody] = useState("");
  const [eventImageAssetId, setEventImageAssetId] = useState("");
  const [eventIntensity, setEventIntensity] = useState("3");
  const [eventDurationMs, setEventDurationMs] = useState("5000");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const activeAtlasMap = useMemo(() => findActiveAtlasMap(atlasMaps), [atlasMaps]);
  const mapAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "map"),
    [assets]
  );
  const currentAtlasPins = useMemo(
    () =>
      activeAtlasMap ? listAtlasStagePins(activeAtlasMap.id, atlasPins, assets) : [],
    [activeAtlasMap, assets, atlasPins]
  );
  const playerParticipants = useMemo(
    () => participants.filter((participant) => participant.role === "player"),
    [participants]
  );
  const filteredAtlasMaps = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return atlasMaps;
    }

    return atlasMaps.filter((atlasMap) =>
      atlasMap.name.toLowerCase().includes(normalizedQuery)
    );
  }, [atlasMaps, deferredSearchQuery]);
  const displayedAtlasMaps = filteredAtlasMaps.slice(0, visibleCount);
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

  const handleCreateAtlas = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode criar atlas.");
      return;
    }

    if (!atlasName.trim()) {
      setFeedback("Informe o nome do atlas.");
      return;
    }

    runAsync("create-atlas", async () => {
      const result = await createAtlasMapAction({
        sessionCode,
        name: atlasName.trim(),
        assetId: atlasAssetId || null
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao criar o atlas.");
        return;
      }

      if (result.atlasMap.isActive) {
        setAtlasMaps(
          [...atlasMaps, result.atlasMap].map((atlasMap) =>
            atlasMap.id === result.atlasMap?.id
              ? result.atlasMap
              : { ...atlasMap, isActive: false }
          )
        );
      } else {
        upsertAtlasMap(result.atlasMap);
      }

      setAtlasName("");
      setAtlasAssetId("");
      setFeedback("Atlas criado. Agora edite os pins diretamente no palco.");
    });
  };

  const handleActivateAtlas = (atlasMapId: string) => {
    runAsync(`activate-atlas:${atlasMapId}`, async () => {
      const result = await activateAtlasMapAction({
        sessionCode,
        atlasMapId
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao ativar o atlas.");
        return;
      }

      setAtlasMaps(
        atlasMaps.map((atlasMap) =>
          atlasMap.id === result.atlasMap?.id
            ? result.atlasMap
            : { ...atlasMap, isActive: false }
        )
      );
    });
  };

  const handleDeleteAtlas = (atlasMapId: string) => {
    runAsync(`delete-atlas:${atlasMapId}`, async () => {
      const result = await deleteAtlasMapAction({
        sessionCode,
        atlasMapId
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao remover o atlas.");
        return;
      }

      removeAtlasMap(result.atlasMap.id);
    });
  };

  const handleSendEvent = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode enviar alertas privados.");
      return;
    }

    if (!targetParticipantId) {
      setFeedback("Escolha o jogador alvo.");
      return;
    }

    runAsync("send-event", async () => {
      const result = await sendPrivateEventAction({
        sessionCode,
        targetParticipantId,
        kind: eventKind,
        title: eventTitle.trim(),
        body: eventBody.trim(),
        imageAssetId: eventImageAssetId || null,
        intensity: Number(eventIntensity) || 3,
        durationMs: Number(eventDurationMs) || 5000
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao enviar o alerta privado.");
        return;
      }

      setEventTitle("");
      setEventBody("");
      setEventImageAssetId("");
      setEventIntensity("3");
      setEventDurationMs("5000");
      setFeedback("Alerta privado enviado.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="section-label">Atlas</p>
          <p className="mt-2 text-2xl font-semibold text-white">{atlasMaps.length}</p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">mapas macro</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Atlas ativo</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {activeAtlasMap?.name ?? "nenhum"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">
            {currentAtlasPins.length} pins ativos
          </p>
        </div>
        <div className="stat-card">
          <p className="section-label">Fluxo</p>
          <p className="mt-2 text-lg font-semibold text-white">editar no palco</p>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">
            clique no atlas para criar e arraste para mover
          </p>
        </div>
      </div>

      {canManage && (
        <>
          <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-amber-100" />
              <h3 className="text-sm font-semibold text-white">Novo atlas</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              Crie o mapa macro aqui. Depois, toda a edicao de pins acontece direto no palco do atlas.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <input
                value={atlasName}
                onChange={(event) => setAtlasName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="Atlas de Kamamura"
              />
              <select
                value={atlasAssetId}
                onChange={(event) => setAtlasAssetId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">sem mapa-base</option>
                {mapAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCreateAtlas}
              disabled={isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingKey === "create-atlas" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              criar atlas
            </button>
          </section>

          <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-amber-100" />
              <h3 className="text-sm font-semibold text-white">Alerta privado</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              Segredos, panico, sangue ou kegare enviados para apenas um jogador.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                value={targetParticipantId}
                onChange={(event) => setTargetParticipantId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">escolha o alvo</option>
                {playerParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>

              <select
                value={eventKind}
                onChange={(event) => setEventKind(event.target.value as PrivateEventKind)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="secret">segredo</option>
                <option value="panic">panico</option>
                <option value="kegare">kegare</option>
                <option value="blood">sangue</option>
                <option value="shake">tremor</option>
              </select>

              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="Voce ouviu algo..."
              />

              <select
                value={eventImageAssetId}
                onChange={(event) => setEventImageAssetId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">sem imagem</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>

              <input
                value={eventIntensity}
                onChange={(event) => setEventIntensity(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="3"
                inputMode="numeric"
              />

              <input
                value={eventDurationMs}
                onChange={(event) => setEventDurationMs(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="5000"
                inputMode="numeric"
              />
            </div>

            <textarea
              value={eventBody}
              onChange={(event) => setEventBody(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="Descreva o que so esse jogador percebeu."
            />

            <button
              type="button"
              onClick={handleSendEvent}
              disabled={isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingKey === "send-event" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <BellRing size={16} />
              )}
              enviar alerta
            </button>
          </section>
        </>
      )}

      {feedback && (
        <div className="rounded-[18px] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          {feedback}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-black/18 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label">Biblioteca de atlas</p>
            <p className="mt-1 text-sm text-[color:var(--ink-2)]">
              Encontre rapido o mapa macro certo mesmo quando a campanha crescer.
            </p>
          </div>
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setVisibleCount(8);
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition md:max-w-sm focus:border-amber-300/35"
            placeholder="buscar atlas..."
          />
        </div>

        {atlasMaps.length > 0 && filteredAtlasMaps.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--ink-2)]">
            Nenhum atlas corresponde a essa busca.
          </div>
        )}

        {displayedAtlasMaps.map((atlasMap) => {
          const atlasAsset = assets.find((asset) => asset.id === atlasMap.assetId) ?? null;
          const pins = listAtlasStagePins(atlasMap.id, atlasPins, assets);

          return (
            <article
              key={atlasMap.id}
              className={cn(
                "rounded-[20px] border p-4",
                atlasMap.isActive
                  ? "border-amber-300/28 bg-amber-300/10"
                  : "border-white/10 bg-white/[0.04]"
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <AssetAvatar
                    imageUrl={atlasAsset?.secureUrl}
                    label={atlasMap.name}
                    kind={atlasAsset?.kind}
                    className="h-20 w-28 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-white">{atlasMap.name}</p>
                      {atlasMap.isActive && (
                        <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                          ativo
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                      {atlasAsset ? `mapa-base: ${atlasAsset.label}` : "sem mapa-base"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                      {pins.length} pins neste atlas
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleActivateAtlas(atlasMap.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:opacity-60"
                    >
                      {pendingKey === `activate-atlas:${atlasMap.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                      tornar ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAtlas(atlasMap.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                    >
                      {pendingKey === `delete-atlas:${atlasMap.id}` ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      remover atlas
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {filteredAtlasMaps.length > displayedAtlasMaps.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 8)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            carregar mais atlas
          </button>
        )}
      </section>
    </div>
  );
}

