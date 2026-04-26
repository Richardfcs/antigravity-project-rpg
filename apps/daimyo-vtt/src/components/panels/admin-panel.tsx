"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Download,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload
} from "lucide-react";

import {
  resetSessionContentAction,
  resetSessionDatasetAction,
  restoreSessionSnapshotAction
} from "@/app/actions/admin-actions";
import { cn } from "@/lib/utils";
import { DiagnosticsPanel } from "@/components/panels/diagnostics-panel";
import {
  buildSessionSnapshotPayload,
  daimyoSessionSnapshot,
  type SessionSnapshotExportPayload
} from "@/lib/content-bridge/snapshot";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import { useAudioStore } from "@/stores/audio-store";
import { useCharacterStore } from "@/stores/character-store";
import { useChatStore } from "@/stores/chat-store";
import { useDiagnosticsStore } from "@/stores/diagnostics-store";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import { useMapStore } from "@/stores/map-store";
import { useSceneStore } from "@/stores/scene-store";
import { useSessionMemoryStore } from "@/stores/session-memory-store";
import { useSessionNoteStore } from "@/stores/session-note-store";
import { useSessionStore } from "@/stores/session-store";
import type { InfraReadiness } from "@/types/infra";
import type { SessionViewerIdentity } from "@/types/session";

interface AdminPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  infra: InfraReadiness;
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
    description: "Apaga apenas os registros locais da sessao. As midias remotas podem ser limpas por reset."
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
  },
  {
    id: "notes",
    label: "notas",
    title: "Notas da mesa",
    description: "Limpa notas contextuais do mestre e cadernos dos jogadores."
  },
  {
    id: "memory",
    label: "memoria",
    title: "Memoria de sessao",
    description: "Apaga o historico recente de trilhas, revelacoes e marcos da mesa."
  }
] as const;

type DatasetId = (typeof datasets)[number]["id"];

export function AdminPanel({ sessionCode, viewer, infra }: AdminPanelProps) {
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
  const notes = useSessionNoteStore((state) => state.notes);
  const memoryEvents = useSessionMemoryStore((state) => state.events);
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
  const setNotes = useSessionNoteStore((state) => state.setNotes);
  const setMemoryEvents = useSessionMemoryStore((state) => state.setEvents);
  const patchSnapshot = useSessionStore((state) => state.patchSnapshot);
  const pushDiagnostic = useDiagnosticsStore((state) => state.pushEntry);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [datasetConfirmations, setDatasetConfirmations] = useState<Record<string, string>>(
    {}
  );
  const [confirmScope, setConfirmScope] = useState(false);
  const [confirmParticipants, setConfirmParticipants] = useState(false);
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [restoreSnapshotRaw, setRestoreSnapshotRaw] = useState("");
  const [restorePreview, setRestorePreview] = useState<SessionSnapshotExportPayload | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const canManage = viewer?.role === "gm";

  const handleExportSnapshot = () => {
    if (!snapshot) {
      setFeedback("A sessao ainda nao carregou por completo para exportar.");
      return;
    }

    const payload = buildSessionSnapshotPayload({
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
      effects,
      notes,
      memoryEvents
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = daimyoSessionSnapshot.createSessionSnapshotFilename(sessionCode);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback("Snapshot da mesa exportado.");
    pushDiagnostic({
      level: "info",
      source: "session",
      message: "Snapshot da mesa exportado localmente."
    });
  };

  const handleSnapshotFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const rawContent = await file.text();
      const normalized = daimyoSessionSnapshot.normalizeSessionSnapshotPayload(
        JSON.parse(rawContent)
      );
      setRestoreSnapshotRaw(rawContent);
      setRestorePreview(normalized);
      setFeedback(`Snapshot ${file.name} pronto para restaurar.`);
    } catch (error) {
      setRestoreSnapshotRaw("");
      setRestorePreview(null);
      setFeedback(
        error instanceof Error
          ? error.message
          : "Nao foi possivel ler este snapshot."
      );
      pushDiagnostic({
        level: "warn",
        source: "session",
        message: "Tentativa de restore com arquivo de snapshot invalido."
      });
    }
  };

  const applyDatasetResult = (dataset: DatasetId | "all") => {
    if (dataset === "maps" || dataset === "all") {
      setMaps([]);
      setMapTokens([]);
      patchSnapshot({ activeMapId: null });
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

    if (dataset === "notes" || dataset === "all") {
      setNotes([]);
    }

    if (dataset === "memory" || dataset === "all") {
      setMemoryEvents([]);
    }

    if (dataset === "all") {
      patchSnapshot({
        activeScene: "Sem palco ativo",
        activeSceneId: null,
        activeMapId: null,
        activeAtlasMapId: null,
        stageMode: "theater",
        presentationMode: "standard",
        combatEnabled: false,
        combatRound: 1,
        combatTurnIndex: 0,
        combatActiveTokenId: null,
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
        pushDiagnostic({
          level: "error",
          source: "session",
          message: result.message ?? "Falha ao limpar um conjunto da mesa."
        });
        return;
      }

      applyDatasetResult(result.dataset);
      setDatasetConfirmations((current) => ({ ...current, [dataset]: "" }));
      setFeedback(result.message ?? `Limpeza de ${expectedLabel} concluida.`);
      pushDiagnostic({
        level: "info",
        source: "session",
        message: result.message ?? `Limpeza de ${expectedLabel} concluida.`
      });
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
        pushDiagnostic({
          level: "error",
          source: "session",
          message: result.message ?? "Falha ao resetar todo o conteudo da mesa."
        });
        return;
      }

      applyDatasetResult("all");
      setConfirmScope(false);
      setConfirmParticipants(false);
      setConfirmIrreversible(false);
      setResetCode("");
      setFeedback(result.message ?? "Conteudo da mesa resetado.");
      pushDiagnostic({
        level: "warn",
        source: "session",
        message: result.message ?? "Conteudo total da mesa resetado."
      });
    });
  };

  const handleRestore = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode restaurar snapshots.");
      return;
    }

    if (!restoreSnapshotRaw || !restorePreview) {
      setFeedback("Escolha um snapshot valido antes de restaurar.");
      return;
    }

    runAsync("restore-snapshot", async () => {
      const result = await restoreSessionSnapshotAction({
        sessionCode,
        rawSnapshot: restoreSnapshotRaw
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Falha ao restaurar o snapshot.");
        pushDiagnostic({
          level: "error",
          source: "session",
          message: result.message ?? "Falha ao restaurar um snapshot."
        });
        return;
      }

      setFeedback(result.message ?? "Snapshot restaurado.");
      pushDiagnostic({
        level: "warn",
        source: "session",
        message:
          result.message ??
          "Snapshot restaurado e a mesa sera recarregada com o estado recuperado."
      });

      window.setTimeout(() => {
        window.location.reload();
      }, 160);
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--gold)]/20 bg-[var(--bg-panel)]/40 text-[color:var(--gold)] shadow-[0_0_20px_rgba(var(--gold-rgb),0.1)]">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[color:var(--text-primary)] uppercase">Santuário de Controle do Domínio</h3>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--gold)]/60">
              Esta área é restrita aos arquitetos da mesa. Aqui, o mestre manipula as fundações da realidade. As operações de snapshot garantem a preservação do legado, enquanto as limpezas purificam o palco tático e narrativo.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-6 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Registro de Continuidade</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">Snapshot do Universo</h3>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[color:var(--text-secondary)]">
              O Snapshot captura toda a essência da mesa — do elenco às memórias — em um manifesto digital. Use para backup preventivo ou para transplantar a campanha para novas instâncias.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportSnapshot}
              disabled={!canManage}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--mist)] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--gold)] transition hover:bg-[color:var(--gold)]/20 shadow-[0_0_20px_rgba(var(--gold-rgb),0.1)] disabled:opacity-20"
            >
              <Download size={14} />
              Exportar Snapshot
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canManage}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)] transition hover:bg-[var(--bg-card)]/80 hover:text-[color:var(--text-primary)] disabled:opacity-20"
            >
              <Upload size={14} />
              Carregar Arquivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) =>
                void handleSnapshotFile(event.target.files?.[0] ?? null)
              }
            />
          </div>
        </header>

        <div className="rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-card)]/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--border-panel)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)] mb-1">Status de Restauração</p>
              <p className="text-sm font-bold text-[color:var(--text-primary)]">
                {restorePreview ? `Pronto para reerguer: ${restorePreview.sessionCode}` : "Aguardando manifesto de snapshot..."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestore}
              disabled={isPending || !restorePreview}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-20"
            >
              {pendingKey === "restore-snapshot" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Iniciar Restauração
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {restorePreview ? (
              <>
                {[
                  { label: "Cenas", value: restorePreview.scenes.length },
                  { label: "Mapas", value: restorePreview.maps.length },
                  { label: "Atlas", value: restorePreview.atlasMaps.length },
                  { label: "Fichas", value: restorePreview.characters.length },
                  { label: "Trilhas", value: restorePreview.tracks.length },
                  { label: "Notas", value: restorePreview.notes.length },
                  { label: "Memórias", value: restorePreview.memoryEvents.length }
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)]/20 p-3 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)] mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-[color:var(--text-primary)]">{item.value}</p>
                  </div>
                ))}
                <div className="col-span-full mt-2 pt-4 border-t border-[var(--border-panel)] text-center">
                  <p className="text-[10px] font-medium text-[color:var(--text-muted)]">Manifesto gerado em: {restorePreview.exportedAt}</p>
                </div>
              </>
            ) : (
              <div className="col-span-full py-8 text-center text-xs font-medium text-[color:var(--text-muted)] italic">
                Nenhum dado de snapshot disponível para visualização.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {datasets.map((dataset) => (
          <article
            key={dataset.id}
            className="group relative overflow-hidden rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-card)]/30 p-5 transition-all hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-base font-bold text-[color:var(--text-primary)] mb-1 group-hover:text-[color:var(--gold)] transition-colors">{dataset.title}</h4>
                <p className="text-xs leading-relaxed text-[color:var(--text-secondary)]">
                  {dataset.description}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--gold)]/20 bg-[color:var(--mist)] text-[color:var(--gold)]/60">
                <AlertTriangle size={16} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={datasetConfirmations[dataset.id] ?? ""}
                onChange={(event) =>
                  setDatasetConfirmations((current) => ({
                    ...current,
                    [dataset.id]: event.target.value
                  }))
                }
                className="w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-xs text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 focus:bg-[var(--bg-card)] placeholder:text-[color:var(--text-muted)]"
                placeholder={`Confirmar digitando "${dataset.label}"`}
              />
              <button
                type="button"
                onClick={() => handleDatasetReset(dataset.id, dataset.label)}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-20"
              >
                {pendingKey === `dataset:${dataset.id}` ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Expurgar
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-rose-500/30 bg-rose-500/5 p-6 backdrop-blur-xl">
        <header className="flex items-start gap-4 mb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rose-500/30 bg-[var(--bg-panel)]/60 text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/50">Operação de Colapso Total</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--text-primary)] uppercase">Aniquilação da Realidade</h3>
            <p className="mt-2 text-sm leading-relaxed text-rose-100/40 italic">
              Esta é a ação final. Todos os registros operacionais — cenas, fichas, mapas e memórias — serão reduzidos a cinzas. A sessão permanece, mas o mundo será reiniciado.
            </p>
          </div>
        </header>

        <div className="grid gap-3 mb-6">
          {[
            [
              confirmScope,
              setConfirmScope,
              "Reconheço que todo o conteúdo jogável será permanentemente apagado."
            ],
            [
              confirmParticipants,
              setConfirmParticipants,
              "Compreendo que a mesa será esvaziada, mantendo apenas os participantes."
            ],
            [
              confirmIrreversible,
              setConfirmIrreversible,
              "Aceito que este colapso é irreversível e final."
            ]
          ].map(([checked, setChecked, label]) => (
            <label
              key={label as string}
              className={cn(
                "flex items-center gap-4 cursor-pointer rounded-2xl border px-5 py-4 transition-all",
                checked 
                  ? "border-rose-500/40 bg-rose-500/10 text-[color:var(--text-primary)]" 
                  : "border-[var(--border-panel)] bg-[var(--bg-panel)]/20 text-[color:var(--text-muted)] hover:border-[var(--border-panel)]/40 hover:bg-[var(--bg-panel)]/40"
              )}
            >
              <div className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                checked ? "border-rose-500 bg-rose-500 text-black" : "border-white/20 bg-transparent"
              )}>
                {checked && <ShieldAlert size={12} className="stroke-[3px]" />}
              </div>
              <input
                type="checkbox"
                checked={checked as boolean}
                onChange={(event) =>
                  (setChecked as (value: boolean) => void)(event.target.checked)
                }
                className="hidden"
              />
              <span className="text-xs font-bold uppercase tracking-wide">{label as string}</span>
            </label>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-rose-500/40">Código de Autenticação do Colapso</label>
            <input
              value={resetCode}
              onChange={(event) => setResetCode(event.target.value)}
              className="w-full rounded-xl border border-rose-500/20 bg-[var(--bg-panel)]/40 px-5 py-4 text-sm font-bold text-rose-500 outline-none transition focus:border-rose-500/50 focus:bg-[var(--bg-panel)]/60 placeholder:text-rose-900"
              placeholder={`Digite o código da sessão: ${sessionCode}`}
            />
          </div>
          <button
            type="button"
            onClick={handleResetAll}
            disabled={isPending || !confirmScope || !confirmParticipants || !confirmIrreversible || resetCode !== sessionCode}
            className="inline-flex h-full items-center justify-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/20 px-10 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-rose-100 transition hover:bg-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.2)] disabled:opacity-10 disabled:grayscale"
          >
            {pendingKey === "reset-all" ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            Executar Colapso Total
          </button>
        </div>
      </section>

      <div className="pt-2 border-t border-[var(--border-panel)]">
        <DiagnosticsPanel infra={infra} />
      </div>

      {feedback && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--mist)] px-6 py-4 text-xs font-medium text-[color:var(--gold)]">
          {feedback}
        </div>
      )}
    </div>
  );
}
