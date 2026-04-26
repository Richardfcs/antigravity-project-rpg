"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert } from "lucide-react";

import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import { useAudioStore } from "@/stores/audio-store";
import { useCharacterStore } from "@/stores/character-store";
import { useChatStore } from "@/stores/chat-store";
import { useDiagnosticsStore } from "@/stores/diagnostics-store";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import { useMapStore } from "@/stores/map-store";
import { usePresenceStore } from "@/stores/presence-store";
import { useSceneStore } from "@/stores/scene-store";
import { useSessionMemoryStore } from "@/stores/session-memory-store";
import { useSessionNoteStore } from "@/stores/session-note-store";
import { useSessionStore } from "@/stores/session-store";
import type { InfraReadiness } from "@/types/infra";

interface DiagnosticsPanelProps {
  infra: InfraReadiness;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function DiagnosticsPanel({ infra }: DiagnosticsPanelProps) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const members = usePresenceStore((state) => state.members);
  const assets = useAssetStore((state) => state.assets);
  const characters = useCharacterStore((state) => state.characters);
  const scenes = useSceneStore((state) => state.scenes);
  const maps = useMapStore((state) => state.maps);
  const atlasMaps = useAtlasStore((state) => state.atlasMaps);
  const tracks = useAudioStore((state) => state.tracks);
  const messages = useChatStore((state) => state.messages);
  const effects = useEffectLayerStore((state) => state.effects);
  const notes = useSessionNoteStore((state) => state.notes);
  const memoryEvents = useSessionMemoryStore((state) => state.events);
  const diagnostics = useDiagnosticsStore((state) => state.entries);
  const clearDiagnostics = useDiagnosticsStore((state) => state.clearEntries);

  const onlineCount = members.filter((member) => member.status !== "offline").length;
  const snapshotBytes = useMemo(() => {
    if (!snapshot) {
      return 0;
    }

    return new TextEncoder().encode(
      JSON.stringify({
        snapshot,
        counts: {
          assets: assets.length,
          characters: characters.length,
          scenes: scenes.length,
          maps: maps.length,
          atlasMaps: atlasMaps.length,
          tracks: tracks.length,
          messages: messages.length,
          effects: effects.length,
          notes: notes.length,
          memoryEvents: memoryEvents.length
        }
      })
    ).length;
  }, [
    assets.length,
    atlasMaps.length,
    characters.length,
    effects.length,
    maps.length,
    memoryEvents.length,
    messages.length,
    notes.length,
    scenes.length,
    snapshot,
    tracks.length
  ]);

  return (
    <section className="space-y-4 rounded-[22px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">Diagnostico da mesa</p>
          <h3 className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">Saude desta aba</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
            Leituras locais de sincronização, volume de dados e erros recentes para
            facilitar a manutenção da campanha.
          </p>
        </div>
        <button
          type="button"
          onClick={clearDiagnostics}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-secondary)] transition hover:border-[var(--border-panel)]/40 hover:text-[color:var(--text-primary)]"
        >
          <RefreshCcw size={14} />
          limpar alertas
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Sincronização",
            value: snapshot?.syncState ?? "--",
            detail: snapshot?.latencyLabel ?? "--",
            ok: snapshot?.syncState !== "degraded"
          },
          {
            label: "Jogadores online",
            value: String(onlineCount),
            detail: `${members.length} presenças registradas`,
            ok: onlineCount > 0
          },
          {
            label: "Carga local",
            value: `${snapshotBytes} B`,
            detail: "fotografia resumida desta aba",
            ok: snapshotBytes < 180000
          },
          {
            label: "Alertas recentes",
            value: String(diagnostics.length),
            detail: diagnostics.length > 0 ? "exigem revisão" : "sem ruído recente",
            ok: diagnostics.length === 0
          }
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-card)]/30 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="section-label">{card.label}</p>
              {card.ok ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={16} className="text-[color:var(--gold)]" />
              )}
            </div>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">{card.value}</p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-card)]/30 p-4">
          <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
            <ShieldAlert size={16} className="text-[color:var(--gold)]" />
            <h4 className="text-sm font-semibold">Infra e sessão</h4>
          </div>
          <div className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary)]">
            <p>Supabase público: {infra.supabase ? "ok" : "faltando"}</p>
            <p>Service role: {infra.serviceRole ? "ok" : "faltando"}</p>
            <p>Cloudinary: {infra.cloudinary ? "ok" : "faltando"}</p>
            <p>Lobby/Auth: {infra.lobbyReady ? "ok" : "incompleto"}</p>
            <p>Palco atual: {snapshot?.stageMode ?? "--"}</p>
            <p>Apresentação: {snapshot?.presentationMode ?? "--"}</p>
            <p>Combate: {snapshot?.combatEnabled ? "ativo" : "inativo"}</p>
            <p>Latência: {snapshot?.latencyLabel ?? "--"}</p>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-card)]/30 p-4">
          <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
            <Activity size={16} className="text-[color:var(--gold)]" />
            <h4 className="text-sm font-semibold">Volume e erros recentes</h4>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-[color:var(--text-secondary)] md:grid-cols-2">
            <p>Assets: {assets.length}</p>
            <p>Fichas: {characters.length}</p>
            <p>Cenas: {scenes.length}</p>
            <p>Mapas: {maps.length}</p>
            <p>Atlas: {atlasMaps.length}</p>
            <p>Trilhas: {tracks.length}</p>
            <p>Mensagens: {messages.length}</p>
            <p>Efeitos: {effects.length}</p>
            <p>Notas: {notes.length}</p>
            <p>Memória: {memoryEvents.length}</p>
          </div>
          <div className="mt-4 space-y-2">
            {diagnostics.length > 0 ? (
              diagnostics.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[14px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[color:var(--text-primary)]">
                      {entry.level === "error"
                        ? "Erro"
                        : entry.level === "warn"
                          ? "Aviso"
                          : "Info"}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      {entry.source} · {formatTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[color:var(--text-secondary)]">{entry.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-3 text-sm text-[color:var(--text-secondary)]">
                Nenhum erro local foi capturado nesta aba desde que a sessão abriu.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
