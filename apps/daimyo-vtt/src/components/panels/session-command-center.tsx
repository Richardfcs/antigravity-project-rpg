"use client";

import {
  AudioLines,
  BookmarkCheck,
  Eye,
  Ghost,
  CalendarClock,
  Map,
  MapPinned,
  RadioTower,
  ScrollText,
  Star,
  Theater,
  UsersRound
} from "lucide-react";

import { SessionMemoryFeed } from "@/components/panels/session-memory-feed";
import { cn } from "@/lib/utils";
import type { SessionCommandState } from "@/lib/session/command-state";
import type { SessionLibrarySummary } from "@/types/library";
import type {
  ExplorerSection,
  MasterMode,
  StageMode
} from "@/types/session";
import type { SessionMemoryRecord } from "@/types/session-memory";

interface SessionCommandCenterProps {
  sessionCode: string;
  campaignName: string;
  state: SessionCommandState;
  librarySummary: SessionLibrarySummary;
  masterMode: MasterMode;
  liveSupportOpen: boolean;
  onMasterModeChange: (mode: MasterMode) => void;
  onStageModeChange: (mode: StageMode) => void;
  onOpenSection: (section: ExplorerSection) => void;
  onJumpToArea: (area: "stage" | "status" | "support") => void;
  onToggleLiveSupport: (open: boolean) => void;
  memoryEvents: SessionMemoryRecord[];
}

const stageMeta = {
  theater: {
    label: "Palco narrativo",
    icon: Theater
  },
  tactical: {
    label: "Campo tático",
    icon: Map
  },
  atlas: {
    label: "Wiki da campanha",
    icon: MapPinned
  }
} as const;

function buildStageActions(stageMode: StageMode): Array<{
  label: string;
  section: ExplorerSection;
}> {
  switch (stageMode) {
    case "tactical":
      return [
        { label: "campos", section: "maps" },
        { label: "fichas", section: "actors" },
        { label: "trilhas", section: "audio" },
        { label: "efeitos", section: "effects" }
      ];
    case "atlas":
      return [
        { label: "atlas", section: "atlas" },
        { label: "fichas", section: "actors" },
        { label: "efeitos", section: "effects" },
        { label: "conversa", section: "chat" }
      ];
    case "theater":
    default:
      return [
        { label: "cenas", section: "scenes" },
        { label: "fichas", section: "actors" },
        { label: "trilhas", section: "audio" },
        { label: "efeitos", section: "effects" }
      ];
  }
}

export function SessionCommandCenter({
  sessionCode,
  campaignName,
  state,
  librarySummary,
  masterMode,
  liveSupportOpen,
  onMasterModeChange,
  onStageModeChange,
  onOpenSection,
  onJumpToArea,
  onToggleLiveSupport,
  memoryEvents
}: SessionCommandCenterProps) {
  const stageActions = buildStageActions(state.stageMode);
  const ActiveStageIcon = stageMeta[state.stageMode].icon;

  return (
    <section className="rounded-[26px] border border-white/10 bg-[var(--bg-panel-strong)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
              Conselho da sessão
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              sala {sessionCode}
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              {state.onlinePlayers}/{Math.max(state.totalPresence, state.onlinePlayers)} presentes
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {campaignName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--ink-2)]">
            O palco continua no centro. O modo de preparação organiza recursos e o
            modo de sessão ao vivo reduz atrito para condução rápida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["prep", "live"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onMasterModeChange(mode)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                masterMode === mode
                  ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              )}
            >
              {mode === "prep" ? <ScrollText size={14} /> : <RadioTower size={14} />}
              {mode === "prep" ? "preparação" : "sessão ao vivo"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => onJumpToArea("stage")}
          className="rounded-[22px] border border-white/10 bg-black/18 p-4 text-left transition hover:border-white/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">Foco atual</p>
              <p className="mt-2 text-lg font-semibold text-white">{state.venueName}</p>
              <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                {stageMeta[state.stageMode].label}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/18 bg-amber-300/10 text-amber-100">
              <ActiveStageIcon size={18} />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenSection("audio")}
          className="rounded-[22px] border border-white/10 bg-black/18 p-4 text-left transition hover:border-white/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">Trilhas</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {state.activeTrackTitle ?? "silêncio ritual"}
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                {state.activeTrackPlaylist
                  ? `lista ${state.activeTrackPlaylist}`
                  : "nenhuma trilha ativa"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
              <AudioLines size={18} />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenSection("effects")}
          className="rounded-[22px] border border-white/10 bg-black/18 p-4 text-left transition hover:border-white/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">Atmosfera</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {state.totalEffects} camadas vivas
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                {state.globalEffectCount} globais, {state.targetedEffectCount} individuais
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/18 bg-rose-300/10 text-rose-100">
              <Ghost size={18} />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onJumpToArea("status")}
          className="rounded-[22px] border border-white/10 bg-black/18 p-4 text-left transition hover:border-white/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">Mesa</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {state.onlinePlayers} conectados
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-2)]">
                {state.totalCharacters} fichas e {state.totalAssets} recursos
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-300/10 text-sky-100">
              <UsersRound size={18} />
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/18 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="section-label">Pronto para hoje</p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Resumo rapido do preparo da campanha
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              Marque favoritos, itens preparados e o que ja foi usado nesta sessao para
              encontrar tudo mais rapido nas bibliotecas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
              <BookmarkCheck size={12} />
              {librarySummary.preparedCount} prontos
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              <Star size={12} />
              {librarySummary.favoriteCount} favoritos
            </span>
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              <CalendarClock size={12} />
              {librarySummary.usedTodayCount} usados hoje
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
            <p className="section-label">Fila preparada</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {librarySummary.readyEntries.length > 0 ? (
                librarySummary.readyEntries.map((entry) => (
                  <span
                    key={`ready:${entry.collection}:${entry.id}`}
                    className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-50"
                  >
                    {entry.label}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[color:var(--ink-3)]">
                  Ainda nao ha itens marcados como prontos.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
            <p className="section-label">Favoritos recorrentes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {librarySummary.favoriteEntries.length > 0 ? (
                librarySummary.favoriteEntries.map((entry) => (
                  <span
                    key={`favorite:${entry.collection}:${entry.id}`}
                    className="hud-chip border-white/10 bg-white/[0.04] text-white"
                  >
                    {entry.label}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[color:var(--ink-3)]">
                  Nenhum item favoritado ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["theater", "tactical", "atlas"] as const).map((mode) => {
            const Icon = stageMeta[mode].icon;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onStageModeChange(mode)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                  state.stageMode === mode
                    ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                )}
              >
                <Icon size={14} />
                {stageMeta[mode].label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {stageActions.map((action) => (
            <button
              key={`${state.stageMode}:${action.section}`}
              type="button"
              onClick={() => onOpenSection(action.section)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
            >
              {action.label}
            </button>
          ))}
          {masterMode === "live" && (
            <button
              type="button"
              onClick={() => {
                onToggleLiveSupport(!liveSupportOpen);
                if (!liveSupportOpen) {
                  onJumpToArea("support");
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                liveSupportOpen
                  ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
              )}
            >
              <Eye size={14} />
              {liveSupportOpen ? "recolher apoio" : "abrir apoio"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/18 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="section-label">Memoria de sessao</p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Rastro recente do que mudou na mesa
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              Trocas de palco, revelacoes do atlas, trilhas e sinais privados aparecem aqui para ajudar a conduzir sem perder o fio da sessao.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSection("notes")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            <ScrollText size={14} />
            notas
          </button>
        </div>

        <div className="mt-4">
          <SessionMemoryFeed
            events={memoryEvents}
            emptyLabel="A mesa ainda nao deixou rastros recentes nesta sessao."
            limit={4}
          />
        </div>
      </div>
    </section>
  );
}
