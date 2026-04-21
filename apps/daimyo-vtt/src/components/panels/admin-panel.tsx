"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Download, LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";

import {
  resetSessionContentAction,
  resetSessionDatasetAction
} from "@/app/actions/admin-actions";
import { daimyoContentBridge } from "@/lib/content-bridge/contract";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import { useAudioStore } from "@/stores/audio-store";
import { useCharacterStore } from "@/stores/character-store";
import { useChatStore } from "@/stores/chat-store";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import { useMapStore } from "@/stores/map-store";
import { useSceneStore } from "@/stores/scene-store";
import { useSessionStore } from "@/stores/session-store";
import type { SessionViewerIdentity } from "@/types/session";

interface AdminPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

const datasets = [
  {
    id: "maps",
    label: "mapas",
    title: "Mapas e tokens",
    description: "Remove mapas taticos, tokens posicionados e limpa o foco tatico atual."
  },
  {
    id: "scenes",
    label: "cenas",
    title: "Cenas e elenco",
    description: "Apaga cenas do palco narrativo, destaque e elenco vinculado."
  },
  {
    id: "atlas",
    label: "atlas",
    title: "Atlas e pins",
    description: "Limpa atlas, pins, subnavegacao e personagens relacionados aos pins."
  },
  {
    id: "characters",
    label: "personagens",
    title: "Personagens",
    description: "Remove fichas, iniciativas e vinculos de personagem da sessao."
  },
  {
    id: "assets",
    label: "recursos",
    title: "Retratos e recursos",
    description: "Apaga imagens registradas da sessao e tenta remover a midia remota."
  },
  {
    id: "audio",
    label: "trilhas",
    title: "Trilhas e ecos",
    description: "Limpa playlists, estado do player e arquivos de trilha enviados."
  },
  {
    id: "chat",
    label: "chat",
    title: "Chat e rolagens",
    description: "Apaga mensagens publicas e historico de dados desta mesa."
  },
  {
    id: "effects",
    label: "efeitos",
    title: "Efeitos imersivos",
    description: "Remove filtros persistentes e eventos privados ainda salvos."
  }
] as const;

type DatasetId = (typeof datasets)[number]["id"];

export function AdminPanel({ sessionCode, viewer }: AdminPanelProps) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const assets = useAssetStore((state) => state.assets);
  const atlasMaps = useAtlasStore((state) => state.atlasMaps);
  const atlasPins = useAtlasStore((state) => state.atlasPins);
  const atlasPinCharacters = useAtlasStore((state) => state.atlasPinCharacters);
  const tracks = useAudioStore((state) => state.tracks);
  const playback = useAudioStore((state) => state.playback);
  const characters = useCharacterStore((state) => state.characters);
  const messages = useChatStore((state) => state.messages);
  const effects = useEffectLayerStore((state) => state.effects);
  const maps = useMapStore((state) => state.maps);
  const mapTokens = useMapStore((state) => state.mapTokens);
  const scenes = useSceneStore((state) => state.scenes);
  const sceneCast = useSceneStore((state) => state.sceneCast);
  const setMaps = useMapStore((state) => state.setMaps);
  const setMapTokens = useMapStore((state) => state.setMapTokens);
  const setScenes = useSceneStore((state) => state.setScenes);
  const setSceneCast = useSceneStore((state) => state.setSceneCast);
  const setAtlasMaps = useAtlasStore((state) => state.setAtlasMaps);
  const setAtlasPins = useAtlasStore((state) => state.setAtlasPins);
  const setAtlasPinCharacters = useAtlasStore((state) => state.setAtlasPinCharacters);
  const setCharacters = useCharacterStore((state) => state.setCharacters);
  const setAssets = useAssetStore((state) => state.setAssets);
  const setTracks = useAudioStore((state) => state.setTracks);
  const setPlayback = useAudioStore((state) => state.setPlayback);
  const setMessages = useChatStore((state) => state.setMessages);
  const setEffects = useEffectLayerStore((state) => state.setEffects);
  const patchSnapshot = useSessionStore((state) => state.patchSnapshot);
  const [datasetConfirmations, setDatasetConfirmations] = useState<Record<string, string>>(
    {}
  );
  const [confirmScope, setConfirmScope] = useState(false);
  const [confirmParticipants, setConfirmParticipants] = useState(false);
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = viewer?.role === "gm";

  const handleExportSnapshot = () => {
    if (!snapshot) {
      setFeedback("A sessão ainda nao carregou por completo para exportar.");
      return;
    }

    const payload = {
      manifest: daimyoContentBridge.defaultManifest("vtt"),
      exportedAt: new Date().toISOString(),
      sessionCode,
      snapshot,
      assets,
      characters,
      scenes,
      sceneCast,
      maps,
      mapTokens,
      atlasMaps,
      atlasPins,
      atlasPinCharacters,
      tracks,
      playback,
      messages,
      effects
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `daimyo-snapshot-${sessionCode.toLowerCase()}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback("Snapshot da mesa exportado.");
  };

  const applyDatasetResult = (dataset: DatasetId | "all") => {
    if (dataset === "maps" || dataset === "all") {
      setMaps([]);
      setMapTokens([]);
    }

    if (dataset === "scenes" || dataset === "all") {
      setScenes([]);
      setSceneCast([]);
      patchSnapshot({
        activeScene: "Sem palco ativo",
        activeSceneId: null,
        sceneMood: "aguardando preparacao"
      });
    }

    if (dataset === "atlas" || dataset === "all") {
      setAtlasMaps([]);
      setAtlasPins([]);
      setAtlasPinCharacters([]);
      patchSnapshot({ activeAtlasMapId: null });
    }

    if (dataset === "characters" || dataset === "all") {
      setCharacters([]);
    }

    if (dataset === "assets" || dataset === "all") {
      setAssets([]);
    }

    if (dataset === "audio" || dataset === "all") {
      setTracks([]);
      setPlayback(null);
    }

    if (dataset === "chat" || dataset === "all") {
      setMessages([]);
    }

    if (dataset === "effects" || dataset === "all") {
      setEffects([]);
    }

    if (dataset === "maps" || dataset === "all") {
      patchSnapshot({ activeMapId: null });
    }

    if (dataset === "all") {
      patchSnapshot({
        activeScene: "Sem palco ativo",
        activeSceneId: null,
        activeMapId: null,
        activeAtlasMapId: null,
        stageMode: "theater",
        presentationMode: "standard",
        sceneMood: "aguardando preparacao"
      });
    }
  };

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

  const handleDatasetReset = (dataset: DatasetId, expectedLabel: string) => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode usar a area de administracao.");
      return;
    }

    runAsync(`dataset:${dataset}`, async () => {
      const result = await resetSessionDatasetAction({
        sessionCode,
        dataset,
        confirmationText: datasetConfirmations[dataset] ?? ""
      });

      if (!result.ok || !result.dataset) {
        setFeedback(result.message ?? "Falha ao limpar este conjunto.");
        return;
      }

      applyDatasetResult(result.dataset);
      setDatasetConfirmations((current) => ({ ...current, [dataset]: "" }));
      setFeedback(result.message ?? `Limpeza de ${expectedLabel} concluida.`);
    });
  };

  const handleResetAll = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode resetar a mesa.");
      return;
    }

    runAsync("reset-all", async () => {
      const result = await resetSessionContentAction({
        sessionCode,
        confirmationCode: resetCode,
        confirmScope,
        confirmParticipants,
        confirmIrreversible
      });

      if (!result.ok || !result.dataset) {
        setFeedback(result.message ?? "Falha ao resetar a mesa.");
        return;
      }

      applyDatasetResult("all");
      setConfirmScope(false);
      setConfirmParticipants(false);
      setConfirmIrreversible(false);
      setResetCode("");
      setFeedback(result.message ?? "Conteudo da mesa resetado.");
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-amber-300/20 bg-amber-300/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-black/18 text-amber-100">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Administracao total da mesa</h3>
            <p className="mt-2 text-sm leading-6 text-amber-50/90">
              Esta area e exclusiva do mestre. As limpezas abaixo apagam dados operacionais
              em tempo real, com confirmacoes obrigatorias para evitar perda acidental.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="section-label">Snapshot oficial</p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Exportar o estado jogável da mesa
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              Gera um arquivo JSON com o manifesto da ponte de conteúdo, palco,
              fichas, mapas, atlas, trilhas, conversa e efeitos vivos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportSnapshot}
            disabled={!canManage}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-300/40 disabled:opacity-60"
          >
            <Download size={14} />
            exportar snapshot
          </button>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {datasets.map((dataset) => (
          <article
            key={dataset.id}
            className="rounded-[20px] border border-white/10 bg-black/18 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{dataset.title}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
                  {dataset.description}
                </p>
              </div>
              <AlertTriangle size={16} className="mt-1 shrink-0 text-amber-100" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
              <input
                value={datasetConfirmations[dataset.id] ?? ""}
                onChange={(event) =>
                  setDatasetConfirmations((current) => ({
                    ...current,
                    [dataset.id]: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder={`digite "${dataset.label}"`}
              />
              <button
                type="button"
                onClick={() => handleDatasetReset(dataset.id, dataset.label)}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
              >
                {pendingKey === `dataset:${dataset.id}` ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                limpar {dataset.label}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[22px] border border-rose-300/18 bg-rose-300/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-300/18 bg-black/18 text-rose-100">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="section-label">Reset total do conteudo</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Apagar tudo da mesa</h3>
            <p className="mt-2 text-sm leading-6 text-rose-50/90">
              Preserva a sessao, o codigo, o ownership e os participantes vinculados, mas
              remove mapas, cenas, atlas, personagens, assets, audio, chat e efeitos.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            [
              confirmScope,
              setConfirmScope,
              "Entendo que o conteudo jogavel atual sera apagado."
            ],
            [
              confirmParticipants,
              setConfirmParticipants,
              "Entendo que jogadores e vinculos de conta permanecem, mas o conteudo some."
            ],
            [
              confirmIrreversible,
              setConfirmIrreversible,
              "Entendo que esta acao e destrutiva e nao pode ser revertida aqui."
            ]
          ].map(([checked, setChecked, label]) => (
            <label
              key={label as string}
              className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white"
            >
              <input
                type="checkbox"
                checked={checked as boolean}
                onChange={(event) => (setChecked as (value: boolean) => void)(event.target.checked)}
                className="mt-1"
              />
              <span>{label as string}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <input
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-rose-300/35"
            placeholder={`digite o codigo ${sessionCode}`}
          />
          <button
            type="button"
            onClick={handleResetAll}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/25 bg-rose-300/14 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/40 disabled:opacity-60"
          >
            {pendingKey === "reset-all" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            resetar tudo
          </button>
        </div>
      </section>

      {feedback && (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[color:var(--ink-2)]">
          {feedback}
        </div>
      )}
    </div>
  );
}
